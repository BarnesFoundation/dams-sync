import { ObjectID } from '../interfaces/queryResponses';
import { SQLConnection } from './sql';
import { ObjectProcess } from './objectProcess';
import { NetXTables } from '../constants/netXDatabase';

export class MainSyncProcess {

	private tmsCon: SQLConnection;
	private netxCon: SQLConnection;

	constructor(tmsCon: SQLConnection, netxCon: SQLConnection) {
		this.tmsCon = tmsCon;
		this.netxCon = netxCon;
	}

	/** Retrieves the total count of Collection Online objects in TMS */
	private async getCollectionObjectIDs(): Promise<CollectionObjectIDs> {

		// Query to get count of objects we'll end up working with - 67 is the type for the text type
		const objectIdQuery = `
			SELECT ID 
			FROM TextEntries 
			WHERE TextTypeId = 67`;

		// From knowledge of the database - we have around 7622 objects we will work with - get the exact count to make sure
		const recordset = (await this.tmsCon.executeQuery(objectIdQuery)).recordset as ObjectID[];
		const count = recordset.length;

		return { recordset, count };
	};

	/** Initializes the NetX database as this should only run once during each sync*/
	public initializeNetXDatabase = async () => {

		const createMainObjectTable = async () => {

			const { mainObjectInformation } = NetXTables;
			const primaryColumn1 = mainObjectInformation.columns[0];

			const columnsString = mainObjectInformation.columns.map((column, index, array) => `"${column.name}" ${column.type}`)
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

		const createConstituentTable = async () => {

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

		const createObjectConstituentTable = async () => {
			const { objectConstituentMappings, constituentRecords } = NetXTables;

			const constituentRecordsName = constituentRecords.tableName;
			const constituentRecordsPrimaryColumn = constituentRecords.columns[0];

			const primaryColumn = objectConstituentMappings.columns[0];
			const foreignColumn = objectConstituentMappings.columns[1];
			const additionalColumn = objectConstituentMappings.columns[2];

			// Query to create table
			const query = `
			CREATE TABLE IF NOT EXISTS ${objectConstituentMappings.tableName} (
				"${primaryColumn.name}" ${primaryColumn.type} PRIMARY KEY,
				"${foreignColumn.name}" ${foreignColumn.type},
				"${additionalColumn.name}" ${additionalColumn.type},

				CONSTRAINT ${constituentRecordsName}_id_fkey FOREIGN KEY ("${foreignColumn.name}")
					REFERENCES ${constituentRecordsName} ("${constituentRecordsPrimaryColumn.name}") MATCH SIMPLE
					ON DELETE NO ACTION
			);
			`;

			await this.netxCon.executeQuery(query);
		};

		const createMediaInformationTable = async () => {
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

		// Create the NetX main object table
		await createMainObjectTable();

		// Create the NetX constituent records table
		await createConstituentTable();

		// Create the NetX object-constituent mappings table
		await createObjectConstituentTable();

		// Create the NetX media information table
		await createMediaInformationTable();

	};

	/** Runs the main process tasks in the sync */
	public run = async () => {

		// Get the object ids and the total count
		const { recordset, count } = await this.getCollectionObjectIDs();

		// Set up batches of object retrieval to run
		const parallelExecutionLimit = 100;
		const numberOfBatches = Math.ceil(count / parallelExecutionLimit);

		console.log(`There will be ${numberOfBatches} batches of ${parallelExecutionLimit} executions each`);

		// Retrieve the objects in batches
		for (let i = 0; i <= numberOfBatches; i++) {

			// Setup this batch
			const batchStart = i * parallelExecutionLimit;
			const batchArguments = recordset.slice(batchStart, (batchStart + parallelExecutionLimit));

			const batchRequests = batchArguments.map((argument, index) => {
				const op = new ObjectProcess(argument, this.tmsCon, this.netxCon, index, i);
				return op.perform();
			});

			// Execute the batches of promises
			await Promise.all(batchRequests);
		}
	};
}



interface CollectionObjectIDs {
	recordset: ObjectID[],
	count: number
}

