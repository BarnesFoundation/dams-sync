SELECT *
FROM media_information
INNER JOIN main_object_information ON media_information."objectId" = main_object_information."objectId"
CROSS JOIN (
	SELECT STRING_AGG("constituentName"::TEXT, '; ') AS "constituentName"
		,STRING_AGG("fullConstituent"::TEXT, '; ') AS "fullConstituent"
		,STRING_AGG("fullConstituentAndRole"::TEXT, '; ') AS "fullConstituentAndRole"
	FROM constituent_records
	INNER JOIN object_constituent_mappings ON constituent_records."constituentID" = object_constituent_mappings."constituentRecordId"
	WHERE object_constituent_mappings."objectId" = (
			SELECT "objectId"
			FROM media_information
			WHERE "renditionNumber" = ‘ < specified_rendition_number > ’
			)
	) "constituentInfo"
WHERE "renditionNumber" = '<specified_rendition_number>';