import {ApiClient} from "./ApiClient";


export class TrelloClient extends ApiClient {
    public constructor(
        protected readonly getAccessToken: () => Promise<string>
    ) {
        super("https://trello.com");
    }

    protected get loginHint(): string {
        return "Run \"ws trello:login\" to log in again.";
    }

    protected async headers(): Promise<Record<string, string>> {
        return {
            Authorization: `Bearer ${await this.getAccessToken()}`,
            Accept: "application/json"
        };
    }
}
