# DAMS Sync	

This repository contains the code that syncs the artwork information from The Barnes Foundation's internal TMS database over to the NetX Intermediate database (which itself is hosted on Amazon Web Services - Relational Database Service). 

# Tech Architecture

The code for the DAMS Sync is written in Node.js (TypeScript) and the NetX Intermediate Database is a PostgreSQL database hosted on AWS.

# Sync Process Workflow

The table in TMS that this sync retrieves the artwork information from is the `TextEntries` table — and specifically, the `TextEntry` column of that table, as it is that field which contains the artwork information needed for the intermediate database.

This query below is used to pull the information for an artwork

```
SELECT TextEntry 
FROM TextEntries 
WHERE ID = ${objectId} 
AND TextTypeId = 67`;
```

where `${objectId}` is the ID for the artwork object to retrieve the information for. 

That payload of information is then parsed in [this file](https://github.com/BarnesFoundation/dams-sync/blob/master/src/classes/objectProcess.ts "this file") in order to create the structure of data to be inserted into the intermediate database.

The configuration of the table structure and related columns for the NetX Intermediate Database is located here [NetX Database](https://github.com/BarnesFoundation/dams-sync/blob/master/src/constants/netXDatabase.ts "NetX Database"). Any modification to those table and/or column configurations should be treated with caution — similar to how you'd treat modifying a database schema. There would likely need to be a corresponding update to the source code of the sync with any changes to those configurations.

Once the sync has pulled the information for each artwork object, and the corresponding media information of each artwork (as an artwork can have many different media informations), and updated that information into the database, then the sync has been complete and it will end.

# Connections

The intermediate database allows access from internal Barnes Foundation IP addresses as well as from a pre-defined range of IP addresses provided to us by NetX. This is needed in order for them to query the information in the intermediate database such that it can flow into NetX's own application database.

# Development 
If you are developing or testing locally, it'd be best to take a back-up of the existing intermediate database and host it locally during your development process. You can also start up a new PostgreSQL database locally and this sync process will then create the necessary table structure in that database for you.

You'll need to update create a `.env` file based off the [`.env.template`](https://github.com/BarnesFoundation/dams-sync/blob/master/.env.template "`.env.template`") with your own values to have this sync run successfully.

You can start the script locally with `npm start`, which will attempt to create the needed table structure (if your database happens to be an empty schema). It will then perform the sync process as well.

# Deployment

Currently, deployment of this sync is a manual process as we only have 1 environment for the process — the Production environment.

The typical deployment setup would look like this - first you build the executable, then deploy it.

### Build

1. Pull this code repository, switch to node v10.19, and run `npm install` to install the needed dependencies
2. Deploy an empty database schema on AWS (or local for local development) and make note of the needed values for the `.env` file
3. Get the credentials for connecting to the TMS database
4. Populate the `.env` file accordingly
5. Run `npm run build` to create the Windows executable for the sync ([pkg](https://www.npmjs.com/package/pkg "pkg") is used to do this)

### Deploy 

1. Deploy the created Windows executable and a production-ready version of the `.env` file to the machine that will be running the sync
2. Set up Windows Task Scheduler or some other scheduler to execute the executable such that it runs the process periodically

The `npm start` command starts the sync. During each run, the sync checks if the connected NetX Intermediate Database has the proper table structure and columns. 

If it does not, then the table structure and columns are created. If it already has them, then the creation commands are ignored by the database. See [`initializeNetXDatabase()`](https://github.com/BarnesFoundation/dams-sync/blob/master/src/classes/mainSyncProcess.ts#L33 "`initializeNetXDatabase()`").

You can also see the [Database Initializer class](https://github.com/BarnesFoundation/dams-sync/blob/master/src/classes/databaseInitializer.ts "Database Initializer class") for more on this.

