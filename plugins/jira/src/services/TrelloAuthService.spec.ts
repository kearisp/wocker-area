import {describe, it, expect, beforeEach} from "@jest/globals";
import {CredentialsService} from "./CredentialsService";
import {buildAuthorizeUrl, TokenError, TrelloAuthService} from "./TrelloAuthService";
import {OAuthTokens} from "../types";


class TestAuthService extends TrelloAuthService {
    public requests: Record<string, string>[] = [];
    public response: OAuthTokens | Error = {access_token: "new-access", refresh_token: "new-refresh", expires_in: 3600};
    public authorized?: {clientId: string; port: number; challenge: string; state: string};

    protected async authorize(clientId: string, port: number, challenge: string, state: string) {
        this.authorized = {clientId, port, challenge, state};

        return {code: "the-code", redirectUri: `http://127.0.0.1:${port}/callback`};
    }

    protected async requestToken(body: Record<string, string>): Promise<OAuthTokens> {
        this.requests.push(body);

        if(this.response instanceof Error) {
            throw this.response;
        }

        return this.response;
    }
}

const memory = (initial: Record<string, string> = {}) => {
    const data = {...initial};

    return {data, get: async (key: string) => data[key], set: async (key: string, value: string) => { data[key] = value; }};
};

describe("buildAuthorizeUrl", () => {
    it("builds the PKCE authorization request", () => {
        const url = new URL(buildAuthorizeUrl({clientId: "cid", redirectUri: "http://127.0.0.1:1/callback", challenge: "ch", state: "st"}));

        expect(url.origin + url.pathname).toBe("https://auth.atlassian.com/authorize");
        expect(url.searchParams.get("client_id")).toBe("cid");
        expect(url.searchParams.get("scope")).toBe("read:board:trello read:member:trello offline_access");
        expect(url.searchParams.get("response_type")).toBe("code");
        expect(url.searchParams.get("code_challenge")).toBe("ch");
        expect(url.searchParams.get("code_challenge_method")).toBe("S256");
        expect(url.searchParams.get("state")).toBe("st");
        expect(url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:1/callback");
    });
});

describe("TrelloAuthService", () => {
    let keystore: ReturnType<typeof memory>;
    let projectSecrets: Record<string, string>;
    let project: any;
    let service: TestAuthService;

    beforeEach(() => {
        keystore = memory();
        projectSecrets = {};
        project = {
            getSecret: async (key: string) => projectSecrets[key],
            setSecret: async (key: string, value: string) => { projectSecrets[key] = value; }
        };
        service = new TestAuthService(new CredentialsService(keystore as any));
    });

    it("logs in: exchanges the code with the PKCE verifier and stores the tokens globally", async () => {
        await service.login("cid", undefined, 4000);

        expect(service.authorized?.port).toBe(4000);
        expect(service.requests[0]).toMatchObject({
            grant_type: "authorization_code",
            client_id: "cid",
            code: "the-code",
            redirect_uri: "http://127.0.0.1:4000/callback"
        });
        expect(keystore.data).toMatchObject({
            TRELLO_CLIENT_ID: "cid",
            TRELLO_ACCESS_TOKEN: "new-access",
            TRELLO_REFRESH_TOKEN: "new-refresh"
        });
        expect(Number(keystore.data.TRELLO_EXPIRES_AT)).toBeGreaterThan(Date.now());
    });

    it("logs in for one project when asked", async () => {
        await service.login("cid", project);

        expect(projectSecrets.TRELLO_ACCESS_TOKEN).toBe("new-access");
        expect(keystore.data.TRELLO_ACCESS_TOKEN).toBeUndefined();
    });

    it("sends a challenge that matches the verifier", async () => {
        await service.login("cid");

        const {createChallenge} = await import("../makes/pkce");

        expect(service.authorized?.challenge).toBe(createChallenge(service.requests[0].code_verifier));
    });

    it("returns a valid token without refreshing", async () => {
        keystore = memory({
            TRELLO_ACCESS_TOKEN: "old-access",
            TRELLO_REFRESH_TOKEN: "old-refresh",
            TRELLO_CLIENT_ID: "cid",
            TRELLO_EXPIRES_AT: String(Date.now() + 10 * 60 * 1000)
        });
        service = new TestAuthService(new CredentialsService(keystore as any));

        expect(await service.getAccessToken(project)).toBe("old-access");
        expect(service.requests).toEqual([]);
    });

    it("refreshes an expiring token and stores the rotated refresh token", async () => {
        keystore = memory({
            TRELLO_ACCESS_TOKEN: "old-access",
            TRELLO_REFRESH_TOKEN: "old-refresh",
            TRELLO_CLIENT_ID: "cid",
            TRELLO_EXPIRES_AT: String(Date.now() + 10 * 1000)
        });
        service = new TestAuthService(new CredentialsService(keystore as any));

        expect(await service.getAccessToken(project)).toBe("new-access");
        expect(service.requests[0]).toEqual({grant_type: "refresh_token", client_id: "cid", refresh_token: "old-refresh"});
        expect(keystore.data.TRELLO_REFRESH_TOKEN).toBe("new-refresh");
    });

    it("refreshes project tokens in the project, not globally", async () => {
        keystore = memory({TRELLO_CLIENT_ID: "cid"});
        service = new TestAuthService(new CredentialsService(keystore as any));
        Object.assign(projectSecrets, {
            TRELLO_ACCESS_TOKEN: "old-access",
            TRELLO_REFRESH_TOKEN: "old-refresh",
            TRELLO_EXPIRES_AT: "0"
        });

        await service.getAccessToken(project);

        expect(projectSecrets.TRELLO_REFRESH_TOKEN).toBe("new-refresh");
        expect(keystore.data.TRELLO_REFRESH_TOKEN).toBeUndefined();
    });

    it("asks to log in again when the refresh token is rejected", async () => {
        keystore = memory({
            TRELLO_ACCESS_TOKEN: "old-access",
            TRELLO_REFRESH_TOKEN: "old-refresh",
            TRELLO_CLIENT_ID: "cid",
            TRELLO_EXPIRES_AT: "0"
        });
        service = new TestAuthService(new CredentialsService(keystore as any));
        service.response = new TokenError("invalid_grant", "nope");

        await expect(service.getAccessToken(project)).rejects.toThrow("ws trello:login");
        expect(keystore.data.TRELLO_REFRESH_TOKEN).toBe("old-refresh");
    });

    it("asks to log in when there are no tokens", async () => {
        await expect(service.getAccessToken(project)).rejects.toThrow("Not logged in to Trello");
    });
});
