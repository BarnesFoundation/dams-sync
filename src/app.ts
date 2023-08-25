import { Config } from './config';
import { SQLConnection } from './classes/sql';
import { MainSyncProcess } from './classes/mainSyncProcess';
import { Logger } from './logger';

class Application {

	tmsCon: SQLConnection;
	netxCon: SQLConnection;

	/** Performs the run of this application */
	public async perform() {
		Logger.debug(`Beginning sync`);

		// Set up our connections to TMS and NetX
		await this.initializeDatabaseConnections();

		// Create main sync instance
		const mainSync = new MainSyncProcess(this.tmsCon, this.netxCon);

		// Initialize the intermediate database
		await mainSync.initializeNetXDatabase();

		// Run the main sync
		await mainSync.run();

		// Now that we're done, close connections
		await this.closeDatabaseConnections();

		Logger.debug(`Ending sync`);
	}

	/** Initializes each of our connections - 1 to TMS and 1 to NetX */
	private initializeDatabaseConnections = async () => {

		// Setup connection to the TMS database - uses MS SQL
		this.tmsCon = new SQLConnection({
			user: Config.tmsDatabaseUser,
			host: Config.tmsDatabaseHost,
			password: Config.tmsDatabasePassword,
			database: Config.tmsDatabaseName
		}, 'mssql');

		// Setup connection to the NetX database - uses PostgreSQL
		this.netxCon = new SQLConnection({
			user: Config.netxDatabaseUser,
			host: Config.netxDatabaseHost,
			password: Config.netxDatabasePassword,
			database: Config.netxDatabaseName
		}, 'psql');

		// Connect to the database
		await this.tmsCon.connect();
		await this.netxCon.connect();
	};

	/** Closes out each of our connections */
	private closeDatabaseConnections = async () => {
		await this.tmsCon.endConnection();
		await this.netxCon.endConnection();
	};
}

const main = async () => {

	// Create new instance of the Application
	const app = new Application();

	// Execute it
	await app.perform();
};

main();