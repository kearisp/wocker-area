import {describe, it, expect, beforeEach, afterEach, jest} from "@jest/globals";
import FS from "fs";
import OS from "os";
import Path from "path";
import {Writable} from "stream";
import {promptConfirm} from "@wocker/prompts";
import {JiraService} from "./JiraService";
import {DataPathService} from "./DataPathService";
import {JiraProvider} from "../providers/JiraProvider";
import {JiraAttachment, JiraCredentials, JiraIssue} from "../types";


jest.mock("@wocker/prompts", () => ({
    ...(jest.requireActual("@wocker/prompts") as object),
    promptConfirm: jest.fn()
}));


const issue: JiraIssue = {
    key: "PROJ-1",
    url: "https://acme.atlassian.net/browse/PROJ-1",
    summary: "Fix login",
    status: "In Progress",
    type: "Bug",
    priority: "High",
    assignee: "Kris",
    reporter: "Ann",
    labels: ["auth"],
    created: "2026-01-01 10:00",
    updated: "2026-01-02 11:00",
    description: "Steps to reproduce",
    subtasks: [{key: "PROJ-2", summary: "Sub", status: "To Do"}],
    links: [{key: "PROJ-3", summary: "Other", status: "Done", relation: "blocks"}],
    comments: [{id: "1", author: "Ann", created: "2026-01-02 12:00", body: "Looks good"}],
    attachments: [
        {id: "10", filename: "shot.png", localName: "shot.png", size: 3, mimeType: "image/png", url: "u1"},
        {id: "11", filename: "log.txt", localName: "log.txt", size: 2, mimeType: "text/plain", url: "u2"}
    ]
};

class FakeProvider extends JiraProvider {
    public downloads: string[] = [];
    public failOn?: string;
    public keys: string[] = [];
    public queries: string[] = [];
    public failIssue?: string;

    public async searchIssueKeys(jql: string): Promise<string[]> {
        this.queries.push(jql);

        return this.keys;
    }

    public async getIssue(key?: string): Promise<JiraIssue> {
        if(key && key === this.failIssue) {
            throw new Error("not found");
        }

        return key ? {...issue, key} : issue;
    }

    public async downloadAttachment(attachment: JiraAttachment, target: Writable): Promise<void> {
        if(attachment.filename === this.failOn) {
            throw new Error("boom");
        }

        this.downloads.push(attachment.filename);

        await new Promise<void>((resolve) => target.end("x".repeat(attachment.size), resolve));
    }
}

