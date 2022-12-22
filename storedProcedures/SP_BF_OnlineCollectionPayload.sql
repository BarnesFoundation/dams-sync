USE [TMS]
GO
	/****** Object:  StoredProcedure [dbo].[SP_BF_OnlineCollectionPayload]    Script Date: 12/19/2022 9:00:56 PM ******/
SET
	ANSI_NULLS ON
GO
SET
	QUOTED_IDENTIFIER ON
GO
	ALTER PROCEDURE [dbo].[SP_BF_OnlineCollectionPayload] @ObjectID nvarchar(max) AS BEGIN;

-- Creates our `tempImage` table
CREATE TABLE #tempImage(
ObjectID int,
ObjectNumber nvarchar(64),
Title nvarchar(450),
Classification nvarchar(64),
OnView smallint,
BeginDate int,
EndDate int,
Dated nvarchar(255),
Period nvarchar(120),
Culture nvarchar(120),
Medium nvarchar(max),
Dimensions nvarchar(max),
ImageCreditLine nvarchar(max),
Marks nvarchar(max),
Inscriptions nvarchar(max),
ExhibitionHistory nvarchar(max),
Bibliography nvarchar(max),
CopyrightStatus nvarchar(48),
CopyrightsTypeID int,
CreditLine nvarchar(max),
copyright nvarchar(max),
ShortDescription nvarchar(max),
LongDescription nvarchar(max),
VisualDescription nvarchar(max),
PublishedProvenance nvarchar(max),
EnsembleIndex nvarchar(max),
PrimaryImageAltText nvarchar(max),
AudioTour nvarchar(max),
Site nvarchar(128),
Room nvarchar(128),
Wall nvarchar(64),
HomeLocation nvarchar(512),
MediaFile nvarchar(450),
MediaView nvarchar(64),
MediaDescription nvarchar(max),
PublicAccess smallint,
ISPrimary smallint,
PhotographerName nvarchar(450),
MediaRole nvarchar(32),
PublicCaption nvarchar(max),
RenditionDate nvarchar(19),
Technique nvarchar(255),
RenditionNumber nvarchar(64)
);

/**
 * SET NOCOUNT ON added to prevent extra result sets FROM
 * interfering with SELECT statements.
 */
SET
	NOCOUNT ON;

INSERT INTO
	#tempImage	
SELECT
	DISTINCT O.ObjectID,
	O.ObjectNumber,
	O.Title,
	Cs.Classification,
	O.OnView,
	O.DateBegin,
	O.DateEnd,
	O.Dated,
	Oc.Period,
	Oc.Culture,
	O.Medium,
	O.Dimensions,
	O.creditLine,
	O.Markings,
	O.Inscribed,
	CASE
		WHEN O.Exhibitions IS NOT NULL then '<p>' + REPLACE(
			O.Exhibitions,
			char(13) + char(10) + char(13) + char(10),
			'</p><p>'
		) + '</p>'
		ELSE O.Exhibitions
	END AS Exhibitions,
	CASE
		WHEN O.bibliography IS NOT NULL then '<p>' + REPLACE(
			O.bibliography,
			char(13) + char(10) + char(13) + char(10),
			'</p><p>'
		) + '</p>'
		ELSE O.bibliography
	END AS bibliography,
	ort.ObjRightsType,
	obr.ObjRightsTypeID,
	obr.CreditLineRepro,
	obr.Copyright,
	tes.TextEntryHTML,
	tel.TextEntryHTML,
	tev.TextEntryHTML,
	tep.TextEntryHTML,
	teei.TextEntryHTML,
	tepiat.TextEntryHTML,
	teat.TextEntryHTML,
	l.site,
	l.Room,
	l.UnitType,
	l.LocationString,
	mf.FileName,
	mm.MediaView,
	mm.Description,
	mm.PublicAccess,
	x.PrimaryDisplay,
	conxref1.DisplayName,
	conxref1.Role,
	mm.PublicCaption,
	mr.RenditionDate,
	mr.Technique,
	mr.RenditionNumber
