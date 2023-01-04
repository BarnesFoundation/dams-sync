import { ObjectRecord } from '../interfaces/queryResponses';
import { NetXTables } from '../constants/netXDatabase';
import FieldHelpers from '../constants/fieldHelpers';
import { CONSTITUENT_RECORD } from '../constants/names';


interface ObjectsForTables {
	mainInformationObject: { [key: string]: any },
	mediaInformationObject: { [key: string]: any },
	constituentRecordsList: { [key: string]: any }[]
}

/** Takes an object record returns the needed object records for each table  */
const createObjectsForTables = (or: ObjectRecord): ObjectsForTables => {

	let { mainInformationObject, constituentRecordsList, mediaInformationObject } = parseRecordToObjects(or);

	// Now that we've created each needed object -- the objects require some calculated fields
	mainInformationObject['caption'] = FieldHelpers.generateCaptionForMainObject(mainInformationObject, constituentRecordsList);

	// Add the calculated fields for constituent records
	constituentRecordsList = FieldHelpers.generateConstituentCalculatedFields(constituentRecordsList);

	return { mainInformationObject, constituentRecordsList, mediaInformationObject };
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
	let constituentRecordsList: ObjectRecord['ConstituentRecord'];

	// Get the field names and values -- i.e. the eventual column names, and values for this object
	for (let [fieldName, fieldValue] of Object.entries(or)) {

		// Check if the current field is needed in the main object/media information objects
		const fieldNeededInMainObject = NetXTables.mainObjectInformation.columns.some((column) => column.name === fieldName);
		const fieldNeededInMediaInformationObject = NetXTables.mediaInformation.columns.some((column) => column.name === fieldName);

		if (fieldNeededInMainObject) {
			mainInformationObject[fieldName] = fieldValue;
		}

		if (fieldNeededInMediaInformationObject) {
			mediaInformationObject[fieldName] = fieldValue;
		}

		// If this is the constituent records field, we know we need it right off the bat. We call a function that iterates through the list and
		// returns to us the normalized objects needed for insertion to the database
		if (fieldName === CONSTITUENT_RECORD) {
			constituentRecordsList = createListOfConstituentRecordObjects(or.ConstituentRecord)
		}
	}

	return {
		mainInformationObject,
		constituentRecordsList, 
		mediaInformationObject,
	};
};

/** Takes the list of constituent records and transforms them by trimming out any unneeded fields that were included in the object */
const createListOfConstituentRecordObjects = (constituentRecords: ObjectRecord['ConstituentRecord']): {}[] => {
	return constituentRecords.map((cr) => {

		// Create the empty constituent record object
		const constituentRecordObject = {};

		// Check if the current field name is needed in the constituent record object
		for (let [key, value] of Object.entries(cr)) {
			const fieldNameNeededInCR = NetXTables.constituentRecords.columns.some((column) => column.name === key);

			// If it is, add it
			if (fieldNameNeededInCR) {
				constituentRecordObject[key] = value;
			}
		}

		return constituentRecordObject;
	});
};

const ObjectHelpers = {
	createObjectsForTables
};

export default ObjectHelpers;