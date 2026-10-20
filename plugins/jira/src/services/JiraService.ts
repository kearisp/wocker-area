import {Injectable, ProjectService} from "@wocker/core";
import {promptConfirm, promptInput} from "@wocker/prompts";
import FS from "fs";
import Path from "path";
import {CredentialsService} from "./CredentialsService";
import {DataPathService} from "./DataPathService";
import {JiraProvider} from "../providers/JiraProvider";
import {JiraCloudProvider} from "../providers/JiraCloudProvider";
import {JiraCredentials, JiraIssue} from "../types";
import {renderIssueMarkdown} from "../makes/IssueMarkdown";
import {parseIssueKey} from "../makes/parseIssueKey";
import {saveAttachments} from "../makes/saveAttachments";
import {
    ATTACHMENTS_DIR,
    JIRA_EMAIL_KEY,
    JIRA_TOKEN_KEY,
    JIRA_URL_KEY,
    NOT_CONFIGURED_MESSAGE,
    PULL_MANIFEST,
    TASKS_DIR
} from "../env";


const ISSUE_KEY = /^[A-Z][A-Z0-9_]*-\d+$/;


@Injectable()
export class JiraService {
    public constructor(
        protected readonly credentialsService: CredentialsService,
        protected readonly projectService: ProjectService,
        protected readonly dataPathService: DataPathService
    ) {}

    protected createProvider(credentials: JiraCredentials): JiraProvider {
        return new JiraCloudProvider(credentials);
    }

    public async config(name?: string, local?: boolean, askPath?: boolean): Promise<void> {
        const project = local || askPath
            ? this.projectService.get(name)
            : undefined;
        const scope = local ? project : undefined;

        const url = await promptInput({
            message: "Atlassian site URL",
            required: true,
            default: await this.credentialsService.getValue(JIRA_URL_KEY, scope)
        });
        const email = await promptInput({
            message: "Email",
            required: true,
            default: await this.credentialsService.getValue(JIRA_EMAIL_KEY, scope)
        });
        const currentToken = await this.credentialsService.getValue(JIRA_TOKEN_KEY, scope);
        const token = await promptInput({
            type: "password",
            message: currentToken ? "API token (leave empty to keep the current one)" : "API token",
            required: !currentToken
        });

        await this.credentialsService.set(JIRA_URL_KEY, url, scope);
        await this.credentialsService.set(JIRA_EMAIL_KEY, email, scope);

        if(token) {
            await this.credentialsService.set(JIRA_TOKEN_KEY, token, scope);
        }

        if(askPath) {
            await this.dataPathService.ask(project!);
        }
    }

    protected async saveIssue(provider: JiraProvider, tasksDir: string, issue: JiraIssue) {
        const taskDir = Path.join(tasksDir, issue.key),
              file = Path.join(taskDir, `${issue.key}.md`);

        FS.mkdirSync(taskDir, {recursive: true});
        FS.writeFileSync(file, renderIssueMarkdown(issue));

        const result = await saveAttachments(
            Path.join(taskDir, ATTACHMENTS_DIR),
            issue.attachments,
            (attachment, target) => provider.downloadAttachment(attachment, target)
        );

        return {file, ...result};
    }

    protected readManifest(tasksDir: string): string[] {
        try {
            const {keys} = JSON.parse(FS.readFileSync(Path.join(tasksDir, PULL_MANIFEST), "utf8"));

            // Entries become directory names under tasksDir, so anything but a plain key is dropped.
            return (Array.isArray(keys) ? keys : []).filter((key) => ISSUE_KEY.test(key));
        }
        catch(err) {
            return [];
        }
    }

    protected writeManifest(tasksDir: string, keys: string[]): void {
        FS.mkdirSync(tasksDir, {recursive: true});
        FS.writeFileSync(Path.join(tasksDir, PULL_MANIFEST), JSON.stringify({keys}, null, 4) + "\n");
    }

    public async fetch(input: string, name?: string, pathOverride?: string): Promise<string> {
        const key = parseIssueKey(input),
              project = this.projectService.get(name),
              credentials = await this.credentialsService.get(project);

        if(!credentials) {
            throw new Error(NOT_CONFIGURED_MESSAGE);
        }

        const dataPath = await this.dataPathService.resolve(project, pathOverride),
              provider = this.createProvider(credentials),
              issue = await provider.getIssue(key),
              {file, downloaded, skipped, failed} = await this.saveIssue(
                  provider,
                  Path.join(project.path, dataPath, TASKS_DIR),
                  issue
              );
        const summary = [
            `Saved ${Path.relative(project.path, file)}`,
            `Attachments: ${downloaded} downloaded, ${skipped} skipped, ${failed.length} failed`
        ];

        if(failed.length > 0) {
            throw new Error([...summary, ...failed.map((line) => `  ${line}`)].join("\n"));
        }

        return summary.join("\n");
    }

    public async pull(
        name?: string,
        pathOverride?: string,
        all?: boolean,
        clear?: boolean,
        yes?: boolean
    ): Promise<string> {
        const project = this.projectService.get(name),
              credentials = await this.credentialsService.get(project);

        if(!credentials) {
            throw new Error(NOT_CONFIGURED_MESSAGE);
        }

        const dataPath = await this.dataPathService.resolve(project, pathOverride),
              tasksDir = Path.join(project.path, dataPath, TASKS_DIR),
              provider = this.createProvider(credentials),
              jql = `assignee = currentUser()${all ? "" : " AND statusCategory != Done"}`,
              keys = await provider.searchIssueKeys(jql),
              previous = this.readManifest(tasksDir),
              errors: string[] = [];

        let downloaded = 0,
            skipped = 0;

        for(const key of keys) {
            try {
                const result = await this.saveIssue(provider, tasksDir, await provider.getIssue(key));

                downloaded += result.downloaded;
                skipped += result.skipped;
                errors.push(...result.failed.map((line) => `${key}: ${line}`));
            }
            catch(err) {
                errors.push(`${key}: ${(err as Error).message}`);
            }
        }

        let manifest = [...new Set([...previous, ...keys])];

        this.writeManifest(tasksDir, manifest);

        const summary = [
            `Pulled ${keys.length} tasks into ${Path.relative(project.path, tasksDir)}`,
            `Attachments: ${downloaded} downloaded, ${skipped} skipped`
        ];
        const stale = previous.filter((key) => !keys.includes(key));

        if(clear && stale.length > 0) {
            const list = stale.map((key) => `  ${Path.relative(project.path, Path.join(tasksDir, key))}`).join("\n");

            if(!yes && !process.stdin.isTTY) {
                throw new Error(`No longer assigned to you:\n${list}\nRefusing to delete without a TTY, pass --yes. Nothing was deleted.`);
            }

            const confirmed = yes || await promptConfirm({
                message: `Delete ${stale.length} local tasks that are no longer assigned to you?\n${list}\n`,
                default: false
            });

            if(confirmed) {
                for(const key of stale) {
                    FS.rmSync(Path.join(tasksDir, key), {recursive: true, force: true});
                }

                manifest = manifest.filter((key) => !stale.includes(key));
                this.writeManifest(tasksDir, manifest);
                summary.push(`Removed ${stale.length} tasks:\n${list}`);
            }
            else {
                summary.push(`Kept ${stale.length} tasks that are no longer assigned to you`);
            }
        }

        if(errors.length > 0) {
            throw new Error([...summary, `${errors.length} failed:`, ...errors.map((line) => `  ${line}`)].join("\n"));
        }

        return summary.join("\n");
    }
}