FROM
	Objects O
	/* Classification */
	INNER JOIN ClassificationXRefs CXR ON O.ObjectID = CXR.Id
	INNER JOIN classifications Cs ON Cs.ClassificationID = CXR.ClassificationId
	/* Period, Culture */
	INNER JOIN ObjContext Oc ON Oc.ObjectID = O.ObjectID
	/* CopyrightStatus, coyrightsstatusid, CreditLineReproduction AND copyright */
	INNER JOIN ObjRights obr ON obr.OBJECTID = O.ObjectID
	INNER JOIN ObjRightsTypes Ort ON Ort.ObjRightsTypeID = Obr.ObjRightsTypeID
	/*text Entries - short description, long description, visual description, published provenance,
	 EnsembleIndex, PrimaryImageAltTxt AND AudioTour */
	LEFT OUTER JOIN TextEntries tes ON tes.id = O.ObjectID
	AND tes.Texttypeid = 48
	LEFT OUTER JOIN TextEntries tel ON tel.id = O.ObjectID
	AND tel.Texttypeid = 49
	LEFT OUTER JOIN TextEntries tev ON tev.id = O.ObjectID
	AND tev.Texttypeid = 50
	LEFT OUTER JOIN TextEntries tep ON tep.id = O.ObjectID
	AND tep.Texttypeid = 55
	LEFT OUTER JOIN TextEntries teei ON teei.id = O.ObjectID
	AND teei.Texttypeid = 57
	LEFT OUTER JOIN TextEntries tepiat ON tepiat.id = O.ObjectID
	AND tepiat.Texttypeid = 54
	LEFT OUTER JOIN TextEntries teat ON teat.id = O.ObjectID
	AND teat.Texttypeid = 32
	/* site, room, wall, homelocation */
	INNER JOIN objcomponents obc ON o.objectID = obc.ObjectID
	INNER JOIN locations l ON obc.HomeLocationID = l.LocationID
	JOIN (
		SELECT
			mx.TableID,
			mx.MediaMasterID,
			conds.ID,
			mx.PrimaryDisplay
		FROM
			condLineItems cli
			JOIN conditions conds ON (conds.ConditionID = cli.ConditionID)
			JOIN mediaxrefs mx ON (
				mx.id = cli.CondLineItemID
				AND mx.tableID = 97
			)
		UNION
		(
			SELECT
				mx.TableID,
				mx.MediaMasterID,
				o.objectID,
				mx.PrimaryDisplay
			FROM
				mediaxrefs mx
				JOIN Objects o ON (
					mx.id = o.ObjectID
					AND mx.tableID = 108
				)
		)
	) x ON x.ID = o.ObjectID
	/* Photographer */
	INNER JOIN MediaMaster mm On x.MediaMasterID = mm.MediaMasterID
	INNER JOIN MediaRenditions mr ON (
		mm.MediaMasterID = mr.MediaMasterID
		AND mm.PrimaryRendID = mr.RenditionID
	)
	left JOIN MediaFiles mf ON (mr.PrimaryFileID = mf.FileID)
	JOIN (
		SELECT
			const.DisplayName,
			r.Role,
			cx.ID,
			cx.RoleTypeID,
			cx.RoleID
		FROM
			ConXrefs cx
			JOIN Roles r ON (r.RoleID = cx.RoleID)
			JOIN (
				SELECT
					cts.DisplayName,
					cxd.ConXrefID,
					cxd.UnMasked
				FROM
					ConAltNames cn
					JOIN Constituents cts ON (
						cn.ConstituentID = cts.ConstituentID
						/*AND cts.Active = 1*/
					)
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
WHERE
	O.ObjectID = @ObjectID;

DECLARE @return_value nvarchar(max)
SET
	@return_value = (
		SELECT
			'{' + '"objectRecord":' + '[' + STUFF(
				(
					SELECT
						+ ',' + '{' + '"objectId":"' + CAST(ObjectID AS nvarchar(max)) + '",' + COALESCE('"objectNumber":"' + ObjectNumber + '",', '') + COALESCE(
							'"title":"' + dbo.fn_String_Escape(
								replace(
									replace(
										Title,
										'\' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','')
        + COALESCE('" classification ":" '+ Classification + ' ",','')
		+ COALESCE('" onView ":" '+ CAST(OnView AS nvarchar(max)) + ' ",','')
        + COALESCE('" beginDate ":" '+ CAST(BeginDate AS nvarchar(max)) + ' ",','')
		+ COALESCE('" endDate ":" '+ CAST(EndDate AS nvarchar(max)) + ' ",','')
		+ COALESCE('" dated ":" ' + Dated + ' ",','')
		+ COALESCE('" period ":" ' + Period + ' ",','')
		+ COALESCE('" culture ":" ' + Culture + ' ",','')
		+ COALESCE('" medium ":" ' + Medium + ' ",','')
		+ COALESCE('" dimensions ":" ' + dbo.fn_String_Escape(replace(replace(Dimensions, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','')
		+ COALESCE('" ImagecreditLine ":" ' + dbo.fn_String_Escape(replace(replace(ImageCreditLine, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','')
		+ COALESCE('" copyrightStatus ":" ' + CopyrightStatus + ' ",','')
		+ COALESCE('" copyrightsTypeID ":" ' + CAST(CopyrightsTypeID AS nvarchar(max)) + ' ",','')
		+ COALESCE('" creditLine ":" ' + dbo.fn_String_Escape(replace(replace(CreditLine, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','')
		+ COALESCE('" copyright ":" ' + dbo.fn_String_Escape(replace(replace(Copyright, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','') 
		+ COALESCE('" site ":" ' + Site + ' ",','')
		+ COALESCE('" room ":" ' + Room + ' ",','')
		+ COALESCE('" wall ":" ' + Wall + ' ",','')
		+ COALESCE('" homeLocation ":" ' + HomeLocation + ' ",','')
		+ COALESCE('" marks ":" ' + dbo.fn_String_Escape(replace(replace(Marks, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','')
		+ COALESCE('" inscriptions ":" ' + dbo.fn_String_Escape(replace(replace(Inscriptions, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','')
		+ COALESCE('" exhibitionHistory ":" ' + dbo.fn_String_Escape(replace(replace(ExhibitionHistory, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','')
		+ COALESCE('" bibliography ":" ' + dbo.fn_String_Escape(replace(replace(Bibliography, ' \ ' , ' \ \ '),CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','') 		
		+ COALESCE('" shortDescription ":" ' + dbo.fn_String_Escape(replace(replace(ShortDescription, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','')
		+ COALESCE('" longDescription ":" ' + dbo.fn_String_Escape(replace(replace(LongDescription, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','')
		+ COALESCE('" visualDescription ":" ' + dbo.fn_String_Escape(replace(replace(VisualDescription, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','')
		+ COALESCE('" publishedProvenance ":" ' + dbo.fn_String_Escape(replace(replace(PublishedProvenance, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','')
		+ COALESCE('" ensembleIndex ":" ' + dbo.fn_String_Escape(replace(replace(EnsembleIndex, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','')
		+ COALESCE('" primaryImageAltText ":" ' + dbo.fn_String_Escape(replace(replace(PrimaryImageAltText, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','')
		+ COALESCE('" audioTour ":" ' + dbo.fn_String_Escape(replace(replace(AudioTour, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','')
        
		+ COALESCE('" mediaName ":" ' + MediaFile + ' ",','')
		+ COALESCE('" mediaView ":" ' + MediaView + ' ",','')
		+ COALESCE('" mediaDescription ":" ' + dbo.fn_String_Escape(replace(replace(MediaDescription, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','')
        + COALESCE('" publicAccess ":" '+CAST(PublicAccess AS nvarchar(max)) + ' ",','')
		+ COALESCE('" isPrimary ":" '+CAST(IsPrimary AS nvarchar(max)) + ' ",','')
		+ COALESCE('" photographerName ":" ' + PhotographerName + ' ",','')
		+ COALESCE('" mediaRole ":" ' + MediaRole + ' ",','')  
		+ COALESCE('" publicCaption ":" ' + dbo.fn_String_Escape(replace(replace(PublicCaption, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','') 
		+ COALESCE('" renditionDate ":" ' + RenditionDate + ' ",','') 
		+ COALESCE('" technique ":" ' + dbo.fn_String_Escape(replace(replace(Technique, ' \ ' , ' \ \ '), CHAR(13)+CHAR(10), ' \ n '), ' json ') + ' ",','') 
		+ COALESCE('" renditionNumber ":" ' + RenditionNumber + ' ",','')
		/* Constituent (Artist) Information */
		+ COALESCE(dbo.fn_ConstitJSON(@ObjectID) + '','' )
		 + '}' 
    FROM #tempImage
    FOR XML PATH(''), TYPE).value('.', 'nvarchar(MAX)'),1,1,'')
    + ']' + '}' 
	 );

	 --SELECT @return_value 

	 CREATE TABLE #tempvar(jsonvalue nvarchar(max));
	 INSERT INTO #tempvar SELECT @return_value;

	  
	 /*Delete Existing rows with TextTypeID 67 */
	 DELETE FROM tms.dbo.TextEntries where TextTypeID = 67 AND ID = @ObjectID;

	 /*Insert into Textentries */    
	 INSERT INTO TextEntries (TableID, ID, TextTypeID, TextStatusID, LoginID, EnteredDate, TextEntryHTML, TextEntry)
	 VALUES (108, @ObjectID, 67, 0, 'dnune', GetDate(), @return_value, @return_value)