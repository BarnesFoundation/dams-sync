export interface TablesInformation {
	mainObjectInformation: TableInformation,
	constituentRecords: TableInformation,
	objectConstituentMappings: TableInformation
}

export interface TableInformation {
	tableName: string,
	columns: ColumnInformation[],
}

interface ColumnInformation {
	name: string,
	type: 'VARCHAR' | 'INTEGER',
	primary?: true,
	foreign?: true
}