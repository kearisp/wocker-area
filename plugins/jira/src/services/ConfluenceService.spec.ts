import {describe, it, expect, beforeEach, afterEach} from "@jest/globals";
import FS from "fs";
import OS from "os";
import Path from "path";
import {Writable} from "stream";
import {ConfluenceService} from "./ConfluenceService";
import {DataPathService} from "./DataPathService";
import {ConfluenceProvider} from "../providers/ConfluenceProvider";
import {ConfluencePage, JiraAttachment, JiraCredentials} from "../types";


const makePage = (id: string, title: string, children: string[] = [], attachments: JiraAttachment[] = []): ConfluencePage => ({
    id,
    title,
    url: `https://acme.atlassian.net/wiki/pages/viewpage.action?pageId=${id}`,
    space: "Kanban (KAN)",
    author: "Ann",
    created: "2026-01-01 10:00",
    updated: "2026-01-01 10:00",
    version: 1,
    labels: [],
    body: `Body of ${title}`,
    children: children.map((child) => ({id: child, title: `Page ${child}`, url: `u${child}`})),
    comments: [],
    attachments
});

class FakeProvider extends ConfluenceProvider {
    public pages: Record<string, ConfluencePage> = {};
    public requested: string[] = [];
    public downloads: string[] = [];

    public async resolvePageId(input: string): Promise<string> {
        return input;
    }

    public async getPage(id: string): Promise<ConfluencePage> {
        this.requested.push(id);

        if(!this.pages[id]) {
            throw new Error(`Not found (404): ${id}`);
        }

        return this.pages[id];
    }

    public async downloadAttachment(attachment: JiraAttachment, target: Writable): Promise<void> {
        this.downloads.push(attachment.filename);

        await new Promise<void>((resolve) => target.end("x".repeat(attachment.size), resolve));
    }
}

describe("ConfluenceService.pull", () => {
    const credentials: JiraCredentials = {url: "https://acme.atlassian.net", email: "a@b.c", token: "t"};
    const file = {id: "f1", filename: "shot.png", localName: "shot.png", size: 3, mimeType: "image/png", url: "u"};
    let dir: string;
    let provider: FakeProvider;
    let service: ConfluenceService;

    beforeEach(() => {
        dir = FS.mkdtempSync(Path.join(OS.tmpdir(), "confluence-plugin-"));
        provider = new FakeProvider();
        provider.pages = {
            "1": makePage("1", "Root Page", ["2", "3"], [file]),
            "2": makePage("2", "Page 2", ["1"]),
            "3": makePage("3", "Page 3")
        };

        const project = {
            path: dir,
            getMeta: () => ".ai",
            setMeta: () => {},
            save: () => {}
        };

        class TestService extends ConfluenceService {
            protected createProvider() {
                return provider;
            }
        }

        service = new TestService(
            {get: async () => credentials} as any,
            {get: () => project} as any,
            new DataPathService()
        );
    });

    afterEach(() => {
        FS.rmSync(dir, {recursive: true, force: true});
    });

    it("saves one page with its attachments and lists children as Confluence links", async () => {
        const summary = await service.pull("1");
        const pageDir = Path.join(dir, ".ai", "pages", "1-root-page");

        expect(summary).toContain("Saved .ai/pages/1-root-page/root-page.md");
        expect(summary).toContain("Pages: 1. Attachments: 1 downloaded, 0 skipped, 0 failed");
        expect(FS.readFileSync(Path.join(pageDir, "root-page.md"), "utf8")).toContain("- [Page 2](u2)");
        expect(FS.existsSync(Path.join(pageDir, "attachments", "shot.png"))).toBe(true);
        expect(provider.requested).toEqual(["1"]);
    });

    it("downloads descendants with --children and links them locally, without looping on cycles", async () => {
        const summary = await service.pull("1", undefined, undefined, true);

        expect(summary).toContain("Pages: 3.");
        expect(provider.requested).toEqual(["1", "2", "3"]);
        expect(FS.readFileSync(Path.join(dir, ".ai", "pages", "1-root-page", "root-page.md"), "utf8"))
            .toContain("- [Page 2](../2-page-2/page-2.md)");
        expect(FS.existsSync(Path.join(dir, ".ai", "pages", "3-page-3", "page-3.md"))).toBe(true);
    });

    it("keeps going when a child page cannot be fetched and reports it", async () => {
        delete provider.pages["3"];

        await expect(service.pull("1", undefined, undefined, true)).rejects.toThrow("Page 3: Not found (404): 3");
        expect(FS.existsSync(Path.join(dir, ".ai", "pages", "2-page-2", "page-2.md"))).toBe(true);
    });

    it("fails right away when the root page cannot be fetched", async () => {
        await expect(service.pull("99")).rejects.toThrow("Not found (404): 99");
    });

    it("skips attachments that are already downloaded", async () => {
        await service.pull("1");

        provider.downloads = [];
        const summary = await service.pull("1");

        expect(provider.downloads).toEqual([]);
        expect(summary).toContain("0 downloaded, 1 skipped");
    });
});
