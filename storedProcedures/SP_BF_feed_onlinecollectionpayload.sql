USE [TMS]
GO
/****** Object:  StoredProcedure [dbo].[SP_BF_feed_onlinecollectionpayload]    Script Date: 12/19/2022 8:55:51 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
ALTER PROCEDURE [dbo].[SP_BF_feed_onlinecollectionpayload]
	-- Add the parameters for the stored procedure here
	
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON;
	create table #tempObjID(ObID int)
    -- Insert statements for procedure here
	insert into #tempObjID	SELECT distinct
	O.ObjectID
	from Objects O 
	/* Classification */
	INNER JOIN ClassificationXRefs CXR ON O.ObjectID = CXR.Id
    INNER JOIN classifications Cs ON Cs.ClassificationID = CXR.ClassificationId
	/* Period, Culture */
	INNER JOIN ObjContext Oc ON Oc.ObjectID = O.ObjectID
	/* CopyrightStatus and CreditLineReproduction */
	INNER JOIN ObjRights Obr ON obr.OBJECTID = O.ObjectID
	INNER JOIN ObjRightsTypes Ort on Ort.ObjRightsTypeID = Obr.ObjRightsTypeID
	/*text Entries - short description, long description and published provenance */
	LEFT OUTER JOIN TextEntries tes on tes.id = O.ObjectID and tes.Texttypeid = 48
	LEFT OUTER JOIN TextEntries tel on tel.id = O.ObjectID and tel.Texttypeid = 49
	LEFT OUTER JOIN TextEntries tep on tep.id = O.ObjectID and tep.Texttypeid = 55 
	/* site, room, homelocation */
	INNER JOIN objcomponents obc on o.objectID = obc.ObjectID 	 
    INNER JOIN locations l on obc.HomeLocationID  = l.LocationID
	INNER JOIN MediaXRefs mx On mx.ID = o.ObjectID And mx.TableID = 108 /*and Mx.PrimaryDisplay = 1*/
	/* Photographer */	
    INNER JOIN MediaMaster mm On mx.MediaMasterID = mm.MediaMasterID 
INNER JOIN MediaRenditions mr ON (mm.MediaMasterID = mr.MediaMasterID and mm.PrimaryRendID = mr.RenditionID )
left join MediaFiles mf ON (mr.PrimaryFileID = mf.FileID)
join (select const.DisplayName,r.Role, cx.ID,cx.RoleTypeID,cx.RoleID  from ConXrefs cx join Roles r on (r.RoleID = cx.RoleID)
                
				join (select cts.DisplayName, cxd.ConXrefID, cxd.UnMasked  from ConAltNames cn
                join Constituents cts on (cn.ConstituentID = cts.ConstituentID /*and cts.Active = 1*/)
        join ConXrefDetails cxd ON (cxd.NameID = cn.AltNameId))const

        ON (cx.ConXrefID = const.ConXrefID and const.UnMasked = 1))conxref1
        ON (mr.RenditionID = conxref1.ID and conxref1.RoleTypeID = 11 and conxref1.RoleID = 11) 
/*Constituent */
/*INNER JOIN MediaRenditions mr1 ON mm.PrimaryRendID = mr1.RenditionID  
INNER JOIN conxrefs cx1 on cx1.ID = o.objectid and cx1.TableID = 108
INNER JOIN Roles r1 on r1.RoleID = cx1.RoleID and R1.RoleTypeID = 1 
INNER JOIN ConXrefDetails cxd1 ON cx1.ConXrefID = cxd1.ConXrefID And CXD1.UnMasked = 1
INNER JOIN ConAltNames cn1 ON cxd1.NameID = cn1.AltNameId
INNER JOIN Constituents cts1 ON cn1.ConstituentID = cts1.ConstituentID 	*/	

join
(select  cx1.ID, cx1.TableID  from ConXrefs cx1 
               join Roles r1 on (r1.RoleID = cx1.RoleID and r1.RoleTypeID = 1)
                join 
				      (select  cxd1.ConXrefID, cxd1.UnMasked  from ConAltNames cn1
                      join Constituents cts1 on (cn1.ConstituentID = cts1.ConstituentID)
                     join ConXrefDetails cxd1 ON (cxd1.NameID = cn1.AltNameId))conx1

                ON (cx1.ConXrefID = conx1.ConXrefID and conx1.UnMasked = 1))constit1
on constit1.ID = o.objectid and constit1.TableID = 108

DECLARE	@ObjectID int

DECLARE cur CURSOR FOR SELECT ObID FROM #tempObjID
OPEN cur

FETCH NEXT FROM cur INTO @ObjectID

WHILE @@FETCH_STATUS = 0 BEGIN
    EXEC [dbo].[SP_BF_OnlineCollectionPayload] @ObjectID 
    FETCH NEXT FROM cur INTO @ObjectID
END

CLOSE cur    
DEALLOCATE cur


END



