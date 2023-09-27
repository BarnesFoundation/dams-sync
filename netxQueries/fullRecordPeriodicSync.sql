-- Query for fetching entire record for an Archive record
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
				WHERE tes."lastUpdatedAt" BETWEEN NOW() - INTERVAL '72 HOURS'
						AND NOW()
				)
		)
ORDER BY tes."lastUpdatedAt" DESC;


-- Query for fetching entire record for a Media record
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
				WHERE tes."lastUpdatedAt" BETWEEN NOW() - INTERVAL '72 HOURS'
						AND NOW()
				)
		)
ORDER BY tes."lastUpdatedAt" DESC;

-- The query as above but with no "objectType" filter
SELECT mi."objectId"
	,mi."renditionNumber"
	,tes."lastUpdatedAt"
FROM media_information mi
INNER JOIN text_entry_store tes ON tes."objectId" = mi."objectId"
WHERE mi."objectId" IN (
		SELECT "objectId"
		FROM main_object_information moi
		WHERE moi."objectId" IN (
				SELECT "objectId"
				FROM text_entry_store tes
				WHERE tes."lastUpdatedAt" BETWEEN NOW() - INTERVAL '72 HOURS'
						AND NOW()
				)
		)
ORDER BY tes."lastUpdatedAt" DESC;


-- The query as above but integrated with the `fullRecordSingleSync` query
-- This one is meant to be used by NetX
SELECT *
FROM media_information
INNER JOIN main_object_information ON media_information."objectId" = main_object_information."objectId"
CROSS JOIN LATERAL(SELECT STRING_AGG("constituentName"::TEXT, '; ') AS "constituentName", STRING_AGG("fullConstituent"::TEXT, '; ') AS "fullConstituent", STRING_AGG("fullConstituentAndRole"::TEXT, '; ') AS 
		"fullConstituentAndRole" FROM constituent_records INNER JOIN object_constituent_mappings ON constituent_records."constituentID" = object_constituent_mappings."constituentRecordId" WHERE 
		object_constituent_mappings."objectId" = main_object_information."objectId") "constituentInfo"
WHERE "renditionNumber" IN (
		SELECT mi."renditionNumber"
		FROM media_information mi
		INNER JOIN text_entry_store tes ON tes."objectId" = mi."objectId"
		WHERE mi."objectId" IN (
				SELECT "objectId"
				FROM main_object_information moi
				WHERE moi."objectId" IN (
						SELECT "objectId"
						FROM text_entry_store tes
						WHERE tes."lastUpdatedAt" BETWEEN NOW() - INTERVAL '72 HOURS'
								AND NOW()
						)
				)
		ORDER BY tes."lastUpdatedAt" DESC
		);