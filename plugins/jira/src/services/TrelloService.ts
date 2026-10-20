import {Injectable, Project, ProjectService} from "@wocker/core";
import {promptInput} from "@wocker/prompts";
import FS from "fs";
import Path from "path";
import {CredentialsService} from "./CredentialsService";
import {DataPathService} from "./DataPathService";
import {TrelloAuthService} from "./TrelloAuthService";
import {TrelloProvider} from "../providers/TrelloProvider";
import {TrelloCloudProvider} from "../providers/TrelloCloudProvider";
import {renderCardMarkdown} from "../makes/CardMarkdown";
import {parseCardId} from "../makes/parseCardId";
import {saveAttachments} from "../makes/saveAttachments";
import {pageDirName, slugify} from "../makes/slugify";
import {ATTACHMENTS_DIR, CARDS_DIR, TRELLO_CALLBACK_PORT, TRELLO_CLIENT_ID_KEY} from "../env";


@Injectable()
export class TrelloService {
    public constructor(
        protected readonly credentialsService: CredentialsService,
        protected readonly projectService: ProjectService,
        protected readonly dataPathService: DataPathService,
        protected readonly trelloAuthService: TrelloAuthService
    ) {}

    protected createProvider(project: Project): TrelloProvider {
        return new TrelloCloudProvider(() => this.trelloAuthService.getAccessToken(project));
    }

    public async login(name?: string, local?: boolean, clientIdOption?: string, portOption?: string): Promise<string> {
        const project = local ? this.projectService.get(name) : undefined,
              port = portOption ? Number(portOption) : TRELLO_CALLBACK_PORT;

        if(!Number.isInteger(port) || port < 0 || port > 65535) {
            throw new Error(`Invalid port: ${portOption}`);
        }

        const clientId = clientIdOption
            || await this.credentialsService.getValue(TRELLO_CLIENT_ID_KEY, project)
            || await promptInput({
                message: "Trello OAuth client ID",
                required: true
            });

        await this.trelloAuthService.login(clientId, project, port);

        return "Logged in to Trello.";
    }

    public async fetch(input: string, name?: string, pathOverride?: string): Promise<string> {
        const cardId = parseCardId(input),
              project = this.projectService.get(name),
              dataPath = await this.dataPathService.resolve(project, pathOverride),
              provider = this.createProvider(project),
              card = await provider.getCard(cardId),
              dir = Path.join(project.path, dataPath, CARDS_DIR, pageDirName({id: card.shortLink, title: card.title})),
              file = Path.join(dir, `${slugify(card.title)}.md`);

        FS.mkdirSync(dir, {recursive: true});
        FS.writeFileSync(file, renderCardMarkdown(card));

        const {downloaded, skipped, failed} = await saveAttachments(
            Path.join(dir, ATTACHMENTS_DIR),
            card.attachments,
            (attachment, target) => provider.downloadAttachment(attachment, target)
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
}
