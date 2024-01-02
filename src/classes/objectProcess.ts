import {
  ObjectID,
  CollectionPayloadTextEntry,
  CollectionPayload,
  ObjectRecord,
} from "../interfaces/queryResponses";
import { SQLConnection } from "./sql";
import { NetXTables } from "../constants/netXDatabase";
import { PoolClient } from "pg";
import QueryHelpers from "../constants/queryHelpers";
import ObjectHelpers from "../constants/objectHelpers";
import { OBJECT_RECORD } from "../constants/names";
import { Logger } from "./../logger";

const NEWLINE_RETURN_TAB_REGEX = /[\n\r\t]/g;

const {
  mainObjectInformation: tableMainObjectInformation,
  mediaInformation: tableMediaInformation,
  constituentRecords: tableConstituentRecords,
  objectConstituentMappings: tableObjectConstituentMappings,
} = NetXTables;

export class ObjectProcess {
  private objects: Array<CollectionPayloadTextEntry>;
  private netxCon: SQLConnection;
  private netxClient: PoolClient;

  constructor(
    objects: Array<CollectionPayloadTextEntry>,
    netxCon: SQLConnection
  ) {
    this.netxCon = netxCon;
    this.objects = objects
      .filter((object) => Boolean(object.TextEntry))
      .map((object) => ({
        ...object,
        TextEntry: object.TextEntry?.replace(NEWLINE_RETURN_TAB_REGEX, ""),
      }));
  }

  /** Handles performing the main process to parsing and adding an object to the NetX database */
  public async perform() {
    return new Promise(async (resolve) => {
      this.netxClient = await this.netxCon.checkoutClient();

      const currentDate = new Date();
      const formattedObjects = this.objects.map((object) => ({
        objectId: object.ID,
        textEntry: object.TextEntry,
        lastUpdatedAt: currentDate,
      }));

      const textEntryQueryAndValues = QueryHelpers.insertQueryGenerator(
        NetXTables.textEntryStore,
        formattedObjects
      );
      await this.netxClient.query(
        textEntryQueryAndValues.query,
        textEntryQueryAndValues.values
      );

      for (let j = 0; j < formattedObjects.length; j++) {
        const formattedObject = formattedObjects[j];

        try {
          const parsedCollectionPayload = JSON.parse(
            formattedObject.textEntry
          ) as CollectionPayload;
          for (
            let i = 0;
            i < parsedCollectionPayload[OBJECT_RECORD].length;
            i++
          ) {
            // Add the parsed record to the NetX intermediate database
            const objectRecord = parsedCollectionPayload[OBJECT_RECORD][i];
            await this.addObjectRecordToNetX(objectRecord);
          }
        } catch (error) {
          if (error instanceof SyntaxError) {
            Logger.error(
              `Encountered an error parsing the TextEntry JSON. Object ID was "${formattedObject.objectId}"`
            );
          } else {
            Logger.error(
              `Encountered error during addition of object record to NetX Intermediat Database. Object ID was "${formattedObject.objectId}"`,
              error
            );
          }
        }
      }

      // Now that we've finished everything - release the client
      this.netxClient.release();
      resolve("");
    });
  }

  /** Performs the necessary functions in order to prepate and add an object to NetX database */
  private async addObjectRecordToNetX(or: ObjectRecord) {
    const {
      mainInformationObject,
      mediaInformationObject,
      constituentRecordsList,
    } = ObjectHelpers.createObjectsForTables(or);

    // Add the main object record
    const { query: moQuery, values: moValues } =
      QueryHelpers.insertQueryGenerator(tableMainObjectInformation, [
        mainInformationObject,
      ]);
    await this.netxClient.query(moQuery, moValues);

    // Add each constituent record in the list. The constituent record list will not exist
    // for records that are archives records, hence our check for truthyness here
    if (constituentRecordsList) {
      for (let i = 0; i < constituentRecordsList.length; i++) {
        const cr = constituentRecordsList[i];

        // Add the constituent record row
        const { query: crQuery, values: crValues } =
          QueryHelpers.insertQueryGenerator(tableConstituentRecords, [cr]);
        await this.netxClient.query(crQuery, crValues);

        // Add the mapping between the main object and its constituents
        const { query: mapQuery, values: mapValues } =
          QueryHelpers.insertQueryGenerator(tableObjectConstituentMappings, [
            {
              constituentRecordId: cr.constituentID,
              objectId: or.objectId,
            },
          ]);

        try {
          await this.netxClient.query(mapQuery, mapValues);
        } catch (error) {
          Logger.log(`An error occurred performing mapping`, error);
          Logger.debug(mapQuery);
          Logger.debug(mapValues);
        }
      }
    }

    // Add media information record only if the `renditionNumber` exists for the object
    // as both object types `archive` and `media` will now have rendition numbers
    // but only `media` records will have a full-set of media information
    if (mediaInformationObject.renditionNumber) {
      const { query: miQuery, values: miValues } =
        QueryHelpers.insertQueryGenerator(tableMediaInformation, [
          mediaInformationObject,
        ]);
      await this.netxClient.query(miQuery, miValues);
    }
  }
}
