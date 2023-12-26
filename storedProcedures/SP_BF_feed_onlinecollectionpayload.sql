USE [TMS]
GO
/****** Object:  StoredProcedure [dbo].[SP_BF_feed_onlinecollectionpayload]    Script Date: 12/26/2023 10:49:21 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER PROCEDURE [dbo].[SP_BF_feed_onlinecollectionpayload]
AS
BEGIN
	SET NOCOUNT ON;

	CREATE TABLE #temporaryObjectIDs (
		TemporaryObjectID INT
		,RenditionExists BIT
		)

	/**
 The below query inserts objects from the `Objects` table into the temporary table `temporaryObjectIDs`
 Only objects that have media renditions are retrieved by the below query
 */
	INSERT INTO #temporaryObjectIDs
	SELECT DISTINCT O.ObjectID
		,
		-- 1, since these objects do have media renditions
		1
	FROM Objects O
	/* Join the Classifications information */
	INNER JOIN ClassificationXRefs CXR ON O.ObjectID = CXR.Id
	INNER JOIN classifications Cs ON Cs.ClassificationID = CXR.ClassificationId
	/* Join the tables containing Period AND Culture information */
	INNER JOIN ObjContext Oc ON Oc.ObjectID = O.ObjectID
	/* Join the tables containing CopyrightStatus AND CreditLineReproduction information */
	INNER JOIN ObjRights Obr ON obr.OBJECTID = O.ObjectID
	INNER JOIN ObjRightsTypes Ort ON Ort.ObjRightsTypeID = Obr.ObjRightsTypeID
	/* Get the text entries columns. Short Description, Long Description AND Published Provenance */
	LEFT OUTER JOIN TextEntries tes ON tes.id = O.ObjectID
		AND tes.Texttypeid = 48
	LEFT OUTER JOIN TextEntries tel ON tel.id = O.ObjectID
		AND tel.Texttypeid = 49
	LEFT OUTER JOIN TextEntries tep ON tep.id = O.ObjectID
		AND tep.Texttypeid = 55
	/* Get the information for the site, room, home location */
	INNER JOIN objcomponents obc ON o.objectID = obc.ObjectID
	INNER JOIN locations l ON obc.HomeLocationID = l.LocationID
	INNER JOIN MediaXRefs mx ON mx.ID = o.ObjectID
		AND mx.TableID = 108
	/* Photographer */
	INNER JOIN MediaMaster mm ON mx.MediaMasterID = mm.MediaMasterID
	INNER JOIN MediaRenditions mr ON (
			mm.MediaMasterID = mr.MediaMasterID
			AND mm.PrimaryRendID = mr.RenditionID
			)
	LEFT JOIN MediaFiles mf ON (mr.PrimaryFileID = mf.FileID)
	JOIN (
		SELECT const.DisplayName
			,r.ROLE
			,cx.ID
			,cx.RoleTypeID
			,cx.RoleID
		FROM ConXrefs cx
		JOIN Roles r ON (r.RoleID = cx.RoleID)
		JOIN (
			SELECT cts.DisplayName
				,cxd.ConXrefID
				,cxd.UnMasked
			FROM ConAltNames cn
			JOIN Constituents cts ON (cn.ConstituentID = cts.ConstituentID)
			JOIN ConXrefDetails cxd ON (cxd.NameID = cn.AltNameId)
			) const ON (
				cx.ConXrefID = const.ConXrefID
				AND const.UnMasked = 1
				)
		) conxref1 ON (
			mr.RenditionID = conxref1.ID
			AND conxref1.RoleTypeID = 11
			AND conxref1.RoleID = 11
			)
	JOIN (
		SELECT cx1.ID
			,cx1.TableID
		FROM ConXrefs cx1
		JOIN Roles r1 ON (
				r1.RoleID = cx1.RoleID
				AND r1.RoleTypeID = 1
				)
		JOIN (
			SELECT cxd1.ConXrefID
				,cxd1.UnMasked
			FROM ConAltNames cn1
			JOIN Constituents cts1 ON (cn1.ConstituentID = cts1.ConstituentID)
			JOIN ConXrefDetails cxd1 ON (cxd1.NameID = cn1.AltNameId)
			) conx1 ON (
				cx1.ConXrefID = conx1.ConXrefID
				AND conx1.UnMasked = 1
				)
		) constit1 ON (
			constit1.ID = O.ObjectID
			AND constit1.TableID = 108
			);

	----------------------------------------------------------------------------------------------------------------
	----------------------------------------------------------------------------------------------------------------
	----------------------------------------------------------------------------------------------------------------
	----------------------------------------------------------------------------------------------------------------
	/**
 The below query inserts objects from the `Objects` table into the temporary table `temporaryObjectIDs`
 Only Archive objects that have do not have media renditions are retrieved by the below query
 */
	INSERT INTO #temporaryObjectIDs
	SELECT DISTINCT O.ObjectID
		,
		-- 0, since these objects do not have media renditions
		0
	FROM Objects O
	WHERE
		-- This is the DepartmentID that indicates "Archives"
		O.DepartmentID = '23'

	/* This below filter query retrieves those Archives that do not have media renditions. */
	/** Commenting this out as this appears to be filtering out archives that should be included */
	/*
		AND O.ObjectID NOT IN (
			SELECT
				MediaXrefs.ID
			FROM
				MediaXrefs
		);
		*/
	/**
 * Runs the stored procedure `SP_BF_OnlineCollectionPayload` for each TemporaryObjectID in our `temporaryObjectIDs` table
 * which should at this point contain ObjectID's for Media Rendition objects, and Archives
 */
	DECLARE @ObjectID INT;
	DECLARE @RenditionExists BIT;

	DECLARE objectCursor CURSOR
	FOR
	SELECT TemporaryObjectID
		,RenditionExists
	FROM #temporaryObjectIDs

	OPEN objectCursor

	FETCH NEXT
	FROM objectCursor
	INTO @ObjectID
		,@RenditionExists

	WHILE @@FETCH_STATUS = 0
	BEGIN
		IF @RenditionExists = 1
			EXEC [dbo].[SP_BF_OnlineCollectionPayload] @ObjectID
		ELSE
			EXEC [dbo].[SP_BF_OnlineCollectionPayloadArchives] @ObjectID

		FETCH NEXT
		FROM objectCursor
		INTO @ObjectID
			,@RenditionExists
	END

	CLOSE objectCursor;

	DEALLOCATE objectCursor;
END;