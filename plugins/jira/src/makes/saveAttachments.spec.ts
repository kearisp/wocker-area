import {describe, it, expect, beforeEach, afterEach} from "@jest/globals";
import FS from "fs";
import OS from "os";
import Path from "path";
import {Writable} from "stream";
import {saveAttachments} from "./saveAttachments";
import {JiraAttachment} from "../types";


const attachment = (name: string, size: number): JiraAttachment => ({
    id: name,
    filename: name,
    localName: name,
    size,
    mimeType: "text/plain",
    url: "u"
});

const write = async (item: JiraAttachment, target: Writable): Promise<void> => {
    await new Promise<void>((resolve) => target.end("x".repeat(item.size), resolve));
};

describe("saveAttachments", () => {
    let dir: string;

    beforeEach(() => {
        dir = Path.join(FS.mkdtempSync(Path.join(OS.tmpdir(), "jira-attachments-")), "attachments");
    });

    afterEach(() => {
        FS.rmSync(Path.dirname(dir), {recursive: true, force: true});
    });

    it("does not create the directory when there is nothing to save", async () => {
        const result = await saveAttachments(dir, [], write);

        expect(result).toEqual({downloaded: 0, skipped: 0, failed: []});
        expect(FS.existsSync(dir)).toBe(false);
    });

    it("downloads missing files and skips same-size ones", async () => {
        await saveAttachments(dir, [attachment("a.txt", 3)], write);

        const result = await saveAttachments(dir, [attachment("a.txt", 3), attachment("b.txt", 2)], write);

        expect(result.downloaded).toBe(1);
        expect(result.skipped).toBe(1);
    });

    it("re-downloads a file whose size changed", async () => {
        await saveAttachments(dir, [attachment("a.txt", 3)], write);

        const result = await saveAttachments(dir, [attachment("a.txt", 5)], write);

        expect(result.downloaded).toBe(1);
        expect(FS.statSync(Path.join(dir, "a.txt")).size).toBe(5);
    });

    it("reports failures and leaves no partial file", async () => {
        const result = await saveAttachments(dir, [attachment("a.txt", 3)], async () => {
            throw new Error("boom");
        });

        expect(result.failed).toEqual(["a.txt: boom"]);
        expect(FS.existsSync(Path.join(dir, "a.txt"))).toBe(false);
    });
});
