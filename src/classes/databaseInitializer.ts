import { SQLConnection } from "./sql";
import { NetXTables } from '../constants/netXDatabase';

export class DatabaseInitializer {

	netxCon: SQLConnection;

	constructor(netxCon: SQLConnection) {
		this.netxCon = netxCon;
	}

	/** Creates the main object table -- generates the raw sql to do so and executes it */
	public createMainObjectTable = async () => {

		const { mainObjectInformation } = NetXTables;
		const primaryColumn1 = mainObjectInformation.columns[0];

		const columnsString = mainObjectInformation.columns.map((column) => `"${column.name}" ${column.type}`)
			.join(',\n');

		// Query to create table
		const query = `
		CREATE TABLE IF NOT EXISTS ${mainObjectInformation.tableName} (
			${columnsString},
			PRIMARY KEY ("${primaryColumn1.name}")
		);
		`;

		await this.netxCon.executeQuery(query);
	};

	/** Creates the contituent table -- generates the raw sql to do so and executes it */
	public createConstituentTable = async () => {

		const { constituentRecords } = NetXTables;
		const primaryColumn = constituentRecords.columns[0];

		const columnsString = constituentRecords.columns.map((column, index, array) => `"${column.name}" ${column.type}`)
			.join(',\n');

		// Query to create table
		const query = `
		CREATE TABLE IF NOT EXISTS ${constituentRecords.tableName} (
			${columnsString},
			PRIMARY KEY ("${primaryColumn.name}")
		);
		`;

		await this.netxCon.executeQuery(query);
	};

	/** Creates the object-to-constituent mapping table. Sets up the needed foreign/primary key relationships 
	 * between it and the constituent record/main object information tables,
	 * and the raw table sql to do so and executes it */
	public createObjectConstituentTable = async () => {
		const { objectConstituentMappings, constituentRecords, mainObjectInformation } = NetXTables;

		const constituentRecordsName = constituentRecords.tableName;
		const constituentRecordsPrimaryColumn = constituentRecords.columns[0];

		const moName = mainObjectInformation.tableName;
		const moPrimary = mainObjectInformation.columns[0];

		const primaryColumn1 = objectConstituentMappings.columns[0];
		const primaryColumn2 = objectConstituentMappings.columns[1];

		// Query to create table
		const query = `
		CREATE TABLE IF NOT EXISTS ${objectConstituentMappings.tableName} (
			"${primaryColumn1.name}" ${primaryColumn1.type},
			"${primaryColumn2.name}" ${primaryColumn2.type},
			PRIMARY KEY ("${primaryColumn1.name}", "${primaryColumn2.name}"),

			CONSTRAINT ${constituentRecordsName}_id_fkey FOREIGN KEY ("${primaryColumn1.name}")
				REFERENCES ${constituentRecordsName} ("${constituentRecordsPrimaryColumn.name}") MATCH SIMPLE
				ON DELETE NO ACTION,

			CONSTRAINT ${moName}_id_fkey FOREIGN KEY ("${primaryColumn2.name}")
				REFERENCES ${moName} ("${moPrimary.name}") MATCH SIMPLE
				ON DELETE NO ACTION
		);
		`;

		await this.netxCon.executeQuery(query);
	};

	/** Creates the media information table. Sets up the needed foreign/primary key relationship with it and the main object table,
	 *  generates the raw sql to do so and executes it */
	 public createMediaInformationTable = async () => {
		const { mainObjectInformation, mediaInformation } = NetXTables;

		const miName = mediaInformation.tableName;
		const miPrimary = mediaInformation.columns[0];
		const miForeign = mediaInformation.columns[1];

		const moName = mainObjectInformation.tableName;
		const moPrimary = mainObjectInformation.columns[0];

		const columnsString = mediaInformation.columns.map((column, index, array) => `"${column.name}" ${column.type}`)
			.join(',\n');

		// Query to create table
		const query = `
		CREATE TABLE IF NOT EXISTS ${miName} (
			${columnsString},
			PRIMARY KEY ("${miPrimary.name}"),

			CONSTRAINT ${moName}_objectId_fkey FOREIGN KEY ("${miForeign.name}")
				REFERENCES ${moName} ("${moPrimary.name}") MATCH SIMPLE
				ON DELETE NO ACTION
		);
		`;

		await this.netxCon.executeQuery(query);
	};
}