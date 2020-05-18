import dotenv from 'dotenv';

dotenv.config();

export const Config = {
	tmsDatabaseHost: process.env.TMS_DATABASE_HOST,
	tmsDatabaseUser: process.env.TMS_DATABASE_USER,
	tmsDatabasePassword: process.env.TMS_DATABASE_PASSWORD,
	tmsDatabaseName: process.env.TMS_DATABASE_NAME,

	netxDatabaseHost: process.env.NETX_INT_DATABASE_HOST,
	netxDatabaseUser: process.env.NETX_INT_DATABASE_USER,
	netxDatabasePassword: process.env.NETX_INT_DATABASE_PASSWORD,
	netxDatabaseName: process.env.NETX_INT_DATABASE_NAME
};