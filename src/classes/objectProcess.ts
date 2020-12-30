import { ObjectID, CollectionPayloadTextEntry, CollectionPayload, ObjectRecord, NormalObject } from '../interfaces/queryResponses';
import { SQLConnection } from './sql';
import { NetXTables } from '../constants/netXDatabase';
import { PoolClient } from 'pg';
import QueryHelpers from '../constants/queryHelpers';
import ObjectHelpers from '../constants/objectHelpers';
import { OBJECT_RECORD } from '../constants/names';

export class ObjectProcess {

	/** Id of the object being prepared */
	private objectId: number;

	/** SQL connection to TMS */
	private tmsCon: SQLConnection;

	/** SQL connection to NetX intermediate database */
	private netxCon: SQLConnection;

	/** Client using the NetX connection */
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
		return new Promise<void>(async (resolve) => {

			// Since we're going to perform SQL transactions on NetX - checkout a client
			this.netxClient = await this.netxCon.checkoutClient();

			// Query to get the Online Collection Payload for this object id
			const collectionPayloadQuery = `
			SELECT TextEntry 
			FROM TextEntries 
			WHERE ID = ${this.objectId} 
			AND TextTypeId = 67
			`;

			// Execute the query and get the text entry - which is a JSON string and parse it	
			const recordset = (await this.tmsCon.executeQuery(collectionPayloadQuery)).recordset as CollectionPayloadTextEntry[];
			const cpTextEntry = recordset[0].TextEntry.replace(/[\n\r\t]/g, '');

			try {
				const collectionPayload = JSON.parse(cpTextEntry) as CollectionPayload;
				await this.addObjectRecordToNetX(collectionPayload);
			}

			catch (error) {
				console.log(`Encountered an error parsing JSON. Offending object was ${this.objectId}`);
			}

			// Now that we've finished everything - release the client
			this.netxClient.release();
			resolve();

			// Inform that the batch this process belongs to has completed
			if (this.processNumber > 0 && this.processNumber % 99 == 0) console.log(`Completed Batch Number ${this.batchNumber}`);
		});
	}

	/** Performs the necessary functions in order to prepate and add an object to NetX database */
	private async addObjectRecordToNetX(collectionPayload: CollectionPayload) {

		// Iterate through each object record in the payload
		for (let i = 0; i < collectionPayload[OBJECT_RECORD].length; i++) {

			// Add it to the NetX intermediate database
			const objectRecord = collectionPayload[OBJECT_RECORD][i];
			const { mainInformationObject, mediaInformationObject, constituentRecordsList } = ObjectHelpers.createObjectsForTables(objectRecord);

			// Add the records
			await this.addMainObject(mainInformationObject);
			await this.addConstituentObjects(constituentRecordsList, objectRecord);
			await this.addMediaObject(mediaInformationObject);
		}
	};

	/** Adds the record for the "main_object_information" table */
	private async addMainObject(mainObject: NormalObject) {

		// Add the main object record
		const mainRecord = QueryHelpers.insertQueryGenerator(NetXTables.mainObjectInformation, mainObject);
		await this.netxClient.query(mainRecord.query, mainRecord.values);
	};

	/** Adds the records for the "constituent_records" and "object_constituent_mappings" tables */
	private async addConstituentObjects(constituentRecordsList: NormalObject[], objectRecord: ObjectRecord) {

		// Add each constituent record
		for (let i = 0; i < constituentRecordsList.length; i++) {
			const cr = constituentRecordsList[i];

			// Add the constituent record row
			const constRecord = QueryHelpers.insertQueryGenerator(NetXTables.constituentRecords, cr);
			await this.netxClient.query(constRecord.query, constRecord.values);

			// Add the mapping between the main object and its constituents
			const mapping = { constituentRecordId: cr.constituentID, objectId: objectRecord.objectId };
			const mappingRecord = QueryHelpers.insertQueryGenerator(NetXTables.objectConstituentMappings, mapping);

			try { await this.netxClient.query(mappingRecord.query, mappingRecord.values); }
			catch (error) {
				console.log(`An error occurred doing mapping`, error);
				console.log(mappingRecord.query);
				console.log(mappingRecord.values);
			}
		}
	};

	/** Adds the record for the "media_information" table */
	private async addMediaObject(mediaInformationObject: NormalObject) {

		// Add media information record
		const mediaRecord = QueryHelpers.insertQueryGenerator(NetXTables.mediaInformation, mediaInformationObject);
		await this.netxClient.query(mediaRecord.query, mediaRecord.values);
	};
}

