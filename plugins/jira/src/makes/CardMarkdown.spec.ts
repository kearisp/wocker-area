import {describe, it, expect} from "@jest/globals";
import {renderCardMarkdown} from "./CardMarkdown";
import {TrelloCard} from "../types";


const card: TrelloCard = {
    id: "5f1e9a0b2c3d4e5f6a7b8c9d",
    shortLink: "AbCd1234",
    url: "https://trello.com/c/AbCd1234/1-fix-login",
    title: "Fix login",
    board: "Product",
    list: "In progress",
    labels: ["bug", "urgent"],
    members: ["Ann", "Bob"],
    due: "2026-11-01 09:00",
    dueComplete: false,
    archived: false,
    updated: "2026-10-20 12:00",
    description: "Steps to reproduce",
    checklists: [{name: "QA", items: [{name: "Chrome", done: true}, {name: "Firefox", done: false}]}],
    comments: [{id: "c1", author: "Ann", created: "2026-10-21 10:00", body: "On it"}],
    links: [{name: "Design", url: "https://figma.test/file"}],
    attachments: [{id: "a1", filename: "shot.png", localName: "shot.png", size: 1024, mimeType: "image/png", url: "u"}]
};

describe("renderCardMarkdown", () => {
    it("renders metadata and every section", () => {
        const result = renderCardMarkdown(card);

        expect(result).toContain("# Fix login");
        expect(result).toContain("- **Board:** Product");
        expect(result).toContain("- **Labels:** bug, urgent");
        expect(result).toContain("- **Due:** 2026-11-01 09:00");
        expect(result).toContain("## Description\n\nSteps to reproduce");
        expect(result).toContain("## Checklist: QA\n\n- [x] Chrome\n- [ ] Firefox");
        expect(result).toContain("- [Design](https://figma.test/file)");
        expect(result).toContain("- [shot.png](attachments/shot.png) (1.0 KB)");
        expect(result).toContain("### Ann — 2026-10-21 10:00\n\nOn it");
    });

    it("marks a completed due date and an archived card", () => {
        const result = renderCardMarkdown({...card, dueComplete: true, archived: true});

        expect(result).toContain("(done)");
        expect(result).toContain("- **Archived:** yes");
    });

    it("omits empty sections", () => {
        const result = renderCardMarkdown({...card, description: "", checklists: [], comments: [], links: [], attachments: [], due: ""});

        expect(result).not.toContain("## Description");
        expect(result).not.toContain("## Checklist");
        expect(result).not.toContain("## Comments");
        expect(result).not.toContain("## Links");
        expect(result).not.toContain("## Attachments");
        expect(result).not.toContain("Due");
    });
});
