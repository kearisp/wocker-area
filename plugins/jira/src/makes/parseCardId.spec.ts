import {describe, it, expect} from "@jest/globals";
import {parseCardId} from "./parseCardId";


describe("parseCardId", () => {
    it("extracts the short link from a card URL", () => {
        expect(parseCardId("https://trello.com/c/AbCd1234/12-some-title")).toBe("AbCd1234");
    });

    it("extracts the short link when there is nothing after it", () => {
        expect(parseCardId("https://trello.com/c/AbCd1234")).toBe("AbCd1234");
    });

    it("accepts a bare short link and a 24-character id", () => {
        expect(parseCardId("AbCd1234")).toBe("AbCd1234");
        expect(parseCardId("5f1e9a0b2c3d4e5f6a7b8c9d")).toBe("5f1e9a0b2c3d4e5f6a7b8c9d");
    });

    it("rejects other input", () => {
        expect(() => parseCardId("https://trello.com/b/AbCd1234/board")).toThrow("Cannot find a Trello card");
        expect(() => parseCardId("nope")).toThrow("Cannot find a Trello card");
    });
});
