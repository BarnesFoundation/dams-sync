import { ObjectID, CollectionPayloadTextEntry, CollectionPayload, ObjectRecord } from '../interfaces/queryResponses';
import { SQLConnection } from './sql';
import { NetXTables } from '../constants/netXDatabase';
import { PoolClient } from 'pg';
import QueryHelpers from '../constants/queryHelpers';
import ObjectHelpers from '../constants/objectHelpers';
import { OBJECT_RECORD } from '../constants/names';
import { Logger } from './../logger';

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

			// Check if this copy differs from the last processed version of data we have
			const storedTextEntryQuery = `
			SELECT "textEntry"
			FROM "text_entry_store"
			WHERE "objectId" = ${this.objectId}
			`;

			// Execute the query to get the text entry from TMS 
			const queryResult = await this.tmsCon.executeQuery(collectionPayloadQuery);
			const recordSet = queryResult.recordset as CollectionPayloadTextEntry[];
			const textEntryValue = recordSet[0]?.TextEntry;

			if (Boolean(textEntryValue) === false) {
				Logger.warn(`No "TextEntry" data available for Object ID "${this.objectId}"`, textEntryValue);
				this.netxClient.release();
				return resolve('');
			}
			const cpTextEntry = textEntryValue.replace(NEWLINE_RETURN_TAB_REGEX, '');

			// Execute the query to get the stored text entry we have in the NetX intermediate database
			const storedTextEntryQueryResult = await this.netxClient.query(storedTextEntryQuery);
			const storedTextEntryRecordSet = storedTextEntryQueryResult?.rows;
			const storedTextEntry = storedTextEntryRecordSet?.length ? storedTextEntryRecordSet[0].textEntry : ''

			// If our stored version of the text entry matches the current one from TMS
			// then there's been no new data for the record. We can move forward without
			// doing any subsequent processing because the data is the same
			if (storedTextEntry === cpTextEntry) {
				this.netxClient.release();
				return resolve('')
			}

			// At this point, the version of the TextEntry we have stored differs from
			// what currently exists in TMS. Let's persist this new value into the TextEntryStore
			Logger.info(`Stored version of TextEntry for Object ID ${this.objectId} is being updated`)
			const { query: textEntryInsertQuery, values: textEntryInsertValues } = QueryHelpers.insertQueryGenerator(NetXTables.textEntryStore, {
				objectId: this.objectId, textEntry: cpTextEntry, lastUpdatedAt: new Date()
			})
			await this.netxClient.query(textEntryInsertQuery, textEntryInsertValues);

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
					Logger.error(`Encountered an error parsing JSON. Object ID was "${this.objectId}"`);
				} else {
					Logger.error(`Encountered error during addition of object record to NetX Intermediat Database. Object ID was "${this.objectId}"`, error);
				}
			}

			// Now that we've finished everything - release the client
			this.netxClient.release();
			resolve('');

			// Inform that the batch this process belongs to has completed
			Logger.debug(`Completed Batch Number ${this.batchNumber} Process Number ${this.processNumber}`);
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
					Logger.log(`An error occurred performing mapping`, error);
					Logger.debug(mapQuery);
					Logger.debug(mapValues);
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

