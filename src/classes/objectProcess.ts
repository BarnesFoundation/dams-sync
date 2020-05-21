import { ObjectID, CollectionPayloadTextEntry, CollectionPayload, ObjectRecord } from '../interfaces/queryResponses';
import { SQLConnection } from './sql';
import { NetXTables } from '../constants/netXDatabase';

const OBJECT_RECORD = 'objectRecord';
const CONSTITUENT_RECORD = 'ConstituentRecord';

const getTableNameForFieldName = (fieldName: string): string => {

	if (fieldName === OBJECT_RECORD) return NetXTables.mainObjectInformation.tableName;
	if (fieldName === CONSTITUENT_RECORD) return NetXTables.constituentRecords.tableName;
};

const getDatabaseTypeForField = (fieldType: string) => {

	if (fieldType === 'boolean') return 'BOOLEAN';
	if (fieldType === 'string') return 'VARCHAR';
	if (fieldType === 'number') return 'INTEGER;'
};


export class ObjectProcess {

	private objectId: number;
	private tmsCon: SQLConnection;
	private netxCon: SQLConnection;

	constructor(objectId: ObjectID, tmsCon: SQLConnection, netxCon: SQLConnection) {
		this.objectId = objectId.ID;
		this.tmsCon = tmsCon;
		this.netxCon = netxCon;
	}

	public async perform() {

		// Query to get the Online Collection Payload for this object id
		const collectionPayloadQuery = `
			SELECT TextEntry 
			FROM TextEntries 
			WHERE ID = ${this.objectId} 
			AND TextTypeId = 67`;

		// Execute the query
		const recordset = (await this.tmsCon.executeQuery(collectionPayloadQuery)).recordset as CollectionPayloadTextEntry[];

		// Get the text entry - which is a JSON string and parse it	
		const cpTextEntry = recordset[0].TextEntry;
		const cp = JSON.parse(cpTextEntry) as CollectionPayload;

		// Iterate through each object record
		for (let i = 0; i < cp[OBJECT_RECORD].length; i++) {

			// Add it to the NetX intermediate database
			const or = cp[OBJECT_RECORD][i];
			await this.addObjectRecordToNetX(or);
		}
	}

	private async addObjectRecordToNetX(or: ObjectRecord) {

		const tableName = getTableNameForFieldName(OBJECT_RECORD);
		const columnNamesToInsert = [];
		const valuesToInsert = [];

		// Get the keys -- i.e. column names, and values for this object
		for (let [fieldName, fieldValue] of Object.entries(or)) {

			// The Constituent Record field is the only non-primitive field we have so it gets handle differently
			if (fieldName === CONSTITUENT_RECORD) {

			}

			// Other fields get added to this table and built into this row
			else {

				// Ensure this field name gets added to object table as a column
				await this.addFieldAsColumnIfNotExists(fieldName, fieldValue, tableName);

				columnNamesToInsert.push(fieldName);
				valuesToInsert.push(fieldValue);
			}
		}

		// Once we've gone through all the field names - we can build our insert query
		const columnString = buildColumnString(columnNamesToInsert);
		const valuesPlaceholder = valuesToInsert.map((_, index) => `${index + 1}`).join();

		// Build our query for this row
		const query = `
		INSERT INTO ${tableName} (${columnString})
		VALUES (${valuesPlaceholder})
		`;

		console.log(query);
	}

	private async addFieldAsColumnIfNotExists(fieldName: string, fieldValue: string | number, tableName: string) {

		const fieldType = typeof fieldValue;
		const columnType = getDatabaseTypeForField(fieldType);

		const query = `
		ALTER TABLE ${tableName}
		ADD COLUMN IF NOT EXISTS "${fieldName}" ${columnType}
		`;

		await this.netxCon.executeQuery(query);
	}

	private async addConstituentRecordToNetX(constituentRecord) {

	}
}

const buildColumnString = (columnNames: string[]): string => {
	return columnNames.join();
};