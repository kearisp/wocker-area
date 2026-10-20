import {describe, it, expect} from "@jest/globals";
import {startOAuthCallbackServer} from "./startOAuthCallbackServer";


const call = (port: number, query: string, path = "/callback"): Promise<number> => {
    return fetch(`http://127.0.0.1:${port}${path}${query}`).then((res) => res.status);
};

describe("startOAuthCallbackServer", () => {
    it("resolves with the code when the state matches", async () => {
        const server = await startOAuthCallbackServer(0, "s1");

        expect(await call(server.port, "?code=abc&state=s1")).toBe(200);
        await expect(server.code).resolves.toBe("abc");
    });

    it("rejects when the state does not match", async () => {
        const server = await startOAuthCallbackServer(0, "s1");

        expect(await call(server.port, "?code=abc&state=other")).toBe(400);
        await expect(server.code).rejects.toThrow("state parameter does not match");
    });

    it("rejects with the error returned by the authorization server", async () => {
        const server = await startOAuthCallbackServer(0, "s1");

        expect(await call(server.port, "?error=access_denied&state=s1")).toBe(400);
        await expect(server.code).rejects.toThrow("access_denied");
    });

    it("ignores requests to other paths", async () => {
        const server = await startOAuthCallbackServer(0, "s1");

        expect(await call(server.port, "", "/favicon.ico")).toBe(404);
        expect(await call(server.port, "?code=abc&state=s1")).toBe(200);
        await expect(server.code).resolves.toBe("abc");
    });

    it("times out", async () => {
        const server = await startOAuthCallbackServer(0, "s1", 50);

        await expect(server.code).rejects.toThrow("Timed out");
    });

    it("explains a busy port", async () => {
        const first = await startOAuthCallbackServer(0, "s1", 200);

        await expect(startOAuthCallbackServer(first.port, "s2")).rejects.toThrow("already in use");
        await expect(first.code).rejects.toThrow("Timed out");
    });
});
