USE [TMS]
GO
/****** Object:  StoredProcedure [dbo].[SP_BF_OnlineCollectionPayload]    Script Date: 12/19/2022 9:00:56 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO




-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
ALTER PROCEDURE [dbo].[SP_BF_OnlineCollectionPayload] 
	-- Add the parameters for the stored procedure here
	   @ObjectID nvarchar(max) 
AS
BEGIN

create table #tempImage(ObjectID int, ObjectNumber nvarchar(64), Title nvarchar(450), Classification nvarchar(64),
 OnView smallint, BeginDate int, EndDate int, Dated nvarchar(255), Period nvarchar(120), Culture nvarchar(120), 
 Medium nvarchar(max), Dimensions nvarchar(max) , ImageCreditLine nvarchar(max), Marks nvarchar(max), Inscriptions nvarchar(max), 
 ExhibitionHistory nvarchar(max), Bibliography nvarchar(max), CopyrightStatus nvarchar(48), CopyrightsTypeID int,
 CreditLine nvarchar(max), copyright nvarchar(max), ShortDescription nvarchar(max), 
 LongDescription nvarchar(max), VisualDescription nvarchar(max), PublishedProvenance nvarchar(max), 
 EnsembleIndex nvarchar(max), PrimaryImageAltText nvarchar(max), AudioTour nvarchar(max), Site nvarchar(128), 
 Room nvarchar(128), Wall nvarchar(64), HomeLocation nvarchar(512), MediaFile nvarchar(450), MediaView nvarchar(64),
 MediaDescription nvarchar(max), PublicAccess smallint, ISPrimary smallint, PhotographerName nvarchar(450),MediaRole nvarchar(32), 
 PublicCaption nvarchar(max),RenditionDate nvarchar(19), Technique nvarchar(255), RenditionNumber nvarchar(64) ) 
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON;
    -- Insert statements for procedure here
	insert into #tempImage	SELECT distinct
	O.ObjectID, O.ObjectNumber, O.Title, Cs.Classification, O.OnView, O.DateBegin, O.DateEnd, O.Dated, Oc.Period, Oc.Culture, 
	O.Medium, O.Dimensions, O.creditLine, O.Markings, O.Inscribed, 
	case  when O.Exhibitions IS NOT NULL
	        then '<p>' + REPLACE(O.Exhibitions,char(13)+char(10)+char(13)+char(10),'</p><p>') + '</p>'
	        else O.Exhibitions end as Exhibitions,
	case  when O.bibliography IS NOT NULL
	        then '<p>' + REPLACE(O.bibliography,char(13)+char(10)+char(13)+char(10),'</p><p>') + '</p>'
	        else O.bibliography end as bibliography, 
	ort.ObjRightsType, obr.ObjRightsTypeID , obr.CreditLineRepro, obr.Copyright,
	tes.TextEntryHTML, tel.TextEntryHTML, tev.TextEntryHTML, tep.TextEntryHTML, teei.TextEntryHTML, tepiat.TextEntryHTML, 
	teat.TextEntryHTML, l.site, l.Room, l.UnitType, l.LocationString, mf.FileName , mm.MediaView, mm.Description, mm.PublicAccess,
	x.PrimaryDisplay, conxref1.DisplayName, conxref1.Role, mm.PublicCaption, mr.RenditionDate, mr.Technique, mr.RenditionNumber
	from Objects O 
	/* Classification */
	INNER JOIN ClassificationXRefs CXR ON O.ObjectID = CXR.Id
    INNER JOIN classifications Cs ON Cs.ClassificationID = CXR.ClassificationId
	/* Period, Culture */
	INNER JOIN ObjContext Oc ON Oc.ObjectID = O.ObjectID
	/* CopyrightStatus, coyrightsstatusid, CreditLineReproduction and copyright */
	INNER JOIN ObjRights obr ON obr.OBJECTID = O.ObjectID
	INNER JOIN ObjRightsTypes Ort on Ort.ObjRightsTypeID = Obr.ObjRightsTypeID
	/*text Entries - short description, long description, visual description, published provenance,
	EnsembleIndex, PrimaryImageAltTxt and AudioTour */
	LEFT OUTER JOIN TextEntries tes on tes.id = O.ObjectID and tes.Texttypeid = 48
	LEFT OUTER JOIN TextEntries tel on tel.id = O.ObjectID and tel.Texttypeid = 49
	LEFT OUTER JOIN TextEntries tev on tev.id = O.ObjectID and tev.Texttypeid = 50
	LEFT OUTER JOIN TextEntries tep on tep.id = O.ObjectID and tep.Texttypeid = 55 
	LEFT OUTER JOIN TextEntries teei on teei.id = O.ObjectID and teei.Texttypeid = 57 
	LEFT OUTER JOIN TextEntries tepiat on tepiat.id = O.ObjectID and tepiat.Texttypeid = 54 
	LEFT OUTER JOIN TextEntries teat on teat.id = O.ObjectID and teat.Texttypeid = 32 
	/* site, room, wall, homelocation */
	INNER JOIN objcomponents obc on o.objectID = obc.ObjectID 	 
    INNER JOIN locations l on obc.HomeLocationID  = l.LocationID
	
	 join 
	 (select mx.TableID, mx.MediaMasterID, conds.ID, mx.PrimaryDisplay from condLineItems cli 
	 join conditions conds on (conds.ConditionID = cli.ConditionID)
	 join mediaxrefs mx on (mx.id = cli.CondLineItemID and mx.tableID = 97)
	 union 
	 (select mx.TableID, mx.MediaMasterID, o.objectID, mx.PrimaryDisplay from mediaxrefs mx  join Objects o on (mx.id = o.ObjectID and mx.tableID = 108) ))x
  on x.ID = o.ObjectID

	/* Photographer */	
