export interface TablesInformation {
	mainObjectInformation: TableInformation,
	constituentRecords: TableInformation,
	objectConstituentMappings: TableInformation,
	mediaInformation: TableInformation,
	textEntryStore: TableInformation
}

export interface TableInformation {
	tableName: string,
	columns: ColumnInformation[],
	calculatedFields?: {
		[key: string]: CalculatedField
	}
}

interface ColumnInformation {
	name: string,
	type: 'VARCHAR' | 'INTEGER' | 'SERIAL' | 'TIMESTAMP',
	primary?: true,
	foreign?: true
}

interface CalculatedField {
	name: string,
	neededFields: {
		table: string,
		columns: string[]
	}[]
}