import FieldHelpers from "../../constants/fieldHelpers"
import { NormalObject } from "../../interfaces/queryResponses"

describe("FieldHelpers", () => {
    describe("generateConstituentCalculatedFields", () => {
        it("should properly format the full name given first and last names", () => {
            const constituentRecord: NormalObject = {
                firstName: "Edith",
                lastName: "Dimock",
            }
            const generatedFields = FieldHelpers.generateConstituentCalculatedFields([constituentRecord])

            expect(generatedFields[0].constituentName).toBe("Edith Dimock ")
        })

        it("should properly format the full name given only first name", () => {
            const constituentRecord: NormalObject = {
                firstName: "Edith",
            }
            const generatedFields = FieldHelpers.generateConstituentCalculatedFields([constituentRecord])

            expect(generatedFields[0].constituentName).toBe("Edith ")
        })

        it("should properly format the full name given only last name", () => {
            const constituentRecord: NormalObject = {
                lastName: "Dimock",
            }
            const generatedFields = FieldHelpers.generateConstituentCalculatedFields([constituentRecord])

            expect(generatedFields[0].constituentName).toBe("Dimock ")
        })

        it("should properly format the constituent", () => {
            const constituentRecord: NormalObject = {
                firstName: "Edith",
                lastName: "Dimock",
                prefix: "Ms.",
                suffix: "III",
                nationality: "American",
                beginDate: "1876",
                endDate: "1955",
            }

            const generatedFields = FieldHelpers.generateConstituentCalculatedFields([constituentRecord])

            expect(generatedFields[0].fullConstituent).toBe("Ms. Edith Dimock III American 1876 1955")
        })

        it("should properly format the constituent and role", () => {
            const constituentRecord: NormalObject = {
                firstName: "Edith",
                lastName: "Dimock",
                prefix: "Ms.",
                suffix: "III",
                nationality: "American",
                beginDate: "1876",
                endDate: "1955",
                role: "painter"
            }

            const generatedFields = FieldHelpers.generateConstituentCalculatedFields([constituentRecord])

            expect(generatedFields[0].fullConstituentAndRole).toBe("Ms. Edith Dimock III American 1876 1955, painter")
        })
    })

    describe("generateCaptionForMainObject", () => {
        it("should properly format the caption", () => {
            const mainInformationObject = {
                title: "Country Girls Carrying Flowers",
                dated: "c. 1905–1912",
                medium: "Watercolor and black crayon with graphite on thick wove paper",
                objectNumber: "BF353",
                creditLine: "©2021 Estate of Edith Dimock",
            }
            const constituentRecord: NormalObject = {
                firstName: "Edith",
                lastName: "Dimock",
                prefix: "Ms.",
                suffix: "III",
                nationality: "American",
                beginDate: "1876",
                endDate: "1955",
                role: "painter"
            }

            const caption = FieldHelpers.generateCaptionForMainObject(mainInformationObject, [constituentRecord])

            expect(caption).toBe("Edith Dimock. Country Girls Carrying Flowers, c. 1905–1912, Watercolor and black crayon with graphite on thick wove paper. The Barnes Foundation, BF353. ©2021 Estate of Edith Dimock")
        })
    })
})