import utf8 from 'utf8';

import { ObjectID, CollectionPayloadTextEntry, CollectionPayload, ObjectRecord } from '../interfaces/queryResponses';
import { SQLConnection } from './sql';
import { NetXTables } from '../constants/netXDatabase';

const OBJECT_RECORD = 'objectRecord';
const CONSTITUENT_RECORD = 'ConstituentRecord';

const insertQueryGenerator = (tableName: string, object: { [key: string]: any }) => {

	const columnNamesToInsert = [];
	const values = [];

	for (let [fieldName, fieldValue] of Object.entries(object)) {
		columnNamesToInsert.push(`"${fieldName}"`);
		values.push(fieldValue);
	}

	// Once we've gone through all the field names - we can build our insert query
	const columnString = columnNamesToInsert.join();
	const valuesPlaceholder = values.map((_, index) => `$${index + 1}`).join();

	// Build our query for this row
	const query = `
	INSERT INTO ${tableName} (${columnString})
	VALUES (${valuesPlaceholder})
	ON CONFLICT DO NOTHING
	`;

	return { query, values };
};


export class ObjectProcess {

	private objectId: number;
	private tmsCon: SQLConnection;
	private netxCon: SQLConnection;
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
				console.log(`Encountered an error parsing JSON`);
				console.log(`Offending object was ${this.objectId}`);
				process.exit(0);
			}

			// Iterate through each object record
			for (let i = 0; i < cp[OBJECT_RECORD].length; i++) {

				// Add it to the NetX intermediate database
				const or = cp[OBJECT_RECORD][i];
				await this.addObjectRecordToNetX(or);
			}

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
		const { query: moQuery, values: moValues } = insertQueryGenerator(mainObjectInformation.tableName, mainInformationObject);
		await this.netxCon.executeQuery(moQuery, moValues);

		// Add each constituent record
		for (let i = 0; i < constituentRecordsList.length; i++) {
			const cr = constituentRecordsList[i];

			// Add the constituent record row
			const { query: crQuery, values: crValues } = insertQueryGenerator(constituentRecords.tableName, cr);
			await this.netxCon.executeQuery(crQuery, crValues);

			// Add the mapping between the main object and its constituents
			const mapping = { constituentRecordId: cr.constituentID, objectId: or.objectId };
			const { query: mapQuery, values: mapValues } = insertQueryGenerator(objectConstituentMappings.tableName, mapping);
			await this.netxCon.executeQuery(mapQuery, mapValues);
		}

		// Add media information record
		const { query: miQuery, values: miValues } = insertQueryGenerator(mediaInformation.tableName, mediaInformationObject);
		await this.netxCon.executeQuery(miQuery, miValues);
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
		mainInformationObject['caption'] = this.generateCaptionForMainObject(mainInformationObject, constituentRecordsList);

		// Add the calculated fields for constituent records
		constituentRecordsList = this.generateConstituentCalculatedFields(constituentRecordsList);

		return { mainInformationObject, constituentRecordsList, mediaInformationObject };
	}

	private generateCaptionForMainObject(mainInformationObject: { [key: string]: string }, constituentRecords: ObjectRecord['ConstituentRecord']): string {

		// Get the needed fields from the main object
		const { title, dated, medium, objectNumber, creditLine } = mainInformationObject;

		// Get the needed fields from the constituent records
		const crInformation = constituentRecords.map((cr) => {
			const { firstName, lastName } = cr;
			return { firstName, lastName };
		});

		let captionString = '';

		// Cascade all the way down adding fields in order
		crInformation.forEach((cr) => captionString += `${cr.firstName} ${cr.lastName}. `);

		if (title) captionString += `${title}, `;
		if (dated) captionString += `${dated}, `;
		if (medium) captionString += `${medium}.`

		captionString += 'The Barnes Foundation, ';

		if (objectNumber) captionString += `${objectNumber}. `;
		if (creditLine) captionString += `${creditLine}`;

		return captionString;
	}

	private generateConstituentCalculatedFields(constituentRecords: ObjectRecord['ConstituentRecord']) {

		constituentRecords.forEach((cr) => {

			const { firstName, lastName, prefix, suffix, nationality, beginDate, endDate, role } = cr;

			let constituentName = '';
			let fullConstituent = '';


			if (prefix) fullConstituent += `${prefix} `;

			if (firstName) {
				constituentName += `${firstName} `;
				fullConstituent += `${firstName} `;
			}

			if (lastName) {
				constituentName += `${lastName} `;
				fullConstituent += `${lastName} `;
			}

			if (suffix) fullConstituent += `${suffix} `;
			if (nationality) fullConstituent += `${nationality} `;
			if (beginDate) fullConstituent += `${beginDate} `;
			if (endDate) fullConstituent += `${endDate}`;

			let fullConstituentAndRole = `${fullConstituent} ${role}`;

			cr['constituentName'] = constituentName;
			cr['fullConstituent'] = fullConstituent;
			cr['fullConstituentAndRole'] = fullConstituentAndRole
		});

		return constituentRecords;
	}
}

