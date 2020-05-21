import { ObjectID } from '../interfaces/queryResponses';
import { TableInformation } from '../interfaces/netXDatabaseInterfaces';
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
			const primaryColumn1 = mainObjectInformation.primaryKeyColumns[0];
			const primaryColumn2 = mainObjectInformation.primaryKeyColumns[1];

			// Query to create table
			const query = `
			CREATE TABLE IF NOT EXISTS ${mainObjectInformation.tableName} (
				"${primaryColumn1.name}" ${primaryColumn1.type},
				"${primaryColumn2.name}" ${primaryColumn2.type},
				PRIMARY KEY ("${primaryColumn1.name}", "${primaryColumn2.name}")
			);
			`;

			await this.netxCon.executeQuery(query);
		};

		const createConstituentTable = async () => {

			const { constituentRecords } = NetXTables;
			const primaryColumn = constituentRecords.primaryKeyColumns[0];

			// Query to create table
			const query = `
			CREATE TABLE IF NOT EXISTS ${constituentRecords.tableName} (
				"${primaryColumn.name}" ${primaryColumn.type} PRIMARY KEY
			);
			`;

			await this.netxCon.executeQuery(query);
		};

		const createObjectConstituentTable = async () => {
			const { objectConstituentMappings, mainObjectInformation, constituentRecords } = NetXTables;

			const mainObjectInformationName = mainObjectInformation.tableName;
			const constituentRecordsName = constituentRecords.tableName;
			const constituentRecordsPrimaryColumn = constituentRecords.primaryKeyColumns[0];

			const primaryColumn = objectConstituentMappings.primaryKeyColumns[0];
			const foreignColumn1 = objectConstituentMappings.foreignKeyColumns[0];
			const foreignColumn2 = objectConstituentMappings.foreignKeyColumns[1];

			// Query to create table
			const query = `
			CREATE TABLE IF NOT EXISTS ${objectConstituentMappings.tableName} (
				"${primaryColumn.name}" ${primaryColumn.type} PRIMARY KEY,
				"${foreignColumn1.name}" ${foreignColumn1.type},
				"${foreignColumn2.name}" ${foreignColumn2.type},

				CONSTRAINT ${constituentRecordsName}_id_fkey FOREIGN KEY ("${foreignColumn2.name}")
					REFERENCES ${constituentRecordsName} ("${constituentRecordsPrimaryColumn.name}") MATCH SIMPLE
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

	};

	/** Runs the main process tasks in the sync */
	public run = async () => {

		// Get the object ids and the total count
		const { recordset, count } = await this.getCollectionObjectIDs();

		// Set up batches of object retrieval to run
		const parallelExecutionLimit = 1;
		const numberOfBatches = Math.ceil(count / parallelExecutionLimit);

		// Retrieve the objects in batches
		for (let i = 0; i <= 0; i++) {

			// Setup this batch
			const batchStart = i * parallelExecutionLimit;
			const batchArguments = recordset.slice(batchStart, (batchStart + parallelExecutionLimit));

			const batchRequests = batchArguments.map((argument, index) => {

				const op = new ObjectProcess(argument, this.tmsCon, this.netxCon);
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

