import { ObjectRecord } from '../interfaces/queryResponses';
import { TableInformation } from '../interfaces/netXDatabaseInterfaces';



/** Generates the constituentName, fullConstituent, and fullConstituentAndRole fields as these are fields made from several individual fields.
  * Adds these generated fields to each constituent record in the constituents records list
*/
const generateConstituentCalculatedFields = (constituentRecords: ObjectRecord['ConstituentRecord']) => {

	constituentRecords.forEach((cr) => {

		const { firstName, lastName, prefix, suffix, nationality, beginDate, endDate, role } = cr;

		let constituentName = '';
		let fullConstituent = '';


		if (prefix) fullConstituent += `${prefix} `;

		if (firstName) {
			constituentName += `${firstName} `;
			fullConstituent += `${firstName} `;
		}

		if (lastName) {
			constituentName += `${lastName} `;
			fullConstituent += `${lastName} `;
		}

		if (suffix) fullConstituent += `${suffix} `;
		if (nationality) fullConstituent += `${nationality} `;
		if (beginDate) fullConstituent += `${beginDate} `;
		if (endDate) fullConstituent += `${endDate}`;

		let fullConstituentAndRole = `${fullConstituent} ${role}`;

		cr['constituentName'] = constituentName;
		cr['fullConstituent'] = fullConstituent;
		cr['fullConstituentAndRole'] = fullConstituentAndRole
	});

	return constituentRecords;
};

/** Generates the caption for a main object record. The caption is a field made by combining several other fields, including the list of related constituents */
const generateCaptionForMainObject = (mainInformationObject: { [key: string]: string }, constituentRecords: ObjectRecord['ConstituentRecord']): string => {

	// Get the needed fields from the main object
	const { title, dated, medium, objectNumber, creditLine } = mainInformationObject;

	// Get the needed fields from the constituent records
	const crInformation = constituentRecords.map((cr) => {
		const { firstName, lastName } = cr;
		return { firstName, lastName };
	});

	let captionString = '';

	// Cascade all the way down adding fields in order
	crInformation.forEach((cr) => {

		if (cr.firstName) captionString += `${cr.firstName}`;
		if (cr.lastName) captionString += `${cr.lastName}. `;
	});

	if (title) captionString += `${title}, `;
	if (dated) captionString += `${dated}, `;
	if (medium) captionString += `${medium}.`

	captionString += 'The Barnes Foundation, ';

	if (objectNumber) captionString += `${objectNumber}. `;
	if (creditLine) captionString += `${creditLine}`;

	return captionString;
};

/** Generates the query for inserting a record along with the values to be inserted */
const insertQueryGenerator = (table: TableInformation, object: { [key: string]: any }) => {

	const { tableName } = table;
	const columnNamesToInsert = [];
	const values = [];

	if (!object) {
		console.log(tableName, object);
	}

	for (let [fieldName, fieldValue] of Object.entries(object)) {
		columnNamesToInsert.push(`"${fieldName}"`);
		values.push(fieldValue);
	}

	// Once we've gone through all the field names - we can build our insert query
	const columnString = columnNamesToInsert.join();
	const valuesPlaceholder = values.map((_, index) => `$${index + 1}`).join();

	const onConflictCommand = generateOnConflictCommand(table, columnNamesToInsert);

	// Build our query for this row
	const query = `
	INSERT INTO ${tableName} (${columnString})
	VALUES (${valuesPlaceholder})
	${onConflictCommand}
	`;

	return { query, values };
};

const generateOnConflictCommand = (table: TableInformation, columnNamesToInsert: string[]): string => {

	// Get the primary key columns as these are how we'l know a conflict occurs
	const primaryColumns = table.columns.filter((column) => column.primary == true).map((column) => `"${column.name}"`);
	const constraintString = `(${primaryColumns.join()})`;

	// Generate the columns to set string
	const setList = columnNamesToInsert.reduce((acc, column) => {

		// Check if this column is a primary column
		const isColumnPrimary = primaryColumns.some((pc) => pc === column);

		// We only want to set columns that are NOT the primary column(s)
		if (!isColumnPrimary) { acc.push(`${column} = EXCLUDED.${column}\n`); }

		return acc;

	}, []);

	// When there are columns to set -- we'll update. Otherwise, if we have no columns to set 
	// then it's only the primary key columns that would be updated, do nothing because we don't want to override our primary id's
	const setString =  (setList.length > 0) ? `DO UPDATE SET ${setList.join()}` : 'DO NOTHING'

	const onConflictString = `
	ON CONFLICT ${constraintString}
	${setString}
	`;

	return onConflictString;
};


const ObjectHelpers = {
	generateCaptionForMainObject,
	generateConstituentCalculatedFields,
	insertQueryGenerator
};

export default ObjectHelpers;