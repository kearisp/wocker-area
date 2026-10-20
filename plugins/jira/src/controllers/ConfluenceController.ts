import {
    Controller,
    Command,
    Description,
    Param,
    Option
} from "@wocker/core";
import {ConfluenceService} from "../services/ConfluenceService";


@Controller()
@Description("Confluence commands")
export class ConfluenceController {
    public constructor(
        protected readonly confluenceService: ConfluenceService
    ) {}

    @Command("confluence:fetch <page>")
    @Description("Downloads a Confluence page with its attachments as markdown into the project.")
    public async fetch(
        @Param("page")
        page: string,
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
        path?: string,
        @Option("children", {
            type: "boolean",
            alias: "c",
            description: "Also download all descendant pages"
        })
        children?: boolean
    ): Promise<string> {
        return this.confluenceService.pull(page, name, path, children);
    }
}
