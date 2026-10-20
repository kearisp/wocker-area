import {Injectable, Project} from "@wocker/core";
import {promptPath} from "@wocker/prompts";
import Path from "path";
import {DATA_PATH_META, DEFAULT_DATA_PATH} from "../env";


@Injectable()
export class DataPathService {
    public async resolve(project: Project, override?: string): Promise<string> {
        return override
            || project.getMeta(DATA_PATH_META)
            || await this.ask(project);
    }

    public async ask(project: Project): Promise<string> {
        if(!process.stdin.isTTY) {
            throw new Error(`"${DATA_PATH_META}" is not set for this project. Run "ws jira:config --path" or pass --path.`);
        }

        const value = await promptPath({
            message: "Directory for Jira data (relative to the project): ",
            basePath: project.path,
            filter: "directory",
            showHidden: true,
            default: DEFAULT_DATA_PATH
        });
        const relative = Path.relative(project.path, Path.resolve(project.path, value)) || ".";

        project.setMeta(DATA_PATH_META, relative);
        project.save();

        return relative;
    }
}
