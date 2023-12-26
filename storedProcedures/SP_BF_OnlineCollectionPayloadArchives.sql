USE [TMS]
GO
/****** Object:  StoredProcedure [dbo].[SP_BF_OnlineCollectionPayloadArchives]    Script Date: 12/26/2023 10:50:40 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- Author:		<Author,,Name>
-- Create date: <Create Date,,>
-- Description:	<Description,,>
-- =============================================
ALTER PROCEDURE [dbo].[SP_BF_OnlineCollectionPayloadArchives]
	-- Add the parameters for the stored procedure here
	@ObjectID NVARCHAR(max)
AS
BEGIN
	-- SET NOCOUNT ON added to prevent extra result sets from
	-- interfering with SELECT statements.
	SET NOCOUNT ON;

    -- Insert statements for procedure here
	-- Creates our `tempObjects` table
CREATE TABLE #tempObjects(
ObjectID int,
ObjectNumber nvarchar(64),
Title nvarchar(450),
Dated nvarchar(255),
Description nvarchar(max)
);

INSERT INTO
	#tempObjects	
SELECT
    DISTINCT O.ObjectID,
    O.ObjectNumber,
    OT.Title,
    O.Dated,
    O.Description
FROM
    Objects O
INNER JOIN (
	SELECT Title, ObjectID 
	FROM ObjTitles 
	WHERE ObjTitles.DisplayOrder = 1
	) OT
	ON O.ObjectID = OT.ObjectID
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
										'\' , '\\'), CHAR(13)+CHAR(10), '\n '), 'json') + '",','')
		+ COALESCE('"dated":" ' + Dated + '",','')
		+ COALESCE('"description":" ' + dbo.fn_String_Escape(replace(replace(COALESCE(Description, ''), '\' , '\\'), CHAR(13)+CHAR(10), '\n '), 'json') + '"','')
		 + '}' 
    FROM #tempObjects
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

END
