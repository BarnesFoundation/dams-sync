import mssql from 'mssql';
import pg, { Pool, PoolClient } from 'pg';
import { Logger } from './../logger';

interface ConnectionParams {
	host: string,
	user: string,
	password: string,
	database: string
}

const MSSQL = 'mssql';
const PSQL = 'psql'

export class SQLConnection {

	private connection: any | pg.Client;
	private type;

	private user: string;
	private host: string;
	private password: string;
	private database: string

	constructor(params: ConnectionParams, type: 'mssql' | 'psql') {

		const { user, host, password, database } = params;
		this.type = type;

		this.user = user;
		this.host = host;
		this.password = password;
		this.database = database;
	}

	/** Connects to the database  */
	public async connect() {

		try {
			// Set connection to mssql
			if (this.type === MSSQL) {
				this.connection = await mssql.connect({
					user: this.user,
					password: this.password,
					database: this.database,
					server: this.host
				});
			}

			// Set connection to psql
			if (this.type === PSQL) {
				this.connection = new Pool({
					user: this.user,
					host: this.host,
					database: this.database,
					password: this.password
				});
			}
			Logger.debug(`Successfully connected to the ${this.type} database and created pool`);
		}

		catch (error) {
			Logger.error(`An error occurred connecting to the ${this.type} database`, error);
		}
	}

	/** ONLY for use with the PSQL connection -- checks out a client from the pool */
	public async checkoutClient(): Promise<PoolClient> {
		const client = await this.connection.connect();
		return client;
	}

	/** Executes the query for the database
	 * @params query - The query to run. 
	 * 	For an MSSQL connection, query can be concatenated string per docs https://www.npmjs.com/package/mssql#es6-tagged-template-literals
	 * 
	 * @params values - The values to be substitued into the query string. Only for use with PSQL connection
	 */
	public async executeQuery(query: string, values?: string[] | number[]) {

		let results;

		try {
			if (this.type === MSSQL) {
				// For the mssql driver, you can pass the interpolated string
				results = await this.connection.query(query);
			}

			if (this.type === PSQL) {
				// For the psql driver, you pass a parameterized query along with the values that must be substituted into the query5
				results = await this.connection.query(query, values)
			}

			return results;
		}

		catch (error) {
			Logger.error(`An error occurred running the provided query on the ${this.type} database`, query);
			Logger.error(error);
		}
	}

	public async endConnection() {

		try {
			if (this.type === MSSQL) {
				await this.connection.close();
			}

			if (this.type === PSQL) {
				await this.connection.end();
			}

			Logger.debug(`Successfully ended ${this.type} connection`);
		}

		catch (error) {
			Logger.debug(`Could not close ${this.type} connection`, error);
		}
	}
}