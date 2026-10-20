import {describe, it, expect} from "@jest/globals";
import {renderPageMarkdown} from "./PageMarkdown";
import {ConfluencePage} from "../types";


const page: ConfluencePage = {
    id: "1",
    title: "Guide",
    url: "https://acme.atlassian.net/wiki/spaces/KAN/pages/1/Guide",
    space: "Kanban (KAN)",
    author: "Ann",
    created: "2026-01-01 10:00",
    updated: "2026-01-02 11:00",
    version: 3,
    labels: ["how-to", "draft"],
    body: "Body text",
    children: [{id: "2", title: "Sub Page", url: "https://acme.atlassian.net/wiki/pages/viewpage.action?pageId=2"}],
    comments: [
        {id: "c1", kind: "footer", author: "Bob", created: "2026-01-03 09:00", body: "Nice"},
        {id: "c2", kind: "inline", author: "Ann", created: "2026-01-04 09:00", quote: "Body", body: "Reword"}
    ],
    attachments: [
        {id: "a1", filename: "my shot.png", localName: "my shot.png", size: 2048, mimeType: "image/png", url: "u"}
    ]
};

describe("renderPageMarkdown", () => {
    it("renders metadata, body and every section", () => {
        const result = renderPageMarkdown(page);

        expect(result).toContain("# Guide");
        expect(result).toContain("- **Space:** Kanban (KAN)");
        expect(result).toContain("- **Version:** 3");
        expect(result).toContain("- **Labels:** how-to, draft");
        expect(result).toContain("Body text");
        expect(result).toContain("- [my shot.png](attachments/my%20shot.png) (2.0 KB)");
        expect(result).toContain("### Bob — 2026-01-03 09:00\n\nNice");
        expect(result).toContain("### Ann — 2026-01-04 09:00 (inline)\n\n> Body\n\nReword");
    });

    it("links children to Confluence by default", () => {
        expect(renderPageMarkdown(page)).toContain("- [Sub Page](https://acme.atlassian.net/wiki/pages/viewpage.action?pageId=2)");
    });

    it("links children to the local copies when asked", () => {
        expect(renderPageMarkdown(page, {linkChildren: true})).toContain("- [Sub Page](../2-sub-page/sub-page.md)");
    });

    it("omits empty sections", () => {
        const result = renderPageMarkdown({...page, children: [], comments: [], attachments: [], labels: []});

        expect(result).not.toContain("## Child pages");
        expect(result).not.toContain("## Comments");
        expect(result).not.toContain("## Attachments");
        expect(result).not.toContain("Labels");
    });
});
