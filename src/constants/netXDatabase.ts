import { TablesInformation, TableInformation } from '../interfaces/netXDatabaseInterfaces';

export const NetXTables: TablesInformation = {

	/** Main Object table where information about each object will be stored - some information will be duplicated, some will not
	 * but the combination of ObjectId and RenditionNumber will always be unique to each row
	 */
	mainObjectInformation: {
		tableName: 'main_object_information',
		columns: [
			{ name: 'objectId', type: 'INTEGER', primary: true },
			{ name: 'title', type: 'VARCHAR' },
			{ name: 'objectNumber', type: 'VARCHAR' },
			{ name: 'classification', type: 'VARCHAR' },
			{ name: 'beginDate', type: 'VARCHAR' },
			{ name: 'endDate', type: 'VARCHAR' },
			{ name: 'dated', type: 'VARCHAR' },
			{ name: 'period', type: 'VARCHAR' },
			{ name: 'culture', type: 'VARCHAR' },
			{ name: 'medium', type: 'VARCHAR' },
			{ name: 'marks', type: 'VARCHAR' },
			{ name: 'inscriptions', type: 'VARCHAR' },
			{ name: 'homeLocation', type: 'VARCHAR' },
			{ name: 'copyrightStatus', type: 'VARCHAR' },
			{ name: 'creditLine', type: 'VARCHAR' },
			{ name: 'shortDescription', type: 'VARCHAR' },
			{ name: 'longDescription', type: 'VARCHAR' },
			{ name: 'publishedProvenance', type: 'VARCHAR' },
			{ name: 'exhibitionHistory', type: 'VARCHAR' },
			{ name: 'bibliography', type: 'VARCHAR' },
			{ name: 'dimensions', type: 'VARCHAR' },
			{ name: 'caption', type: 'VARCHAR' },
		]
	},

	/** Holds information about each Constituent i.e. Artist information. Each artist row is unique */
	constituentRecords: {
		tableName: 'constituent_records',
		columns: [
			{ name: 'constituentID', type: 'INTEGER', primary: true },
			{ name: 'prefix', type: 'VARCHAR' },
			{ name: 'suffix', type: 'VARCHAR' },
			{ name: 'alphaSort', type: 'VARCHAR' },
			{ name: 'firstName', type: 'VARCHAR' },
			{ name: 'lastName', type: 'VARCHAR' },
			{ name: 'birthDate', type: 'VARCHAR' },
			{ name: 'deathDate', type: 'VARCHAR' },
			{ name: 'role', type: 'VARCHAR' },
			{ name: 'artistDisplayDate', type: 'VARCHAR' },
			{ name: 'artistNationality', type: 'VARCHAR' },

			{ name: 'constituentName', type: 'VARCHAR' },
			{ name: 'fullConstituent', type: 'VARCHAR' },
			{ name: 'fullConstituentAndRole', type: 'VARCHAR' }
		]
	},

	/** Maps the relationship between the main objects and the constituents that were involved with that object.
	 * Multiple object ids can reference multiple constituent record ids 
	 */
	objectConstituentMappings: {
		tableName: 'object_constituent_mappings',
		columns: [
			{ name: 'id', type: 'SERIAL', primary: true },
			{ name: 'constituentRecordId', type: 'INTEGER', foreign: true },
			{ name: 'objectId', type: 'INTEGER' }
		]
	},

	/** Holds information about each Media Information. Maps back to the Main Object Information table.
	 * An object id can reference multiple media information
	 */
	mediaInformation: {
		tableName: 'media_information',
		columns: [
			{ name: 'renditionNumber', type: 'VARCHAR', primary: true },
			{ name: 'objectId', type: 'INTEGER', foreign: true },
			{ name: 'mediaDescription', type: 'VARCHAR' },
			{ name: 'mediaName', type: 'VARCHAR' },
			{ name: 'isPrimary', type: 'VARCHAR' },
			{ name: 'mediaRole', type: 'VARCHAR' },
			{ name: 'photographerName', type: 'VARCHAR' },
			{ name: 'renditionDate', type: 'VARCHAR' },
			{ name: 'technique', type: 'VARCHAR' },
			{ name: 'publicCaption', type: 'VARCHAR' },
		]
	}
};

