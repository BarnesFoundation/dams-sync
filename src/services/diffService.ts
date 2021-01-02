import fs from 'fs';
import { detailedDiff, diff as _diff } from "deep-object-diff";
import { NormalObject } from "../interfaces/queryResponses";
import { NetXTables } from '../constants/netXDatabase'

const emptyDiff = { added: {}, deleted: {}, updated: {} };

/** Class responsible for generating the difference between new data being written to
 * the NetX Intermediate Database, and what currently is in there, for any given record
 */
export default class DiffService {

	/** Directory to write the differential file to */
	private static diffDirectory = 'logs';

	/** List holding the previous state of record data */
	public static previousData: any[] = [];

	/** List holding the new state of record data. I.e. what is replacing the previous data */
	public static diffList: any[] = [];

	/** Performs shallow comparison of the provided objects (i.e. cannot perform comparison of nested objects) */
	public static areEqual(originalObject: NormalObject, newObject: NormalObject): { areEqual: boolean, diff } {

		const diff = detailedDiff(originalObject, newObject);
		const areEqual = (Object.keys(_diff(diff, emptyDiff)).length == 0)
			? true
			: false
			;

		return { areEqual, diff };
	};

	/** Updates the diff list to include the record, the changes made, and the table this record is associated with */
	public static addToDiffList(diff: NormalObject, table: string, primaryId: string | number) {
		DiffService.diffList[table][primaryId] = diff;
	};

	/** Initializes the diff list with the different table names */
	public static initializeDiffList() {

		// If the diff list is empty, populate it with the tbale names
		if (Object.keys(DiffService.diffList).length == 0) {
			Object.entries(NetXTables).forEach((entry) => {

				const [_, tableInformation] = entry;
				DiffService.diffList[`${tableInformation.tableName}`] = {};
			});
		}
	}

	/** Writes the diff list out to disk */
	public static writeToFile(): Promise<void> {

		const diffListOutput = JSON.stringify(Object.assign({}, DiffService.diffList), null, 4);
		const diffFileName = `diff__${(new Date(Date.now()).toISOString())}`;
		const diffFilePath = `${this.diffDirectory}/${diffFileName}`;

		// Create the diff directory if it doesn't exist
		if (!fs.existsSync(this.diffDirectory)) {
			fs.mkdirSync(this.diffDirectory);
		}

		return new Promise<void>((resolve, reject) => {
			fs.writeFile(diffFilePath, diffListOutput, (error) => {
				if (error) {
					console.log(`An error occurred saving the diff file`, error)
					reject();
				}

				else {
					console.log(`The diff file was successfully saved to ${diffFilePath}`);
					resolve();
				}
			});
		});
	};
};