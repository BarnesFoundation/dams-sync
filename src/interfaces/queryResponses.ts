export interface ObjectID {
	ID: number
};

export interface CollectionPayloadTextEntry {
	TextEntry: string
};

export interface CollectionPayload {
	ObjectRecord: ObjectRecord[]
}

export type ObjectRecord = NormalObject & { ConstituentRecord?: NormalObject[] };

export interface NormalObject {
	[key: string]: string | number,
}