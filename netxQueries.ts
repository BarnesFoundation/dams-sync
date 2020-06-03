/** These are the queries NetX can use to query the intermediate database in order to build the record in the DAMS 
 * Not used by any of our code within src/. 
*/

// For retrieving a fully populated record with the needed object fields and media information -- INCLUDING CONSTITUENTS
const fullRecord = `
SELECT *
FROM media_information
INNER JOIN main_object_information 
ON media_information."objectId" = main_object_information."objectId"
CROSS JOIN (
	SELECT 
	STRING_AGG("constituentName"::text,'; ') as "constituentName", 
	STRING_AGG("fullConstituent"::text,'; ') as "fullConstituent",
	STRING_AGG("fullConstituentAndRole"::text,'; ') as "fullConstituentAndRole"
	FROM constituent_records
	INNER JOIN object_constituent_mappings ON constituent_records."constituentID" = object_constituent_mappings."constituentRecordId"
	WHERE object_constituent_mappings."objectId" = 
	(
		SELECT "objectId"
		FROM media_information
		WHERE "renditionNumber" = '01-27-02_i1r'
	)
) "constituentInfo"
WHERE "renditionNumber" = '01-27-02_i1r'
`;