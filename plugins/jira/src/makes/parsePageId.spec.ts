import {describe, it, expect} from "@jest/globals";
import {isTinyLink, parsePageId} from "./parsePageId";


describe("parsePageId", () => {
    it("accepts a bare id", () => {
        expect(parsePageId(" 12345 ")).toBe("12345");
    });

    it("extracts the id from a space page URL", () => {
        expect(parsePageId("https://acme.atlassian.net/wiki/spaces/KAN/pages/98765/My+Page")).toBe("98765");
    });

    it("extracts the id from a URL without a title", () => {
        expect(parsePageId("https://acme.atlassian.net/wiki/spaces/KAN/pages/98765")).toBe("98765");
    });

    it("extracts the id from a pageId query", () => {
        expect(parsePageId("https://acme.atlassian.net/wiki/pages/viewpage.action?pageId=555")).toBe("555");
    });

    it("returns null when there is no id", () => {
        expect(parsePageId("https://acme.atlassian.net/wiki/x/AbC_d")).toBeNull();
        expect(parsePageId("nothing")).toBeNull();
    });

    it("detects short links", () => {
        expect(isTinyLink("https://acme.atlassian.net/wiki/x/AbC_d")).toBe(true);
        expect(isTinyLink("https://acme.atlassian.net/wiki/spaces/KAN/pages/1")).toBe(false);
    });
});
