import {
    Controller,
    Command,
    Description,
    Param,
    Option
} from "@wocker/core";
import {TrelloService} from "../services/TrelloService";


@Controller()
@Description("Trello commands")
export class TrelloController {
    public constructor(
        protected readonly trelloService: TrelloService
    ) {}

    @Command("trello:login")
    @Description("Logs in to Trello with OAuth 2.0 in the browser and stores the tokens in the keystore.")
    public async login(
        @Option("name", {
            type: "string",
            alias: "n",
            description: "Project name"
        })
        name?: string,
        @Option("local", {
            type: "boolean",
            alias: "l",
            description: "Store the tokens for this project only"
        })
        local?: boolean,
        @Option("client-id", {
            type: "string",
            description: "OAuth client ID (saved for next time)"
        })
        clientId?: string,
        @Option("port", {
            type: "string",
            description: "Local callback port; must match the callback URL of the OAuth client"
        })
        port?: string
    ): Promise<string> {
        return this.trelloService.login(name, local, clientId, port);
    }

    @Command("trello:fetch <card>")
    @Description("Downloads a Trello card with its attachments as markdown into the project.")
    public async fetch(
        @Param("card")
        card: string,
        @Option("name", {
            type: "string",
            alias: "n",
            description: "Project name"
        })
        name?: string,
        @Option("path", {
            type: "string",
            alias: "p",
            description: "Directory (relative to the project) to use instead of the saved one"
        })
        path?: string
    ): Promise<string> {
        return this.trelloService.fetch(card, name, path);
    }
}
