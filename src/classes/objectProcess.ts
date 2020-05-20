import { ObjectID, CollectionPayloadTextEntry, CollectionPayload, ObjectRecord } from '../interfaces/queryResponses';
import { SQLConnection } from './sql';

export class ObjectProcess {

	private objectId: number;
	private tmsCon: SQLConnection;
	private netxCon: SQLConnection;

	constructor(objectId: ObjectID, tmsCon: SQLConnection, netxCon: SQLConnection) {
		this.objectId = objectId.ID;
		this.tmsCon = tmsCon;
		this.netxCon = netxCon;
	}

	public async perform() {

		// Query to get the Online Collection Payload for this object id
		const collectionPayloadQuery = `
			SELECT TextEntry 
			FROM TextEntries 
			WHERE ID = ${this.objectId} 
			AND TextTypeId = 67`;

		// Execute the query
		const recordset = (await this.tmsCon.executeQuery(collectionPayloadQuery)).recordset as CollectionPayloadTextEntry[];

		// Get the text entry - which is a JSON string and parse it
		const cpTextEntry = recordset[0].TextEntry;
		const cp = JSON.parse(cpTextEntry) as CollectionPayload;

		// Iterate through each object record
		for (let i = 0; i < cp.ObjectRecord.length; i++) {

			// Add it to the NetX intermediate database
			const or = cp.ObjectRecord[i];
			await this.addObjectToNetX(or);
		}
	}

	private async addObjectToNetX(or: ObjectRecord) {
		for (let [key, value] of Object.entries(or)) {
			console.log(`${key} has a type of ${typeof value}`);
		}
	}
}