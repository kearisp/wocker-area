import {Injectable, ProjectService} from "@wocker/core";
import FS from "fs";
import Path from "path";
import {CredentialsService} from "./CredentialsService";
import {DataPathService} from "./DataPathService";
import {ConfluenceProvider} from "../providers/ConfluenceProvider";
import {ConfluenceCloudProvider} from "../providers/ConfluenceCloudProvider";
import {JiraCredentials} from "../types";
import {renderPageMarkdown} from "../makes/PageMarkdown";
import {saveAttachments} from "../makes/saveAttachments";
import {pageDirName, slugify} from "../makes/slugify";
import {ATTACHMENTS_DIR, NOT_CONFIGURED_MESSAGE, PAGES_DIR} from "../env";


@Injectable()
export class ConfluenceService {
    public constructor(
        protected readonly credentialsService: CredentialsService,
        protected readonly projectService: ProjectService,
        protected readonly dataPathService: DataPathService
    ) {}

    protected createProvider(credentials: JiraCredentials): ConfluenceProvider {
        return new ConfluenceCloudProvider(credentials);
    }

    public async pull(input: string, name?: string, pathOverride?: string, withChildren?: boolean): Promise<string> {
        const project = this.projectService.get(name),
              credentials = await this.credentialsService.get(project);

        if(!credentials) {
            throw new Error(NOT_CONFIGURED_MESSAGE);
        }

        const dataPath = await this.dataPathService.resolve(project, pathOverride),
              provider = this.createProvider(credentials),
              pagesDir = Path.join(project.path, dataPath, PAGES_DIR),
              queue = [await provider.resolvePageId(input)],
              visited = new Set<string>(),
              lines: string[] = [],
              failures: string[] = [];

        let downloaded = 0,
            skipped = 0,
            failed = 0;

        for(let id = queue.shift(); id !== undefined; id = queue.shift()) {
            if(visited.has(id)) {
                continue;
            }

            visited.add(id);

            let page;

            try {
                page = await provider.getPage(id);
            }
            catch(err) {
                // A broken root page is the whole command's failure; a broken child only skips that child.
                if(visited.size === 1) {
                    throw err;
                }

                failures.push(`Page ${id}: ${(err as Error).message}`);
                continue;
            }

            const dir = Path.join(pagesDir, pageDirName(page)),
                  file = Path.join(dir, `${slugify(page.title)}.md`);

            FS.mkdirSync(dir, {recursive: true});
            FS.writeFileSync(file, renderPageMarkdown(page, {linkChildren: withChildren}));
            lines.push(`Saved ${Path.relative(project.path, file)}`);

            const result = await saveAttachments(
                Path.join(dir, ATTACHMENTS_DIR),
                page.attachments,
                (attachment, target) => provider.downloadAttachment(attachment, target)
            );

            downloaded += result.downloaded;
            skipped += result.skipped;
            failed += result.failed.length;
            failures.push(...result.failed.map((line) => `${page.title} / ${line}`));

            if(withChildren) {
                queue.push(...page.children.map((child) => child.id));
            }
        }

        const summary = [
            ...lines,
            `Pages: ${lines.length}. Attachments: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`
        ];

        if(failures.length > 0) {
            throw new Error([...summary, ...failures.map((line) => `  ${line}`)].join("\n"));
        }

        return summary.join("\n");
    }
}
