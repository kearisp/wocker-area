import {Http, HttpResponseException} from "@wocker/helpers";
import {Readable, Writable} from "stream";
import {pipeline} from "stream/promises";


export abstract class ApiClient {
    public readonly baseUrl: string;

    protected constructor(baseUrl: string) {
        this.baseUrl = baseUrl.replace(/\/+$/, "");
    }

    protected abstract headers(): Promise<Record<string, string>>;

    // What the user should run when the server rejects the credentials.
    protected abstract get loginHint(): string;

    // `path` is relative to the site root and may already carry a query string (pagination links do).
    public async get<T>(path: string, query: Record<string, any> = {}): Promise<T> {
        try {
            return await Http
                .base(this.baseUrl)
                .get(path)
                .withHeaders(await this.headers())
                .withQuery(query)
                .expectStatus(200)
                .json<T>();
        }
        catch(err) {
            if(err instanceof HttpResponseException) {
                const details = await this.readErrorMessages(err);

                throw new Error([this.describeFailure(err.status, path), details].filter(Boolean).join("\n"));
            }

            throw err;
        }
    }

    public async download(url: string, target: Writable, name: string): Promise<void> {
        const res = await Http
            .get(url)
            .withHeaders(await this.headers())
            .expectStatus(200)
            .send();

        if(!res.raw.body) {
            throw new Error(`Empty response for attachment "${name}"`);
        }

        await pipeline(Readable.from(res.raw.body as any), target);
    }

    public async finalUrl(path: string): Promise<string> {
        const res = await Http
            .base(this.baseUrl)
            .get(path)
            .withHeaders(await this.headers())
            .expectStatus(200)
            .send();

        await res.raw.body?.cancel().catch(() => {});

        return res.raw.url;
    }

    protected async readErrorMessages(err: HttpResponseException): Promise<string> {
        let text = "";

        try {
            text = await err.text();
        }
        catch(e) {
            return "";
        }

        try {
            const body: any = JSON.parse(text);

            return [
                ...body.errorMessages || [],
                ...Object.values(body.errors || {}),
                ...body.message ? [body.message] : []
            ].join("; ");
        }
        catch(e) {
            // Trello answers with plain text such as "invalid token".
            return text.trim().slice(0, 200);
        }
    }

    protected describeFailure(status: number, path: string): string {
        switch(status) {
            case 401:
                return `The server rejected the credentials (401). ${this.loginHint}`;

            case 403:
                return `Access is forbidden (403): ${path}`;

            case 404:
                return `Not found (404): ${path}`;

            default:
                return `Request failed with status ${status}: ${path}`;
        }
    }
}
