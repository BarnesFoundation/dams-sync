import { TablesInformation, TableInformation } from '../interfaces/netXDatabaseInterfaces';

export const NetXTables: TablesInformation = {

	/** Main Object table where information about each object will be stored - some information will be duplicated, some will not
	 * but the combination of ObjectId and RenditionNumber will always be unique to each row
	 */
	mainObjectInformation: {
		tableName: 'main_object_information',
		primaryKeyColumns: [
			{ name: 'objectId', type: 'INTEGER' },
			{ name: 'renditionNumber', type: 'VARCHAR' }
		]
	},

	/** Holds information about each Constituent i.e. Artist information. Each artist row is unique */
	constituentRecords: {
		tableName: 'constituent_records',
		primaryKeyColumns: [
			{ name: 'constituentID', type: 'INTEGER' }
		]
	},

	/** Maps the relationship between the main objects and the constituents that were involved with that object.
	 * An object id can reference multiple constituent record ids
	 */
	objectConstituentMappings: {
		tableName: 'object_constituent_mappings',
		primaryKeyColumns: [
			{ name: 'id', type: 'INTEGER' }
		],
		foreignKeyColumns: [
			{ name: 'objectId', type: 'INTEGER' },
			{ name: 'constituentRecordId', type: 'INTEGER' }
		]
	}
};

