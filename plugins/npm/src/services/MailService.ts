import {ImapFlow, ExistsEvent, MailboxLockObject} from "imapflow";
import {Injectable, KeystoreService} from "@wocker/core";
import {promptConfirm, promptInput} from "@wocker/prompts";
import {Message} from "../makes/Message";
import {
    MAIL_IMAP_HOST_KEY,
    MAIL_IMAP_LOGIN_KEY,
    MAIL_IMAP_PASSWORD_KEY,
    MAIL_IMAP_PORT_KEY,
    MAIL_IMAP_SECURE_KEY
} from "../env";


@Injectable()
export class MailService {
    protected _client?: ImapFlow;
    protected _lock?: MailboxLockObject;

    public constructor(
        protected readonly keystoreService: KeystoreService
    ) {}

    public async connect() {
        if(!this._client) {
            this._client = await this.getClient();

            await this._client.connect();
        }

        if(!this._lock) {
            this._lock = await this._client.getMailboxLock("INBOX");
            this._lock.release();
        }
    }

    public async disconnect() {
        if(this._lock) {
            this._lock.release();
        }

        if(this._client) {
            await this._client.logout();
        }
    }

    protected async getClient() {
        const host = await this.getHost();
        const port = await this.getPort();
        const secure = await this.getSecure();
        const user = await this.getLogin();
        const pass = await this.getPassword();

        return new ImapFlow({
            host,
            port,
            secure,
            auth: {
                user,
                pass
            },
            logger: false
        });
    }

    protected async getHost(): Promise<string> {
        let host = await this.keystoreService.get(MAIL_IMAP_HOST_KEY);

        if(!host) {
            host = await promptInput({
                type: "text",
                required: true,
                message: "IMAP Host"
            });

            await this.keystoreService.set(MAIL_IMAP_HOST_KEY, host);
        }

        return host;
    }

    protected async getPort(): Promise<number> {
        let port = await this.keystoreService.get(MAIL_IMAP_PORT_KEY);

        if(!port) {
            port = await promptInput({
                type: "text",
                required: true,
                message: "IMAP Port",
                initial: "993"
            });

            await this.keystoreService.set(MAIL_IMAP_PORT_KEY, port);
        }

        return parseInt(port, 10);
    }

    protected async getSecure(): Promise<boolean> {
        let secure = await this.keystoreService.get(MAIL_IMAP_SECURE_KEY);

        if(secure === undefined || secure === null) {
            const result = await promptConfirm({
                message: "IMAP Secure",
                default: true
            });

            secure = result ? "true" : "false";
            await this.keystoreService.set(MAIL_IMAP_SECURE_KEY, secure);
        }

        return secure === "true";
    }

    protected async getLogin(): Promise<string> {
        let login = await this.keystoreService.get(MAIL_IMAP_LOGIN_KEY);

        if(!login) {
            login = await promptInput({
                type: "text",
                required: true,
                message: "IMAP Login"
            });

            await this.keystoreService.set(MAIL_IMAP_LOGIN_KEY, login);
        }

        return login;
    }

    protected async getPassword(): Promise<string> {
        let password = await this.keystoreService.get(MAIL_IMAP_PASSWORD_KEY);

        if(!password) {
            password = await promptInput({
                type: "password",
                required: true,
                message: "IMAP Password"
            });

            await this.keystoreService.set(MAIL_IMAP_PASSWORD_KEY, password);
        }

        return password;
    }

    public async getLastMessage() {
        const client = await this.getClient();

        await client.connect();

        // const status = await client.status("INBOX", {
        //     messages: true,
        //     unseen: true,
        //     highestModseq: true
        // });

        // console.log(status);

        const lock = await client.getMailboxLock("INBOX");

        try {
            const message = await client.fetchOne("*", {
                envelope: true,
                source: true
            });

            if(!message) {
                return null;
            }

            return new Message(message);
        }
        finally {
            lock.release();
            await client.logout();
        }
    }

    public async waitForEmailFrom(from: string, timeout: number = 120000): Promise<Message> {
        const client = this._client;

        if(!client) {
            throw new Error("Unconnected");
        }

        const getMessage = async () => {
            const message = await client.fetchOne("*", {
                envelope: true,
                source: true
            });

            if(!message || !message.envelope) {
                return null;
            }

            const sender = message.envelope.from?.[0];

            if(!sender) {
                return null;
            }

            const senderEmail = `${sender.address}`.toLowerCase();
            const expectedEmail = from.toLowerCase();

            if(senderEmail !== expectedEmail) {
                return null;
            }

            return new Message(message);
        };

        return await new Promise<Message>((resolve, reject) => {
            const timer = setTimeout(async () => {
                cleanup();

                const message = await getMessage();

                if(!message) {
                    reject(new Error(`Timeout waiting for email from ${from}`));
                    return;
                }

                resolve(message);
            }, timeout);

            const cleanup = () => {
                clearTimeout(timer);
                client.removeListener("exists", onExists);
                client.removeListener("error", onError);
            };

            const onError = (err: any) => {
                cleanup();
                reject(err);
            };

            const onExists = async (data: ExistsEvent) => {
                console.log("onExists(", data, ")");

                if(data.count <= data.prevCount) {
                    return;
                }

                try {
                    const message = await getMessage();

                    if(message) {
                        cleanup();
                        resolve(message);
                    }
                }
                catch(err) {
                    cleanup();
                    reject(err);
                }
            };

            client.on("exists", onExists);
            client.on("error", onError);
        });
    }
}
