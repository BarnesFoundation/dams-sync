import { TablesInformation } from '../interfaces/netXDatabaseInterfaces';

/** The information contained within these list of table objects is very important. You can consider them as crucial and be as 
 * cautious with modifying the information below as you would with modifying the SQL for creating tables in a database.
 * 
 * Order of the columns typically does not matter aside from columns that are designated as primary/foreign keys. In the "DatabaseInitializer" class
 * the index location of the primary/foreign keys in the columns list for these tables is used to specifically select them from the columns list.
 * 
 * If you modify the order/placement of any of these primary/foreign key designated columns, be sure to check that the corresponding SQL code in 
 * the "DatabaseInitializer" class is updated to reflect that change
 *  */
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
			{ name: 'ImagecreditLine', type: 'VARCHAR', }
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
			{ name: 'constituentRecordId', type: 'INTEGER', primary: true, foreign: true },
			{ name: 'objectId', type: 'INTEGER', primary: true, foreign: true }
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
			{ name: 'mediaView', type: 'VARCHAR' },
			{ name: 'publicAccess', type: 'INTEGER' }
		]
	}
};

