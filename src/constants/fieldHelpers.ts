import { ObjectRecord } from "../interfaces/queryResponses";

/** Generates the constituentName, fullConstituent, and fullConstituentAndRole fields as these are fields made from several individual fields.
 * Adds these generated fields to each constituent record in the constituents records list
 */
const generateConstituentCalculatedFields = (
  constituentRecords: ObjectRecord["ConstituentRecord"]
) => {
  constituentRecords.forEach((cr) => {
    const {
      firstName,
      lastName,
      prefix,
      suffix,
      nationality,
      beginDate,
      endDate,
      role,
    } = cr;

    let constituentName = "";
    let fullConstituent = "";

    if (prefix) fullConstituent += `${prefix} `;

    if (firstName) {
      constituentName += `${firstName} `;
      fullConstituent += `${firstName} `;
    }

    if (lastName) {
      constituentName += `${lastName} `;
      fullConstituent += `${lastName} `;
    }

    if (suffix) fullConstituent += `${suffix} `;
    if (nationality) fullConstituent += `${nationality} `;
    if (beginDate) fullConstituent += `${beginDate} `;
    if (endDate) fullConstituent += `${endDate}`;

    let fullConstituentAndRole = `${fullConstituent}, ${role}`;

    cr["constituentName"] = constituentName;
    cr["fullConstituent"] = fullConstituent;
    cr["fullConstituentAndRole"] = fullConstituentAndRole;
  });

  return constituentRecords;
};

/** Generates the caption for a main object record. The caption is a field made by combining several other fields, including the list of related constituents */
const generateCaptionForMainObject = (
  mainInformationObject: { [key: string]: string },
  constituentRecords: ObjectRecord["ConstituentRecord"]
): string => {
  // Get the needed fields from the main object
  const { title, dated, medium, objectNumber, creditLine } =
    mainInformationObject;

  // Get the needed fields from the constituent records
  const crInformation = constituentRecords.map((cr) => {
    const { firstName, lastName } = cr;
    return { firstName, lastName };
  });

  let captionString = "";

  // Cascade all the way down adding fields in order
  crInformation.forEach((cr) => {
    if (cr.firstName) captionString += `${cr.firstName} `;
    if (cr.lastName) captionString += `${cr.lastName}. `;
  });

  if (title) captionString += `${title}, `;
  if (dated) captionString += `${dated}, `;
  if (medium) captionString += `${medium}.`;

  captionString += " The Barnes Foundation, ";

  if (objectNumber) captionString += `${objectNumber}. `;
  if (creditLine) captionString += `${creditLine}`;

  return captionString;
};

const FieldHelpers = {
  generateCaptionForMainObject,
  generateConstituentCalculatedFields,
};

export default FieldHelpers;
