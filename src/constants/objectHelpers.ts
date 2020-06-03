import { ObjectRecord } from '../interfaces/queryResponses';
import { NetXTables } from '../constants/netXDatabase';
import FieldHelpers from '../constants/fieldHelpers';
import { CONSTITUENT_RECORD } from '../constants/names';



/** Takes an object record and parses it into the objects needed by the 
	 * - main_object_information
	 * - constituent_records
	 * - media_information
	 *  tables and returns them  */
const createObjectsForTables = (or: ObjectRecord) => {

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

		// If this is the constituent records field, we know we need it right off the bat
		if (fieldName === CONSTITUENT_RECORD) {
			constituentRecordsList = or.ConstituentRecord.map((cr) => {
				const constituentRecordObject = {};

				// Check if the current field name is needed in the constituent record object
				for (let [key, value] of Object.entries(cr)) {
					const fieldNameNeededInCR = NetXTables.constituentRecords.columns.some((column) => column.name === key);

					if (fieldNameNeededInCR) {
						constituentRecordObject[key] = value;
					}
				}

				return constituentRecordObject;
			});
		}
	}

	// Now that we've created each needed object -- the objects require some calculated fields
	mainInformationObject['caption'] = FieldHelpers.generateCaptionForMainObject(mainInformationObject, constituentRecordsList);

	// Add the calculated fields for constituent records
	constituentRecordsList = FieldHelpers.generateConstituentCalculatedFields(constituentRecordsList);

	return { mainInformationObject, constituentRecordsList, mediaInformationObject };
}

const ObjectHelpers = {
	createObjectsForTables
};

export default ObjectHelpers;