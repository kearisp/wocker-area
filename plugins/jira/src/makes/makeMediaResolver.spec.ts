import {describe, it, expect} from "@jest/globals";
import {makeMediaResolver} from "./makeMediaResolver";
import {JiraAttachment} from "../types";


const attachment = (id: string, filename: string, extra: Partial<JiraAttachment> = {}): JiraAttachment => ({
    id,
    filename,
    localName: filename,
    size: 1,
    mimeType: "image/png",
    url: "u",
    ...extra
});

describe("makeMediaResolver", () => {
    const resolve = makeMediaResolver([
        attachment("1", "a.png", {mediaId: "uuid-a"}),
        attachment("2", "B.pdf", {mimeType: "application/pdf"})
    ]);

    it("matches by media id first", () => {
        expect(resolve({id: "uuid-a", alt: "other.png"})).toEqual({name: "a.png", path: "attachments/a.png", image: true});
    });

    it("matches by file name, ignoring case as a fallback", () => {
        expect(resolve({id: "x", alt: "b.pdf"})).toEqual({name: "B.pdf", path: "attachments/B.pdf", image: false});
    });

    it("matches by attachment id", () => {
        expect(resolve({id: "2"})?.name).toBe("B.pdf");
    });

    it("returns null when nothing matches", () => {
        expect(resolve({id: "nope", alt: "missing.txt"})).toBeNull();
        expect(resolve({})).toBeNull();
    });
});