INNER JOIN MediaMaster mm On x.MediaMasterID = mm.MediaMasterID 
INNER JOIN MediaRenditions mr ON (mm.MediaMasterID = mr.MediaMasterID and mm.PrimaryRendID = mr.RenditionID )
left join MediaFiles mf ON (mr.PrimaryFileID = mf.FileID)
join (select const.DisplayName,r.Role, cx.ID,cx.RoleTypeID,cx.RoleID  from ConXrefs cx join Roles r on (r.RoleID = cx.RoleID)
                
				join (select cts.DisplayName, cxd.ConXrefID, cxd.UnMasked  from ConAltNames cn
                join Constituents cts on (cn.ConstituentID = cts.ConstituentID /*and cts.Active = 1*/)
        join ConXrefDetails cxd ON (cxd.NameID = cn.AltNameId))const

        ON (cx.ConXrefID = const.ConXrefID and const.UnMasked = 1))conxref1
        ON (mr.RenditionID = conxref1.ID and conxref1.RoleTypeID = 11 and conxref1.RoleID = 11) 

		WHERE O.ObjectID = @ObjectID 
	
	

	
	/*INNER JOIN MediaXRefs mx On mx.ID = o.ObjectID And mx.TableID = 108 /*and Mx.PrimaryDisplay = 1*/
	/* Photographer */	
    INNER JOIN MediaMaster mm On Mx.MediaMasterID = mm.MediaMasterID 
