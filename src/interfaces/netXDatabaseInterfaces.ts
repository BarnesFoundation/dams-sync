export interface TablesInformation {
	mainObjectInformation: TableInformation,
	constituentRecords: TableInformation,
	objectConstituentMappings: TableInformation
}

export interface TableInformation {
	tableName: string,
	primaryKeyColumns?: ColumnInformation[],
	foreignKeyColumns?: ColumnInformation[]
}

interface ColumnInformation {
	name: string,
	type: 'VARCHAR' | 'INTEGER'
}