import { ObjectID, CollectionPayloadTextEntry, CollectionPayload, ObjectRecord, NormalObject } from '../interfaces/queryResponses';
import { SQLConnection } from './sql';
import { NetXTables } from '../constants/netXDatabase';
import { PoolClient } from 'pg';
import QueryHelpers, { QueryPayload } from '../constants/queryHelpers';
import ObjectHelpers from '../constants/objectHelpers';
import { OBJECT_RECORD } from '../constants/names';
import DiffService from '../services/diffService';
import { TableInformation } from '../interfaces/netXDatabaseInterfaces';

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
			const result = await this.tmsCon.executeQuery(collectionPayloadQuery)
			const recordset = result.recordset as CollectionPayloadTextEntry[];
			const cpTextEntry = recordset[0].TextEntry.replace(/[\n\r\t]/g, '');

			try {
				const collectionPayload = JSON.parse(cpTextEntry) as CollectionPayload;
				await this.addObjectRecordToNetX(collectionPayload);
			}

			catch (error) {
				console.log(`Encountered an error parsing JSON. Offending object was ${this.objectId}`, error);
			}

			// Now that we've finished everything - release the client
			this.netxClient.release();
			resolve();

			// Inform that the batch this process belongs to has completed
			if (this.processNumber > 0 && this.processNumber % 99 == 0) {
				console.log(`Completed Batch Number ${this.batchNumber}`);
			}
		});
	}

	/** Performs the necessary functions in order to prepate and add an object to NetX database */
	private async addObjectRecordToNetX(collectionPayload: CollectionPayload) {

		// Initialize the diff list
		DiffService.initializeDiffList();

		// Iterate through each object record in the payload
		for (let i = 0; i < collectionPayload[OBJECT_RECORD].length; i++) {

			// Add it to the NetX intermediate database
			const objectRecord = collectionPayload[OBJECT_RECORD][i];
			const { mainInformationObject, mediaInformationObject, constituentRecordsList } = ObjectHelpers.createObjectsForTables(objectRecord);

			// Add the main object record
			const mainRecord = QueryHelpers.insertQueryGenerator(NetXTables.mainObjectInformation, mainInformationObject);
			await this.addRecordWithDiff(mainRecord, mainInformationObject, NetXTables.mainObjectInformation);

			// Add the constituent records
			for (let i = 0; i < constituentRecordsList.length; i++) {
				const cr = constituentRecordsList[i];

				// Add the constituent record row
				const constRecord = QueryHelpers.insertQueryGenerator(NetXTables.constituentRecords, cr);
				await this.addRecordWithDiff(constRecord, cr, NetXTables.constituentRecords);

				// Add the mapping between the main object and its constituents
				const mapping = { constituentRecordId: cr.constituentID, objectId: parseInt(objectRecord.objectId) };
				const mappingRecord = QueryHelpers.insertQueryGenerator(NetXTables.objectConstituentMappings, mapping);

				try {
					await this.addRecordWithDiff(mappingRecord, mapping, NetXTables.objectConstituentMappings);
				}

				catch (error) {
					console.log(`An error adding doing mapping`, error);
					console.log(mappingRecord.query);
					console.log(mappingRecord.values);
				}
			}

			// Add the media object
			const mediaRecord = QueryHelpers.insertQueryGenerator(NetXTables.mediaInformation, mediaInformationObject);
			await this.addRecordWithDiff(mediaRecord, mediaInformationObject, NetXTables.mainObjectInformation);
		}
	};

	/** Compares the record to be written to the database with the existing record in the database and 
	 * captures the difference between the two records
	 */
	private async addRecordWithDiff(possibleNewRecord: QueryPayload, normalObject: NormalObject, table: TableInformation) {

		// Execute the select query to know what is in the database for this record
		const { rows } = await this.netxClient.query<NormalObject[]>(possibleNewRecord.selectQuery);
		const existingRecord = (rows.length > 0)
			? rows.pop()
			: {}
			;

		// Let's compare the two
		const diffInformation = DiffService.areEqual(existingRecord, normalObject);

		// Only if the records weren't equal will we update the database record and store the diff
		if (diffInformation.areEqual === false) {

			// Get the unique identifier for this record and table it belongs to
			const pKey = table.columns.filter((column) =>
				column.hasOwnProperty('primary') && column.primary
			).pop().name;
			const pValue = normalObject[pKey];

			// Have the new record overwrite the existing one in the database
			DiffService.addToDiffList(diffInformation.diff, table.tableName, pValue);
			await this.netxClient.query(possibleNewRecord.query, possibleNewRecord.values);
		}
	};
}

