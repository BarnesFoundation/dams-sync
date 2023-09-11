import { TableInformation } from '../interfaces/netXDatabaseInterfaces';
import { Logger } from '../logger';

/** Generates the query for inserting a record along with the values to be inserted */
const insertQueryGenerator = (table: TableInformation, objects: Array<{ [key: string]: any }>) => {
	if (!objects || objects.length == 0) {
		Logger.debug(`No objects provided for insertion to table "${table.tableName}"`, objects.join());
	}

	const usableObject = objects[0];
	const columnNamesToInsert = Object.keys(usableObject).map((fieldName) => {
		return `"${fieldName}"`;
	});
	const valuesToInsert = flatten(objects.map((object) => {
		return Object.values(object).map((fieldValue) => fieldValue)
	}));

	// Once we've gone through all the field names - we can build our insert query
	const columnString = columnNamesToInsert.join();
	const valuesPlaceholder = expand(objects.length, columnNamesToInsert.length)
	const onConflictCommand = generateOnConflictCommand(table, columnNamesToInsert);

	// Build our query for this row
	const query = `
	INSERT INTO ${table.tableName} (${columnString})
	VALUES ${valuesPlaceholder}
	${onConflictCommand}
	`;

	return { query, values: valuesToInsert };
};

/** Generates the ON CONFLICT cluase of the insert query. This is crucial for records that 
 * already exist in the database to be updated with new information during subsequent runs.
 */
const generateOnConflictCommand = (table: TableInformation, columnNamesToInsert: string[]): string => {

	// Get the primary key columns as these are how we'll know a conflict occurs
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
	const setString = (setList.length > 0) ? `DO UPDATE SET ${setList.join()}` : 'DO NOTHING'

	const onConflictString = `
	ON CONFLICT ${constraintString}
	${setString}
	`;

	return onConflictString;
};


const QueryHelpers = {
	insertQueryGenerator
};

function expand(rowCount: number, columnCount: number, startAt = 1) {
	let index = startAt;
	return Array(rowCount).fill(0).map(v => `(${Array(columnCount).fill(0).map(v => `$${index++}`).join(", ")})`).join(", ")
}

function flatten<T>(arrayToFlatten: T[][]) {
	const flattenedArray: T[] = []

	arrayToFlatten.forEach(v => v.forEach((p: any) => flattenedArray.push(p)))
	return flattenedArray
}

export default QueryHelpers;