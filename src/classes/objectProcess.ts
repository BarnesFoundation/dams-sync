import { ObjectID, CollectionPayloadTextEntry, CollectionPayload, ObjectRecord } from '../interfaces/queryResponses';
import { SQLConnection } from './sql';
import { NetXTables } from '../constants/netXDatabase';
import { PoolClient } from 'pg';
import ObjectHelpers from '../constants/objectHelpers';

const OBJECT_RECORD = 'objectRecord';
const CONSTITUENT_RECORD = 'ConstituentRecord';

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
			AND TextTypeId = 67`;

			// Execute the query
			const recordset = (await this.tmsCon.executeQuery(collectionPayloadQuery)).recordset as CollectionPayloadTextEntry[];

			// Get the text entry - which is a JSON string and parse it	
			const cpTextEntry = recordset[0].TextEntry.replace(/[\n\r\t]/g, '');

			let cp;
			try { cp = JSON.parse(cpTextEntry) as CollectionPayload; }

			catch (error) {
				console.log(`Encountered an error parsing JSON. Offending object was ${this.objectId}`);
				process.exit(0);
			}

			// Iterate through each object record provided in the text entry
			for (let i = 0; i < cp[OBJECT_RECORD].length; i++) {

				// Add it to the NetX intermediate database
				const or = cp[OBJECT_RECORD][i];
				await this.addObjectRecordToNetX(or);
			}

			// Now that we've finished everything - release the client
			this.netxClient.release();
			resolve();

			// Inform that the batch this process belongs to has completed
			if (this.processNumber > 0 && this.processNumber % 99 == 0) console.log(`Completed Batch Number ${this.batchNumber}`);
		});
	}

	/** Performs the necessary functions in order to prepate and add an object to NetX database */
	private async addObjectRecordToNetX(or: ObjectRecord) {

		const { mainObjectInformation, mediaInformation, constituentRecords, objectConstituentMappings } = NetXTables;
		const { mainInformationObject, mediaInformationObject, constituentRecordsList } = this.createObjectsForTables(or);

		// Add the main object record
		const { query: moQuery, values: moValues } = ObjectHelpers.insertQueryGenerator(mainObjectInformation.tableName, mainInformationObject);
		await this.netxClient.query(moQuery, moValues);

		// Add each constituent record
		for (let i = 0; i < constituentRecordsList.length; i++) {
			const cr = constituentRecordsList[i];

			// Add the constituent record row
			const { query: crQuery, values: crValues } = ObjectHelpers.insertQueryGenerator(constituentRecords.tableName, cr);
			await this.netxClient.query(crQuery, crValues);

			// Add the mapping between the main object and its constituents
			const mapping = { constituentRecordId: cr.constituentID, objectId: or.objectId };
			const { query: mapQuery, values: mapValues } = ObjectHelpers.insertQueryGenerator(objectConstituentMappings.tableName, mapping);
			await this.netxClient.query(mapQuery, mapValues);
		}

		// Add media information record
		const { query: miQuery, values: miValues } = ObjectHelpers.insertQueryGenerator(mediaInformation.tableName, mediaInformationObject);
		await this.netxClient.query(miQuery, miValues);
	}

	/** Takes an object record and parses it into the objects needed by the 
	 * - main_object_information
	 * - constituent_records
	 * - media_information
	 *  tables and returns them  */
	private createObjectsForTables(or: ObjectRecord) {

		const mainInformationObject = {};
		const mediaInformationObject = {};
		let constituentRecordsList: ObjectRecord['ConstituentRecord'];

		// Get the field names and values -- i.e. the eventual column names, and values for this object
		for (let [fieldName, fieldValue] of Object.entries(or)) {

			// Check if the current field is needed in the main object/media information objects
			const fieldNeededInMainObject = NetXTables.mainObjectInformation.columns.some((column) => column.name === fieldName);
			const fieldNeededInMediaInformationObject = NetXTables.mediaInformation.columns.some((column) => column.name === fieldName);

			if (fieldNeededInMainObject) {
				mainInformationObject[fieldName] = fieldValue;
			}

			if (fieldNeededInMediaInformationObject) {
				mediaInformationObject[fieldName] = fieldValue;
			}

			// If this is the constituent records field, we know we need it right off the bat
			if (fieldName === CONSTITUENT_RECORD) {
				constituentRecordsList = or.ConstituentRecord.map((cr) => {
					const constituentRecordObject = {};

					// Check if the current field name is needed in the constituent record object
					for (let [key, value] of Object.entries(cr)) {
						const fieldNameNeededInCR = NetXTables.constituentRecords.columns.some((column) => column.name === key);

						if (fieldNameNeededInCR) {
							constituentRecordObject[key] = value;
						}
					}

					return constituentRecordObject;
				});
			}
		}

		// Now that we've created each needed object -- the objects require some calculated fields
		mainInformationObject['caption'] = ObjectHelpers.generateCaptionForMainObject(mainInformationObject, constituentRecordsList);

		// Add the calculated fields for constituent records
		constituentRecordsList = ObjectHelpers.generateConstituentCalculatedFields(constituentRecordsList);

		return { mainInformationObject, constituentRecordsList, mediaInformationObject };
	}
}

