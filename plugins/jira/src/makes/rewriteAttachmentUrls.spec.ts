import {describe, it, expect} from "@jest/globals";
import {rewriteAttachmentUrls} from "./rewriteAttachmentUrls";
import {JiraAttachment} from "../types";


const attachment = (id: string, localName: string): JiraAttachment => ({
    id,
    filename: localName,
    localName,
    size: 1,
    mimeType: "image/png",
    url: "u"
});

describe("rewriteAttachmentUrls", () => {
    const attachments = [
        attachment("5f1e9a0b2c3d4e5f6a7b8c9d", "my shot.png"),
        attachment("5f1e9a0b2c3d4e5f6a7b8c9e", "spec.pdf")
    ];

    it("points image and file links at the downloaded copies", () => {
        const text = [
            "![shot](https://trello.com/1/cards/abc/attachments/5f1e9a0b2c3d4e5f6a7b8c9d/download/my_shot.png)",
            "[spec](https://trello.com/1/cards/abc/attachments/5f1e9a0b2c3d4e5f6a7b8c9e/download/spec.pdf)"
        ].join("\n");

        expect(rewriteAttachmentUrls(text, attachments)).toBe([
            "![shot](attachments/my%20shot.png)",
            "[spec](attachments/spec.pdf)"
        ].join("\n"));
    });

    it("leaves other URLs alone", () => {
        const text = "see [docs](https://example.com/docs) and https://trello.com/c/AbCd1234";

        expect(rewriteAttachmentUrls(text, attachments)).toBe(text);
    });

    it("returns the text unchanged when there are no uploads", () => {
        expect(rewriteAttachmentUrls("https://x.test/a", [])).toBe("https://x.test/a");
    });
});