describe("JiraService.fetch", () => {
    const credentials: JiraCredentials = {url: "https://acme.atlassian.net", email: "a@b.c", token: "t"};
    let dir: string;
    let provider: FakeProvider;
    let meta: Record<string, string>;
    let service: JiraService;

    beforeEach(() => {
        dir = FS.mkdtempSync(Path.join(OS.tmpdir(), "jira-plugin-"));
        provider = new FakeProvider();
        meta = {"jira.dataPath": ".ai"};

        const project = {
            path: dir,
            getMeta: (key: string) => meta[key],
            setMeta: (key: string, value: string) => { meta[key] = value; },
            save: jest.fn()
        };

        class TestService extends JiraService {
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

    it("writes the markdown and downloads attachments", async () => {
        const summary = await service.fetch("https://acme.atlassian.net/browse/proj-1");
        const taskDir = Path.join(dir, ".ai", "tasks", "PROJ-1");

        expect(summary).toContain("Attachments: 2 downloaded, 0 skipped, 0 failed");
        expect(FS.readFileSync(Path.join(taskDir, "PROJ-1.md"), "utf8")).toContain("# PROJ-1: Fix login");
        expect(FS.readdirSync(Path.join(taskDir, "attachments")).sort()).toEqual(["log.txt", "shot.png"]);
    });

    it("skips attachments that already exist with the same size", async () => {
        await service.fetch("PROJ-1");

        provider.downloads = [];
        const summary = await service.fetch("PROJ-1");

        expect(provider.downloads).toEqual([]);
        expect(summary).toContain("0 downloaded, 2 skipped");
    });

    it("re-downloads an attachment whose size differs", async () => {
        await service.fetch("PROJ-1");
        FS.writeFileSync(Path.join(dir, ".ai", "tasks", "PROJ-1", "attachments", "shot.png"), "xxxxxxxx");

        provider.downloads = [];
        await service.fetch("PROJ-1");

        expect(provider.downloads).toEqual(["shot.png"]);
    });

    it("reports failed attachments but still writes the markdown", async () => {
        provider.failOn = "log.txt";

        await expect(service.fetch("PROJ-1")).rejects.toThrow("1 failed");
        expect(FS.existsSync(Path.join(dir, ".ai", "tasks", "PROJ-1", "PROJ-1.md"))).toBe(true);
        expect(FS.existsSync(Path.join(dir, ".ai", "tasks", "PROJ-1", "attachments", "log.txt"))).toBe(false);
    });

    it("prefers the --path override over the saved meta", async () => {
        await service.fetch("PROJ-1", undefined, "docs/jira");

        expect(FS.existsSync(Path.join(dir, "docs", "jira", "tasks", "PROJ-1", "PROJ-1.md"))).toBe(true);
    });

    it("fails without a TTY when the data path is not set", async () => {
        meta = {};

        await expect(service.fetch("PROJ-1")).rejects.toThrow("jira.dataPath");
    });
});

describe("JiraService.pull", () => {
    const credentials: JiraCredentials = {url: "https://acme.atlassian.net", email: "a@b.c", token: "t"};
    const confirm = promptConfirm as unknown as jest.Mock<() => Promise<boolean>>;
    const originalIsTTY = process.stdin.isTTY;
    let dir: string;
    let tasksDir: string;
    let provider: FakeProvider;
    let service: JiraService;

    const setTTY = (value: boolean) => {
        Object.defineProperty(process.stdin, "isTTY", {value, configurable: true});
    };

    beforeEach(() => {
        dir = FS.mkdtempSync(Path.join(OS.tmpdir(), "jira-plugin-"));
        tasksDir = Path.join(dir, ".ai", "tasks");
        provider = new FakeProvider();
        confirm.mockReset();
        setTTY(false);

        const meta: Record<string, string> = {"jira.dataPath": ".ai"};
        const project = {
            path: dir,
            getMeta: (key: string) => meta[key],
            setMeta: (key: string, value: string) => { meta[key] = value; },
            save: jest.fn()
        };

        class TestService extends JiraService {
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
        setTTY(originalIsTTY);
        FS.rmSync(dir, {recursive: true, force: true});
    });

    it("downloads every found task and records them in the manifest", async () => {
        provider.keys = ["PROJ-1", "PROJ-2"];

        const summary = await service.pull();

        expect(summary).toContain("Pulled 2 tasks");
        expect(FS.existsSync(Path.join(tasksDir, "PROJ-1", "PROJ-1.md"))).toBe(true);
        expect(FS.existsSync(Path.join(tasksDir, "PROJ-2", "PROJ-2.md"))).toBe(true);
        expect(JSON.parse(FS.readFileSync(Path.join(tasksDir, ".pull.json"), "utf8")).keys).toEqual(["PROJ-1", "PROJ-2"]);
    });

    it("searches only open tasks unless --all is passed", async () => {
        await service.pull();
        await service.pull(undefined, undefined, true);

        expect(provider.queries).toEqual([
            "assignee = currentUser() AND statusCategory != Done",
            "assignee = currentUser()"
        ]);
    });

    it("keeps going when one task fails and reports it", async () => {
        provider.keys = ["PROJ-1", "PROJ-2"];
        provider.failIssue = "PROJ-1";

        await expect(service.pull()).rejects.toThrow("PROJ-1: not found");
        expect(FS.existsSync(Path.join(tasksDir, "PROJ-2", "PROJ-2.md"))).toBe(true);
    });

    it("keeps stale tasks without --clear", async () => {
        provider.keys = ["PROJ-1", "PROJ-2"];
        await service.pull();

        provider.keys = ["PROJ-1"];
        await service.pull();

        expect(FS.existsSync(Path.join(tasksDir, "PROJ-2"))).toBe(true);
    });

    it("--clear --yes removes stale pulled tasks but not fetched ones", async () => {
        provider.keys = ["PROJ-1", "PROJ-2"];
        await service.pull();
        await service.fetch("PROJ-9");

        provider.keys = ["PROJ-1"];
        const summary = await service.pull(undefined, undefined, false, true, true);

        expect(summary).toContain("Removed 1 tasks");
        expect(FS.existsSync(Path.join(tasksDir, "PROJ-2"))).toBe(false);
        expect(FS.existsSync(Path.join(tasksDir, "PROJ-9", "PROJ-9.md"))).toBe(true);
        expect(JSON.parse(FS.readFileSync(Path.join(tasksDir, ".pull.json"), "utf8")).keys).toEqual(["PROJ-1"]);
    });

    it("--clear without a TTY and without --yes deletes nothing and fails", async () => {
        provider.keys = ["PROJ-1", "PROJ-2"];
        await service.pull();

        provider.keys = ["PROJ-1"];

        await expect(service.pull(undefined, undefined, false, true)).rejects.toThrow("Nothing was deleted");
        expect(FS.existsSync(Path.join(tasksDir, "PROJ-2"))).toBe(true);
        expect(confirm).not.toHaveBeenCalled();
    });

    it("--clear asks for confirmation and respects a refusal", async () => {
        provider.keys = ["PROJ-1", "PROJ-2"];
        await service.pull();

        provider.keys = ["PROJ-1"];
        setTTY(true);
        confirm.mockResolvedValue(false);

        const summary = await service.pull(undefined, undefined, false, true);

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(summary).toContain("Kept 1 tasks");
        expect(FS.existsSync(Path.join(tasksDir, "PROJ-2"))).toBe(true);
    });

    it("--clear deletes after a confirmation", async () => {
        provider.keys = ["PROJ-1", "PROJ-2"];
        await service.pull();

        provider.keys = ["PROJ-1"];
        setTTY(true);
        confirm.mockResolvedValue(true);

        await service.pull(undefined, undefined, false, true);

        expect(FS.existsSync(Path.join(tasksDir, "PROJ-2"))).toBe(false);
    });

    it("ignores manifest entries that are not plain issue keys", async () => {
        const outside = Path.join(dir, "outside");

        FS.mkdirSync(outside);
        FS.mkdirSync(tasksDir, {recursive: true});
        FS.writeFileSync(Path.join(tasksDir, ".pull.json"), JSON.stringify({keys: ["../../outside", "PROJ-5"]}));

        await service.pull(undefined, undefined, false, true, true);

        expect(FS.existsSync(outside)).toBe(true);
    });
});
