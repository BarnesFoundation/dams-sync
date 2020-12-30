

/** Class responsible for generating the difference between new data being written to
 * the NetX Intermediate Database, and what currently is in there, for any given record
 */
export class DiffService {

	/** List holding the previous state of record data */
	public static previousData: any[] = [];

	/** List holding the new state of record data. I.e. what is replacing the previous data */
	public static newData: any[] = [];

	
};