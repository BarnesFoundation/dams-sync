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

            expect(generatedFields[0].fullConstituentAndRole).toBe("Ms. Edith Dimock III American 1876 1955 painter")
        })
    })
})