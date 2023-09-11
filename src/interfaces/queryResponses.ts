export interface ObjectID {
	ID: number
};

export interface CollectionPayloadTextEntry {
	ID: number,
	TextEntry?: string,
};

export interface CollectionPayload {
	ObjectRecord: ObjectRecord[]
}

export type ObjectRecord = NormalObject & { ConstituentRecord?: NormalObject[] };

export interface NormalObject {
	[key: string]: string | number,
}

export interface StoredTextEntry {
	objectId: number,
	textEntry: string,
}