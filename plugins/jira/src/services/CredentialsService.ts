import {Injectable, KeystoreService, Project} from "@wocker/core";
import {JIRA_EMAIL_KEY, JIRA_TOKEN_KEY, JIRA_URL_KEY} from "../env";
import {JiraCredentials} from "../types";


@Injectable()
export class CredentialsService {
    public constructor(
        protected readonly keystoreService: KeystoreService
    ) {}

    // A project secret overrides the global one per field, so a project can
    // switch only the token or only the URL.
    public async getValue(key: string, project?: Project): Promise<string | undefined> {
        const local = project ? await project.getSecret(key) : undefined;

        return local || await this.keystoreService.get(key) || undefined;
    }

    public async get(project?: Project): Promise<JiraCredentials | null> {
        const [url, email, token] = await Promise.all([
            this.getValue(JIRA_URL_KEY, project),
            this.getValue(JIRA_EMAIL_KEY, project),
            this.getValue(JIRA_TOKEN_KEY, project)
        ]);

        if(!url || !email || !token) {
            return null;
        }

        return {url, email, token};
    }

    public async set(key: string, value: string, project?: Project): Promise<void> {
        if(project) {
            await project.setSecret(key, value);
        }
        else {
            await this.keystoreService.set(key, value);
        }
    }
}
