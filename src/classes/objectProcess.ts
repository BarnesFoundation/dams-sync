import { ObjectID, CollectionPayloadTextEntry, CollectionPayload, ObjectRecord } from '../interfaces/queryResponses';
import { SQLConnection } from './sql';
import { NetXTables } from '../constants/netXDatabase';
import { PoolClient } from 'pg';
import QueryHelpers from '../constants/queryHelpers';
import ObjectHelpers, { ARCHIVE_TYPE, MEDIA_TYPE } from '../constants/objectHelpers';
import { OBJECT_RECORD } from '../constants/names';

const NEWLINE_RETURN_TAB_REGEX = /[\n\r\t]/g;

const {
	mainObjectInformation: tableMainObjectInformation,
	mediaInformation: tableMediaInformation,
	constituentRecords: tableConstituentRecords,
	objectConstituentMappings: tableObjectConstituentMappings,
} = NetXTables;

export class ObjectProcess {

	private objectId: number;
	private tmsCon: SQLConnection;
	private netxCon: SQLConnection;
	private netxClient: PoolClient;
	private processNumber: number;
	private batchNumber: number;

	constructor(objectId: ObjectID, tmsCon: SQLConnection, netxCon: SQLConnection, processNumber: number, batchNumber: number) {
		this.objectId = objectId.ID;
		this.tmsCon = tmsCon;
		this.netxCon = netxCon;
		this.processNumber = processNumber;
		this.batchNumber = batchNumber;
	}

	/** Handles performing the main process to parsing and adding an object to the NetX database */
	public async perform() {
		return new Promise(async (resolve) => {

			// Since we're going to perform SQL transactions on NetX - checkout a client
			this.netxClient = await this.netxCon.checkoutClient();

			// Query to get the Online Collection Payload for this object id
			const collectionPayloadQuery = `
			SELECT TextEntry 
			FROM TextEntries 
			WHERE ID = ${this.objectId} 
			AND TextTypeId = 67
			AND TextEntry IS NOT NULL`;

			// Execute the query to get the text entry
			const queryResult = await this.tmsCon.executeQuery(collectionPayloadQuery);
			const recordSet = queryResult.recordset as CollectionPayloadTextEntry[];
			const textEntryValue = recordSet[0]?.TextEntry;

			if (Boolean(textEntryValue) === false) {
				console.warn(`No "TextEntry" data available for Object ID "${this.objectId}"`, textEntryValue);
				return resolve('');
			}

			const cpTextEntry = textEntryValue.replace(NEWLINE_RETURN_TAB_REGEX, '');

			try {
				const parsedCollectionPayload = JSON.parse(cpTextEntry) as CollectionPayload;
				for (let i = 0; i < parsedCollectionPayload[OBJECT_RECORD].length; i++) {

					// Add the parsed record to the NetX intermediate database
					const objectRecord = parsedCollectionPayload[OBJECT_RECORD][i];
					await this.addObjectRecordToNetX(objectRecord);
				}
			}

			catch (error) {
				if (error instanceof SyntaxError) {
					console.error(`Encountered an error parsing JSON. Object ID was "${this.objectId}"`);
				} else {
					console.error(`Encountered error during addition of object record to NetX Intermediat Database. Object ID was "${this.objectId}"`, error);
				}
			} 

			// Now that we've finished everything - release the client
			this.netxClient.release();
			resolve('');

			// Inform that the batch this process belongs to has completed
			if (this.processNumber > 0 && this.processNumber % 99 === 0) {
				console.log(`Completed Batch Number ${this.batchNumber}`);
			}
		});
	}

	/** Performs the necessary functions in order to prepate and add an object to NetX database */
	private async addObjectRecordToNetX(or: ObjectRecord) {

		const {
			mainInformationObject,
			mediaInformationObject,
			constituentRecordsList
		} = ObjectHelpers.createObjectsForTables(or);

		// Add the main object record
		const {
			query: moQuery,
			values: moValues
		} = QueryHelpers.insertQueryGenerator(tableMainObjectInformation, mainInformationObject);
		await this.netxClient.query(moQuery, moValues);

		// Add each constituent record in the list. The constituent record list will not exist
		// for records that are archives records, hence our check for truthyness here
		if (constituentRecordsList) {
			for (let i = 0; i < constituentRecordsList.length; i++) {
				const cr = constituentRecordsList[i];

				// Add the constituent record row
				const { query: crQuery, values: crValues } = QueryHelpers.insertQueryGenerator(tableConstituentRecords, cr);
				await this.netxClient.query(crQuery, crValues);

				// Add the mapping between the main object and its constituents
				const {
					query: mapQuery,
					values: mapValues
				} = QueryHelpers.insertQueryGenerator(tableObjectConstituentMappings, {
					constituentRecordId: cr.constituentID,
					objectId: or.objectId,
				});

				try { await this.netxClient.query(mapQuery, mapValues); }
				catch (error) {
					console.log(`An error occurred doing mapping`, error);
					console.log(mapQuery);
					console.log(mapValues);
				}
			}
		}

		// Add media information record only if the `renditionNumber` exists for the object
		// as both object types `archive` and `media` will now have rendition numbers
		// but only `media` records will have a full-set of media information
		if (mediaInformationObject.renditionNumber) {
			const {
				query: miQuery,
				values: miValues,
			} = QueryHelpers.insertQueryGenerator(tableMediaInformation, mediaInformationObject);
			await this.netxClient.query(miQuery, miValues);
		}
	}
}

