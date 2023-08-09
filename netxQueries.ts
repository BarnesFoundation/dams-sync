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
	INNER JOIN object_constituent_mappings 
	ON constituent_records."constituentID" = object_constituent_mappings."constituentRecordId"
	WHERE object_constituent_mappings."objectId" = 
	(
		SELECT "objectId"
		FROM media_information
		WHERE "renditionNumber" = '01-27-02_i1r'
	)
) "constituentInfo"
WHERE "renditionNumber" = '01-27-02_i1r'
`;

// For retrieving all archive records modified in the past 24-hours
const archivesInLastHours = 
`
SELECT mi."objectId"
	,mi."renditionNumber"
	,tes."lastUpdatedAt"
FROM media_information mi
INNER JOIN text_entry_store tes ON tes."objectId" = mi."objectId"
WHERE mi."objectId" IN (
		SELECT "objectId"
		FROM main_object_information moi
		WHERE moi."objectType" = 'archive'
			AND moi."objectId" IN (
				SELECT "objectId"
				FROM text_entry_store tes
				WHERE tes."lastUpdatedAt" BETWEEN NOW() - INTERVAL '24 HOURS'
						AND NOW()
				)
		)
ORDER BY tes."lastUpdatedAt" DESC
`;

// For retrieving all archive records modified in the past 24-hours
const mediaInLastHours = 
`
SELECT mi."objectId"
	,mi."renditionNumber"
	,tes."lastUpdatedAt"
FROM media_information mi
INNER JOIN text_entry_store tes ON tes."objectId" = mi."objectId"
WHERE mi."objectId" IN (
		SELECT "objectId"
		FROM main_object_information moi
		WHERE moi."objectType" = 'media'
			AND moi."objectId" IN (
				SELECT "objectId"
				FROM text_entry_store tes
				WHERE tes."lastUpdatedAt" BETWEEN NOW() - INTERVAL '24 HOURS'
						AND NOW()
				)
		)
ORDER BY tes."lastUpdatedAt" DESC
`;