INNER JOIN MediaRenditions mr ON mm.MediaMasterID = mr.MediaMasterID
INNER JOIN ConXrefs cx ON  mr.RenditionID = cx.ID and cx.RoleTypeID = 11 and cx.RoleID = 11
INNER JOIN MediaFiles mf ON mr.PrimaryFileID = mf.FileID
INNER JOIN Roles r on r.RoleID = cx.RoleID
INNER JOIN ConXrefDetails cxd ON cx.ConXrefID = cxd.ConXrefID and cxd.UnMasked = 1
INNER JOIN ConAltNames cn ON cxd.NameID = cn.AltNameId
INNER JOIN Constituents cts ON cn.ConstituentID = cts.ConstituentID and cts.Active = 1 
	 WHERE O.ObjectID = @ObjectID */
	 /* Select * from #tempImage */

	DECLARE	@return_value nvarchar(max)

  Set @return_value = (SELECT  '{' + '"objectRecord":' + '[' + STUFF((
    SELECT
        
        + ',' + '{'
        + '"objectId":"'+CAST(ObjectID AS nvarchar(max)) + '",'
        + COALESCE('"objectNumber":"' + ObjectNumber + '",','')
        + COALESCE('"title":"' + dbo.fn_String_Escape(replace(replace(Title, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','')
        + COALESCE('"classification":"'+ Classification + '",','')
		+ COALESCE('"onView":"'+ CAST(OnView AS nvarchar(max)) + '",','')
        + COALESCE('"beginDate":"'+ CAST(BeginDate AS nvarchar(max)) + '",','')
		+ COALESCE('"endDate":"'+ CAST(EndDate AS nvarchar(max)) + '",','')
		+ COALESCE('"dated":"' + Dated + '",','')
		+ COALESCE('"period":"' + Period + '",','')
		+ COALESCE('"culture":"' + Culture + '",','')
		+ COALESCE('"medium":"' + Medium + '",','')
		+ COALESCE('"dimensions":"' + dbo.fn_String_Escape(replace(replace(Dimensions, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','')
		+ COALESCE('"ImagecreditLine":"' + dbo.fn_String_Escape(replace(replace(ImageCreditLine, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','')
		+ COALESCE('"copyrightStatus":"' + CopyrightStatus + '",','')
		+ COALESCE('"copyrightsTypeID":"' + CAST(CopyrightsTypeID AS nvarchar(max)) + '",','')
		+ COALESCE('"creditLine":"' + dbo.fn_String_Escape(replace(replace(CreditLine, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','')
		+ COALESCE('"copyright":"' + dbo.fn_String_Escape(replace(replace(Copyright, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','') 
		+ COALESCE('"site":"' + Site + '",','')
		+ COALESCE('"room":"' + Room + '",','')
		+ COALESCE('"wall":"' + Wall + '",','')
		+ COALESCE('"homeLocation":"' + HomeLocation + '",','')
		+ COALESCE('"marks":"' + dbo.fn_String_Escape(replace(replace(Marks, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','')
		+ COALESCE('"inscriptions":"' + dbo.fn_String_Escape(replace(replace(Inscriptions, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','')
		+ COALESCE('"exhibitionHistory":"' + dbo.fn_String_Escape(replace(replace(ExhibitionHistory, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','')
		+ COALESCE('"bibliography":"' + dbo.fn_String_Escape(replace(replace(Bibliography, '\' , '\\'),CHAR(13)+CHAR(10), '\n'), 'json') + '",','') 		
		+ COALESCE('"shortDescription":"' + dbo.fn_String_Escape(replace(replace(ShortDescription, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','')
		+ COALESCE('"longDescription":"' + dbo.fn_String_Escape(replace(replace(LongDescription, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','')
		+ COALESCE('"visualDescription":"' + dbo.fn_String_Escape(replace(replace(VisualDescription, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','')
		+ COALESCE('"publishedProvenance":"' + dbo.fn_String_Escape(replace(replace(PublishedProvenance, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','')
		+ COALESCE('"ensembleIndex":"' + dbo.fn_String_Escape(replace(replace(EnsembleIndex, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','')
		+ COALESCE('"primaryImageAltText":"' + dbo.fn_String_Escape(replace(replace(PrimaryImageAltText, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','')
		+ COALESCE('"audioTour":"' + dbo.fn_String_Escape(replace(replace(AudioTour, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','')
        
		+ COALESCE('"mediaName":"' + MediaFile + '",','')
		+ COALESCE('"mediaView":"' + MediaView + '",','')
		+ COALESCE('"mediaDescription":"' + dbo.fn_String_Escape(replace(replace(MediaDescription, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','')
        + COALESCE('"publicAccess":"'+CAST(PublicAccess AS nvarchar(max)) + '",','')
		+ COALESCE('"isPrimary":"'+CAST(IsPrimary AS nvarchar(max)) + '",','')
		+ COALESCE('"photographerName":"' + PhotographerName + '",','')
		+ COALESCE('"mediaRole":"' + MediaRole + '",','')  
		+ COALESCE('"publicCaption":"' + dbo.fn_String_Escape(replace(replace(PublicCaption, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','') 
		+ COALESCE('"renditionDate":"' + RenditionDate + '",','') 
		+ COALESCE('"technique":"' + dbo.fn_String_Escape(replace(replace(Technique, '\' , '\\'), CHAR(13)+CHAR(10), '\n'), 'json') + '",','') 
		+ COALESCE('"renditionNumber":"' + RenditionNumber + '",','')
		/* Constituent (Artist) Information */
		+ COALESCE(dbo.fn_ConstitJSON(@ObjectID) + '','' )
		 + '}' 
    FROM #tempImage
    FOR XML PATH(''), TYPE).value('.', 'nvarchar(MAX)'),1,1,'')
    + ']' + '}' 
	 );

	 --select @return_value 

	 create table #tempvar(jsonvalue nvarchar(max));

	 insert into #tempvar select @return_value

	  /* select * from #tempvar */
	  
	 /*Delete Existing rows with TextTypeID 67 */
	 delete from tms.dbo.TextEntries where TextTypeID = 67 and ID = @ObjectID

	 /*Insert into Textentries */

	 insert into TextEntries (TableID, ID, TextTypeID, TextStatusID, LoginID, EnteredDate, TextEntryHTML, TextEntry)
	 values (108, @ObjectID, 67, 0, 'dnune', GetDate(), @return_value, @return_value)
	 End


