import {describe, it, expect, beforeEach, afterEach} from "@jest/globals";
import FS from "fs";
import OS from "os";
import Path from "path";
import {Writable} from "stream";
import {DataPathService} from "./DataPathService";
import {TrelloService} from "./TrelloService";
import {TrelloProvider} from "../providers/TrelloProvider";
import {JiraAttachment, TrelloCard} from "../types";


const card: TrelloCard = {
    id: "5f1e9a0b2c3d4e5f6a7b8c9d",
    shortLink: "AbCd1234",
    url: "https://trello.com/c/AbCd1234/1-fix-login",
    title: "Fix login",
    board: "Product",
    list: "Doing",
    labels: [],
    members: [],
    due: "",
    dueComplete: false,
    archived: false,
    updated: "",
    description: "Body",
    checklists: [],
    comments: [],
    links: [],
    attachments: [{id: "a1", filename: "shot.png", localName: "shot.png", size: 3, mimeType: "image/png", url: "u"}]
};

class FakeProvider extends TrelloProvider {
    public requested: string[] = [];
    public downloads: string[] = [];

    public async getCard(id: string): Promise<TrelloCard> {
        this.requested.push(id);

        return card;
    }

    public async downloadAttachment(attachment: JiraAttachment, target: Writable): Promise<void> {
        this.downloads.push(attachment.filename);

        await new Promise<void>((resolve) => target.end("x".repeat(attachment.size), resolve));
    }
}

describe("TrelloService.fetch", () => {
    let dir: string;
    let provider: FakeProvider;
    let service: TrelloService;

    beforeEach(() => {
        dir = FS.mkdtempSync(Path.join(OS.tmpdir(), "trello-plugin-"));
        provider = new FakeProvider();

        const project = {
            path: dir,
            getMeta: () => ".ai",
            setMeta: () => {},
            save: () => {}
        };

        class TestService extends TrelloService {
            protected createProvider() {
                return provider;
            }
        }

        service = new TestService({} as any, {get: () => project} as any, new DataPathService(), {} as any);
    });

    afterEach(() => {
        FS.rmSync(dir, {recursive: true, force: true});
    });

    it("saves the card and its attachments under cards/<shortLink>-<slug>", async () => {
        const summary = await service.fetch("https://trello.com/c/AbCd1234/1-fix-login");
        const cardDir = Path.join(dir, ".ai", "cards", "AbCd1234-fix-login");

        expect(provider.requested).toEqual(["AbCd1234"]);
        expect(summary).toContain("Saved .ai/cards/AbCd1234-fix-login/fix-login.md");
        expect(summary).toContain("1 downloaded, 0 skipped, 0 failed");
        expect(FS.readFileSync(Path.join(cardDir, "fix-login.md"), "utf8")).toContain("# Fix login");
        expect(FS.existsSync(Path.join(cardDir, "attachments", "shot.png"))).toBe(true);
    });

    it("skips attachments that are already downloaded", async () => {
        await service.fetch("AbCd1234");

        provider.downloads = [];
        const summary = await service.fetch("AbCd1234");

        expect(provider.downloads).toEqual([]);
        expect(summary).toContain("0 downloaded, 1 skipped");
    });

    it("honours the --path override", async () => {
        await service.fetch("AbCd1234", undefined, "docs/trello");

        expect(FS.existsSync(Path.join(dir, "docs", "trello", "cards", "AbCd1234-fix-login", "fix-login.md"))).toBe(true);
    });

    it("rejects input that is not a card", async () => {
        await expect(service.fetch("https://example.com")).rejects.toThrow("Cannot find a Trello card");
    });
});
