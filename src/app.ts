import { Config } from './config';
import { SQLConnection } from './classes/sql';
import { MainSyncProcess } from './classes/mainSyncProcess';

let tmsCon: SQLConnection;
let netxCon: SQLConnection;

const main = async () => {

	// Set up our connections to TMS and NetX
	await initializeDatabaseConnections();

	// Run the main processes of the sync
	const mainSync = new MainSyncProcess(tmsCon, netxCon);
	await mainSync.run();

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



main();