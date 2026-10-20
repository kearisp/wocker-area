import Http from "http";


export type OAuthCallbackServer = {
    port: number;
    code: Promise<string>;
};

const page = (title: string, text: string): string => {
    return `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font-family:sans-serif;margin:3em"><h2>${title}</h2><p>${text}</p></body>`;
};

// Listens on loopback until the authorization server redirects back with a code.
export const startOAuthCallbackServer = (port: number, state: string, timeoutMs = 5 * 60 * 1000): Promise<OAuthCallbackServer> => {
    return new Promise((resolveStart, rejectStart) => {
        let resolveCode: (code: string) => void,
            rejectCode: (err: Error) => void;

        const code = new Promise<string>((resolve, reject) => {
            resolveCode = resolve;
            rejectCode = reject;
        });
        // Nobody may be awaiting the code yet when the timer fires.
        code.catch(() => {});

        const server = Http.createServer((req, res) => {
            const url = new URL(req.url || "/", "http://127.0.0.1");

            if(url.pathname !== "/callback") {
                res.writeHead(404).end();
                return;
            }

            const error = url.searchParams.get("error"),
                  received = url.searchParams.get("code");

            res.writeHead(error || url.searchParams.get("state") !== state || !received ? 400 : 200, {
                "Content-Type": "text/html; charset=utf-8"
            });

            if(error) {
                res.end(page("Login failed", error));
                rejectCode(new Error(`Authorization failed: ${error} ${url.searchParams.get("error_description") || ""}`.trim()));
            }
            else if(url.searchParams.get("state") !== state) {
                res.end(page("Login failed", "The state parameter does not match."));
                rejectCode(new Error("Authorization failed: the state parameter does not match."));
            }
            else if(!received) {
                res.end(page("Login failed", "No authorization code was returned."));
                rejectCode(new Error("Authorization failed: no code was returned."));
            }
            else {
                res.end(page("Logged in", "You can close this tab and return to the terminal."));
                resolveCode(received);
            }

            clearTimeout(timer);
            server.close();
            server.closeAllConnections();
        });

        const timer = setTimeout(() => {
            rejectCode(new Error("Timed out waiting for the browser login."));
            server.close();
            server.closeAllConnections();
        }, timeoutMs);

        server.on("error", (err: NodeJS.ErrnoException) => {
            clearTimeout(timer);
            rejectStart(err.code === "EADDRINUSE"
                ? new Error(`Port ${port} is already in use. Pass another one with --port (it must match the callback URL of your OAuth client).`)
                : err);
        });

        server.listen(port, "127.0.0.1", () => {
            resolveStart({
                port: (server.address() as {port: number}).port,
                code
            });
        });
    });
};
