import jsonDiff from "json-diff";

import {
  ObjectID,
  StoredTextEntry,
  CollectionPayloadTextEntry,
} from "../interfaces/queryResponses";
import { splitArray, flattenArray } from "../constants/arrayHelpers";
import { SQLConnection } from "./sql";
import { ObjectProcess } from "./objectProcess";
import { DatabaseInitializer } from "./databaseInitializer";
import { Logger, DiffLogger } from ".././logger";

const NEWLINE_RETURN_TAB_REGEX = /[\n\r\t]/g;

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
    // We want to avoid pulling non-existent text entry values
    const objectIdQuery = `
			SELECT ID 
			FROM TextEntries 
			WHERE TextTypeId = 67
			AND TextEntry IS NOT NULL
			AND TextEntry != ''
			ORDER BY ID ASC
			`;

    // From knowledge of the database - we have around 7622 objects we will work with - get the exact count to make sure
    const queryResult = await this.tmsCon.executeQuery(objectIdQuery);
    const recordset = queryResult.recordset as ObjectID[];

    return { recordset, count: recordset.length };
  }

  /** Initializes the NetX database as this should only run once during each sync*/
  public initializeNetXDatabase = async () => {
    const db = new DatabaseInitializer(this.netxCon);

    // Create the NetX main object table
    await db.createMainObjectTable();

    // Create the NetX text entry storage table
    await db.createTextEntryStoreTable();

    // Create the NetX constituent records table
    await db.createConstituentTable();

    // Create the NetX object-constituent mappings table
    await db.createObjectConstituentTable();

    // Create the NetX media information table
    await db.createMediaInformationTable();
  };

  private identifyModifiedRecords = async (objectIds: Array<ObjectID>) => {
    // Query to get the Online Collection Payload for these Object IDs
    const objectIdString = objectIds.map((objectId) => objectId.ID).join();
    const collectionPayloadQuery = `
			SELECT ID, TextEntry 
			FROM TextEntries 
			WHERE ID IN (${objectIdString})
			AND TextTypeId = 67
			AND TextEntry IS NOT NULL
			ORDER BY ID ASC`;

    // Check if this copy differs from the last processed version of data we have
    const storedTextEntryQuery = `
			SELECT "objectId", "textEntry"
			FROM "text_entry_store"
			WHERE "objectId" IN (${objectIdString})
			ORDER BY "objectId" ASC 
			`;

    // Execute the query to get the text entries from TMS
    const tmsQueryResult = await this.tmsCon.executeQuery(
      collectionPayloadQuery
    );
    const tmsRecordSet =
      tmsQueryResult.recordset as CollectionPayloadTextEntry[];

    // Execute the query to get the same text entries from the intermediate database
    const storedTextEntryQueryResult = await this.netxCon.executeQuery(
      storedTextEntryQuery
    );
    const storedTextEntryRecordSet =
      storedTextEntryQueryResult?.rows as Array<StoredTextEntry>;

    // Now figure out which text entries from TMS are now different from what we have stored
    const modifiedTMSRecords = tmsRecordSet.reduce((acc, tmsRecord) => {
      if (Boolean(tmsRecord.TextEntry) === false) {
        Logger.warn(
          `No "TextEntry"  available for Object ID "${tmsRecord.ID}" so it will not be added to NetX`,
          tmsRecord.TextEntry
        );
        return acc;
      }

      const tmsTextEntry = tmsRecord.TextEntry?.replace(
        NEWLINE_RETURN_TAB_REGEX,
        ""
      );
      const storedTextEntry =
        storedTextEntryRecordSet.find(
          (storedRecord) => tmsRecord.ID === storedRecord.objectId
        )?.textEntry || "";

      // If the TMS TextEntry and Stored TextEntry are the same, then the record was not modified
      if (tmsTextEntry === storedTextEntry) {
        return acc;
      }

      // Otherwise, record was modified or we don't have it yet, so we'll store it
      // We also want to see the difference between the two
      const objectDifference = jsonDiff.diff(
        JSON.parse(storedTextEntry || "{}"),
        JSON.parse(tmsTextEntry),
        { raw: true }
      );
      Logger.debug(
        `Difference in JSON exists between Stored TextEntry and TMS TextEntry for ${tmsRecord.ID}`
      );
      DiffLogger.debug({ [tmsRecord.ID]: objectDifference });
      acc.push({ ID: tmsRecord.ID, TextEntry: tmsRecord.TextEntry });

      return acc;
    }, [] as Array<CollectionPayloadTextEntry>);

    return modifiedTMSRecords;
  };

  /** Runs the main process tasks in the sync */
  public run = async () => {
    // Get the object ids and the total count
    const { recordset, count } = await this.getCollectionObjectIDs();
    const modifiedRecordIdSet: Array<CollectionPayloadTextEntry> = [];

    // Set up batches of object retrieval to run
    const parallelExecutionLimit = 2;
    const splitRecordSet = splitArray(recordset, 1000);
    const numberOfBatches = Math.ceil(
      splitRecordSet.length / parallelExecutionLimit
    );

    Logger.debug(`There are ${count} records to fetch and process from TMS`);
    Logger.debug(`There will be total ${numberOfBatches} batches of ${parallelExecutionLimit} executions.
					  Each execution contains 1000 records`);

    // Retrieve the objects in batches
    for (let i = 0; i <= numberOfBatches; i++) {
      // Setup this batch
      const batchStart = i * parallelExecutionLimit;
      const batchArguments = splitRecordSet.slice(
        batchStart,
        batchStart + parallelExecutionLimit
      );
      const batchRequests = batchArguments.map((argument) => {
        return this.identifyModifiedRecords(argument);
      });

      // Execute the batches of promises
      const identifiedRecordIds = await Promise.all(batchRequests);
      modifiedRecordIdSet.push(...flattenArray(identifiedRecordIds));
    }

    Logger.debug(
      `There are ${modifiedRecordIdSet.length} records identified that must be updated/created from TMS`
    );
    Logger.debug(modifiedRecordIdSet.map((record) => record.ID).join());

    // Set up batches of object creation/update to run
    const parallelCreationLimit = 2;
    const splitModifiedRecordSet = splitArray(modifiedRecordIdSet, 1000);
    const numberOfCreationBatches = Math.ceil(
      splitModifiedRecordSet.length / parallelCreationLimit
    );

    Logger.debug(
      `There are ${modifiedRecordIdSet.length} records to create or update into NetX`
    );
    Logger.debug(`There will be total ${numberOfCreationBatches} batches of ${parallelCreationLimit} executions.
					  Each execution contains 1000 records`);

    for (let j = 0; j <= numberOfCreationBatches; j++) {
      // Setup this batch
      const batchStart = j * parallelCreationLimit;
      const batchArguments = splitModifiedRecordSet.slice(
        batchStart,
        batchStart + parallelCreationLimit
      );

      const batchRequests = batchArguments.map((argument) => {
        const op = new ObjectProcess(argument, this.netxCon);
        return op.perform();
      });

      // Execute the batches of promises
      await Promise.all(batchRequests);
    }
  };
}

interface CollectionObjectIDs {
  recordset: ObjectID[];
  count: number;
}
