import { ObjectID } from '../interfaces/queryResponses';
import { SQLConnection } from './sql';
import { ObjectProcess } from './objectProcess';
import { Tables } from '../constants/netXDatabase';

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
	public initializeNetXDatabase = () => {


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

