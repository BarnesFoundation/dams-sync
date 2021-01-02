import { TableInformation } from '../interfaces/netXDatabaseInterfaces';
import { NormalObject } from '../interfaces/queryResponses';

export interface QueryPayload {
	query: string,
	values: (string | number)[],
	selectQuery: string,
}

/** Generates the query for inserting a record along with the values to be inserted */
const insertQueryGenerator = (table: TableInformation, object: NormalObject): QueryPayload => {

	const { tableName } = table;
	const columnNamesToInsert = Object.keys(object).map((columnName) => `"${columnName}"`);
	const values = Object.values(object);

	// Generate the conflict command
	const onConflictCommand = generateOnConflictCommand(table, columnNamesToInsert);

	// Generate the column string and placeholder
	const columnString = columnNamesToInsert.join();
	const valuesPlaceholder = values.map((_, index) => `$${index + 1}`).join();

	// Build our insert query for this object
	const query = `
	INSERT INTO ${tableName} (${columnString})
	VALUES (${valuesPlaceholder})
	${onConflictCommand}
	`;

	// Generate the primary column condition so we can locate this object
	const whereCondition = table.columns
		.filter((column) => column.primary == true)
		.reduce((acc, column, index) => {

			// If there was more than 1 column, we'll need to append "AND" for additional conditionals
			if (index > 0) {
				acc += 'AND ';
			}

			acc += `"${column.name}" = '${object[column.name]}'`

			return acc;
		}, '');

	// Build our select query for this object
	const selectQuery = `
	SELECT ${columnString}
	FROM "${tableName}"
	WHERE ${whereCondition}

	`;

	return { query, values, selectQuery };
};

/** Generates the ON CONFLICT cluase of the insert query. This is crucial for records that already exist in the database to be updated with
 * new information during future runs.
 */
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

export default QueryHelpers;