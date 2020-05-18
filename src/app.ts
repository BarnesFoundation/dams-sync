import { Config } from './config';
import { SQLConnection } from './sql';

let tmsCon: SQLConnection;
let netxCon: SQLConnection;

const main = async () => {

	// Set up our connections to TMS and NetX
	await initializeDatabaseConnections();

	// Run the main processes of the sync
	await executeSyncProcess();

	// Now that we're done, close connections
	await closeDatabaseConnections();

	console.log(`Ending sync`);
};

/** Initializes each of our connections - 1 to TMS and 1 to NetX */
const initializeDatabaseConnections = async () => {

	// Setup connection to the TMS database - uses MS SQL
	tmsCon = new SQLConnection({
		user: Config.tmsDatabaseUser,
		host: Config.tmsDatabaseHost,
		password: Config.tmsDatabasePassword,
		database: Config.tmsDatabaseName
	}, 'mssql');

	// Setup connection to the NetX database - uses PostgreSQL
	netxCon = new SQLConnection({
		user: Config.netxDatabaseUser,
		host: Config.netxDatabaseHost,
		password: Config.netxDatabasePassword,
		database: Config.netxDatabaseName
	}, 'psql');

	// Connect to the database
	await tmsCon.connect();
	await netxCon.connect();
};

/** Closes out each of our connections */
const closeDatabaseConnections = async () => {
	await tmsCon.endConnection();
	await netxCon.endConnection();
};

/** Runs the main process tasks in the sync */
const executeSyncProcess = async () => {

	// Get the total count of objects
	const totalObjectCount = await getCollectionCount();
};

/** Retrieves the total count of Collection Online objects in TMS */
const getCollectionCount = async (): Promise<number> => {

	// Query to get count of objects we'll end up working with
	const countQuery = `SELECT COUNT(TextEntry) FROM TextEntries WHERE TextTypeId = 67`;

	// From knowledge of the database - we have around 7622 objects we will work with - get the exact count to make sure
	const { recordset } = await tmsCon.executeQuery(countQuery);
	const count = recordset[0][''] as number;

	return count;
};

main();