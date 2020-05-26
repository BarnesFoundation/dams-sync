/** These are the queries NetX can use to query the intermediate database in order to build the record in the DAMS */

// For retrieving a fully populated record with the needed object fields and media information -- NOT INCLUDING CONSTITUENTS
const fullRecord = `
SELECT *
FROM media_information
INNER JOIN main_object_information ON media_information."objectId" = main_object_information."objectId"
WHERE "renditionNumber" = '91-22-42_i1'
`;

// For retrieiving all of the constituents associated with a rendition number/object id
const constituentsForFullRecord = `
SELECT * 
FROM constituent_records
INNER JOIN object_constituent_mappings ON constituent_records."constituentID" = object_constituent_mappings."constituentRecordId"
WHERE object_constituent_mappings."objectId" = 
	(
		SELECT "objectId"
		FROM media_information
		WHERE "renditionNumber" = '91-22-42_i1'
	)
`;