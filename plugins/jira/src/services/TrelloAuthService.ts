import {Injectable, Project} from "@wocker/core";
import {Http} from "@wocker/helpers";
import {CredentialsService} from "./CredentialsService";
import {createChallenge, createState, createVerifier} from "../makes/pkce";
import {openBrowser} from "../makes/openBrowser";
import {startOAuthCallbackServer} from "../makes/startOAuthCallbackServer";
import {OAuthTokens} from "../types";
import {
    TRELLO_ACCESS_TOKEN_KEY,
    TRELLO_CALLBACK_PORT,
    TRELLO_CLIENT_ID_KEY,
    TRELLO_EXPIRES_AT_KEY,
    TRELLO_NOT_LOGGED_IN_MESSAGE,
    TRELLO_REFRESH_TOKEN_KEY,
    TRELLO_SCOPES
} from "../env";


const AUTHORIZE_URL = "https://auth.atlassian.com/authorize";
const TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const REFRESH_MARGIN_MS = 60 * 1000;

export class TokenError extends Error {
    public constructor(
        public readonly code: string,
        message: string
    ) {
        super(message);
    }
}

export const buildAuthorizeUrl = (params: {clientId: string; redirectUri: string; challenge: string; state: string}): string => {
    const url = new URL(AUTHORIZE_URL);

    url.search = new URLSearchParams({
        client_id: params.clientId,
        scope: TRELLO_SCOPES.join(" "),
        redirect_uri: params.redirectUri,
        response_type: "code",
        prompt: "consent",
        code_challenge: params.challenge,
        code_challenge_method: "S256",
        state: params.state
    }).toString();

    return url.toString();
};

@Injectable()
export class TrelloAuthService {
    public constructor(
        protected readonly credentialsService: CredentialsService
    ) {}

    // Opens the browser and waits for the redirect; split out so tests can skip the real browser.
    protected async authorize(clientId: string, port: number, challenge: string, state: string): Promise<{code: string; redirectUri: string}> {
        const server = await startOAuthCallbackServer(port, state),
              redirectUri = `http://127.0.0.1:${server.port}/callback`,
              url = buildAuthorizeUrl({clientId, redirectUri, challenge, state});

        console.info(`Open this URL in your browser to log in to Trello:\n\n${url}\n`);
        openBrowser(url);

        return {code: await server.code, redirectUri};
    }

    protected async requestToken(body: Record<string, string>): Promise<OAuthTokens> {
        const res = await Http.post(TOKEN_URL).withJson(body).send();

        let data: any = {};

        try {
            data = await res.json();
        }
        catch(err) {}

        if(!res.ok) {
            throw new TokenError(data.error || String(res.status), `Token request failed: ${data.error || res.status} ${data.error_description || ""}`.trim());
        }

        return data;
    }

    public async login(clientId: string, scope?: Project, port = TRELLO_CALLBACK_PORT): Promise<void> {
        const verifier = createVerifier(),
              state = createState(),
              {code, redirectUri} = await this.authorize(clientId, port, createChallenge(verifier), state);

        const tokens = await this.requestToken({
            grant_type: "authorization_code",
            client_id: clientId,
            code,
            redirect_uri: redirectUri,
            code_verifier: verifier
        });

        await this.credentialsService.set(TRELLO_CLIENT_ID_KEY, clientId, scope);
        await this.saveTokens(tokens, scope);
    }

    public async getAccessToken(project: Project): Promise<string> {
        // Tokens are refreshed in the place they were stored: refresh tokens are single-use.
        const scope = await project.getSecret(TRELLO_REFRESH_TOKEN_KEY) ? project : undefined;

        const [accessToken, expiresAt, refreshToken, clientId] = await Promise.all([
            this.credentialsService.getValue(TRELLO_ACCESS_TOKEN_KEY, scope),
            this.credentialsService.getValue(TRELLO_EXPIRES_AT_KEY, scope),
            this.credentialsService.getValue(TRELLO_REFRESH_TOKEN_KEY, scope),
            this.credentialsService.getValue(TRELLO_CLIENT_ID_KEY, project)
        ]);

        if(!accessToken) {
            throw new Error(TRELLO_NOT_LOGGED_IN_MESSAGE);
        }

        if(Number(expiresAt) - Date.now() > REFRESH_MARGIN_MS) {
            return accessToken;
        }

        if(!refreshToken || !clientId) {
            throw new Error(TRELLO_NOT_LOGGED_IN_MESSAGE);
        }

        let tokens: OAuthTokens;

        try {
            tokens = await this.requestToken({
                grant_type: "refresh_token",
                client_id: clientId,
                refresh_token: refreshToken
            });
        }
        catch(err) {
            if(err instanceof TokenError && err.code === "invalid_grant") {
                throw new Error("The Trello session has expired. Run \"ws trello:login\" to log in again.");
            }

            throw err;
        }

        await this.saveTokens(tokens, scope);

        return tokens.access_token;
    }

    protected async saveTokens(tokens: OAuthTokens, scope?: Project): Promise<void> {
        // The refresh token goes first: the old one is already spent.
        if(tokens.refresh_token) {
            await this.credentialsService.set(TRELLO_REFRESH_TOKEN_KEY, tokens.refresh_token, scope);
        }

        await this.credentialsService.set(TRELLO_ACCESS_TOKEN_KEY, tokens.access_token, scope);
        await this.credentialsService.set(TRELLO_EXPIRES_AT_KEY, String(Date.now() + tokens.expires_in * 1000), scope);
    }
}
