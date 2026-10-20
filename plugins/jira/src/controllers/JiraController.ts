import {
    Controller,
    Command,
    Description,
    Param,
    Option
} from "@wocker/core";
import {JiraService} from "../services/JiraService";


@Controller()
@Description("Jira commands")
export class JiraController {
    public constructor(
        protected readonly jiraService: JiraService
    ) {}

    @Command("jira:config")
    @Description("Saves Jira URL, email and API token to the keystore.")
    public async config(
        @Option("name", {
            type: "string",
            alias: "n",
            description: "Project name"
        })
        name?: string,
        @Option("local", {
            type: "boolean",
            alias: "l",
            description: "Store the credentials for this project only"
        })
        local?: boolean,
        @Option("path", {
            type: "boolean",
            alias: "p",
            description: "Also choose the directory where tasks are saved"
        })
        path?: boolean
    ): Promise<void> {
        await this.jiraService.config(name, local, path);
    }

    @Command("jira:fetch <task>")
    @Description("Downloads a Jira task with its attachments as markdown into the project.")
    public async fetch(
        @Param("task")
        task: string,
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
        return this.jiraService.fetch(task, name, path);
    }

    @Command("jira:pull")
    @Description("Downloads all open Jira tasks assigned to you into the project.")
    public async pull(
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
        @Option("all", {
            type: "boolean",
            alias: "a",
            description: "Include done tasks"
        })
        all?: boolean,
        @Option("clear", {
            type: "boolean",
            alias: "c",
            description: "Delete previously pulled tasks that are no longer assigned to you"
        })
        clear?: boolean,
        @Option("yes", {
            type: "boolean",
            alias: "y",
            description: "Do not ask for confirmation before deleting"
        })
        yes?: boolean
    ): Promise<string> {
        return this.jiraService.pull(name, path, all, clear, yes);
    }
}
