import {describe, it, expect} from "@jest/globals";
import {pageDirName, slugify} from "./slugify";


describe("slugify", () => {
    it("lowercases and joins words with dashes", () => {
        expect(slugify("Release Notes: v2.0!")).toBe("release-notes-v2-0");
    });

    it("keeps letters of other alphabets", () => {
        expect(slugify("Опис завдання №5")).toBe("опис-завдання-5");
    });

    it("falls back when nothing is left", () => {
        expect(slugify("!!!")).toBe("page");
    });

    it("truncates long titles without a trailing dash", () => {
        const slug = slugify(`${"a".repeat(59)} bbbb`);

        expect(slug.length).toBeLessThanOrEqual(60);
        expect(slug.endsWith("-")).toBe(false);
    });

    it("prefixes the directory with the page id", () => {
        expect(pageDirName({id: "42", title: "Hello World"})).toBe("42-hello-world");
    });
});
