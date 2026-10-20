import {ApiClient} from "./ApiClient";
import {JiraCredentials} from "../types";


export class AtlassianClient extends ApiClient {
    public constructor(
        protected readonly credentials: JiraCredentials
    ) {
        super(credentials.url);
    }

    protected get loginHint(): string {
        return "Run \"ws jira:config\" to update them.";
    }

    protected async headers(): Promise<Record<string, string>> {
        const {email, token} = this.credentials;

        return {
            Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`,
            Accept: "application/json"
        };
    }
}
