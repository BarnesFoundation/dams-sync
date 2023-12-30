import { ObjectRecord } from "../interfaces/queryResponses";
import { NetXTables } from "../constants/netXDatabase";
import FieldHelpers from "../constants/fieldHelpers";
import { CONSTITUENT_RECORD } from "../constants/names";

interface ObjectsForTables {
  mainInformationObject: { [key: string]: any };
  mediaInformationObject: { [key: string]: any };
  constituentRecordsList: { [key: string]: any }[];
}

export const ARCHIVE_TYPE = "archive";
export const MEDIA_TYPE = "media";

/** Takes an object record returns the needed object records for each table  */
const createObjectsForTables = (or: ObjectRecord): ObjectsForTables => {
  let {
    mainInformationObject,
    constituentRecordsList,
    mediaInformationObject,
  } = parseRecordToObjects(or);

  // Now that we've created each needed object -- the objects require some calculated fields
  if (constituentRecordsList) {
    mainInformationObject["caption"] =
      FieldHelpers.generateCaptionForMainObject(
        mainInformationObject,
        constituentRecordsList
      );
    constituentRecordsList = FieldHelpers.generateConstituentCalculatedFields(
      constituentRecordsList
    );
  }

  return {
    mainInformationObject,
    constituentRecordsList,
    mediaInformationObject,
  };
};

/** Parses the Object Record payload into individual records needed by the
 * - main_object_information
 * - constituent_records
 * - media_information
 * tables
 * */
const parseRecordToObjects = (or: ObjectRecord): ObjectsForTables => {
  const mainInformationObject = {};
  const mediaInformationObject = {};
  let constituentRecordsList: ObjectRecord["ConstituentRecord"];

  // Existence of the `renditionNumber` in the object record determines if this is a media or archive type
  const determinedObjectType = or.hasOwnProperty("renditionNumber")
    ? MEDIA_TYPE
    : ARCHIVE_TYPE;

  // Get the field names and values -- i.e. the eventual column names, and values for this object
  for (let [fieldName, fieldValue] of Object.entries(or)) {
    // Check if the current field is needed in the main object/media information objects
    const fieldNeededInMainObject =
      NetXTables.mainObjectInformation.columns.some(
        (column) => column.name === fieldName
      );
    const fieldNeededInMediaInformationObject =
      NetXTables.mediaInformation.columns.some(
        (column) => column.name === fieldName
      );

    if (fieldNeededInMainObject) {
      mainInformationObject[fieldName] = fieldValue;
    }

    if (fieldNeededInMediaInformationObject) {
      mediaInformationObject[fieldName] = fieldValue;
    }

    // If this is the constituent records field, we know we need it right off the bat.
    // We call a function that iterates through the list and returns to us the normalized objects needed for insertion to the database
    if (fieldName === CONSTITUENT_RECORD) {
      constituentRecordsList = createListOfConstituentRecordObjects(
        or.ConstituentRecord
      );
    }
  }

  // We need to store the determined object type for this record and
  // if it's an `archive` type, we'll give it a simulated rendition number using the object number
  mainInformationObject["objectType"] = determinedObjectType;
  if (determinedObjectType === ARCHIVE_TYPE) {
    mediaInformationObject["renditionNumber"] = formatPSV(
      mainInformationObject["objectNumber"]
    );
  }

  return {
    mainInformationObject,
    constituentRecordsList,
    mediaInformationObject,
  };
};

/** Takes the list of constituent records and transforms them by trimming out any unneeded fields that were included in the object */
const createListOfConstituentRecordObjects = (
  constituentRecords: ObjectRecord["ConstituentRecord"]
): {}[] => {
  return constituentRecords.map((cr) => {
    // Create the empty constituent record object
    const constituentRecordObject = {};

    // Check if the current field name is needed in the constituent record object
    for (let [key, value] of Object.entries(cr)) {
      const fieldNameNeededInCR = NetXTables.constituentRecords.columns.some(
        (column) => column.name === key
      );

      // If it is, add it
      if (fieldNameNeededInCR) {
        constituentRecordObject[key] = value;
      }
    }

    return constituentRecordObject;
  });
};

/** Formats a period-separated value by replacing those periods with dashes */
const formatPSV = (value: string) => {
  const formatted = value.replace(/\./g, "-");
  return formatted;
};

const ObjectHelpers = {
  createObjectsForTables,
};

export default ObjectHelpers;
