import {
    Injectable,
    KeystoreService,
    LogService
} from "@wocker/core";
import {promptInput} from "@wocker/prompts";
import {Http} from "@wocker/helpers";
import Config from "@npmcli/config";
import OS from "os";
import Path from "path";
import {MailService} from "./MailService";
import {
    NPM_LOGIN_KEY,
    NPM_PASSWORD_KEY
} from "../env";


@Injectable()
export class NpmService {
    public constructor(
        protected readonly keystoreService: KeystoreService,
        protected readonly logService: LogService,
        protected readonly mailService: MailService
    ) {}

    public get client() {
        return Http
            .base("https://registry.npmjs.org")
            .withHeaders({
                "Content-Type": "application/json"
            });
    }

    protected async getToken() {
        const { definitions, flatten, shorthands } = require("@npmcli/config/lib/definitions")

        const config = new Config({
            npmPath: Path.join(OS.homedir(), ".npmrc"),
            cwd: process.cwd(),
            definitions,
            flatten,
            shorthands
        });

        await config.load();

        return config.get("//registry.npmjs.org/:_authToken");
    }

    protected async getRootToken() {
        const NPM_TOKEN_KEY = "NPM_TOKEN";

        let token = await this.keystoreService.get(NPM_TOKEN_KEY);

        if(!token) {
            token = await promptInput({
                type: "password",
                required: true,
                message: "Token"
            });

            await this.keystoreService.set(NPM_TOKEN_KEY, token);
        }

        return token;
    }

    protected async getLogin() {
        let login = await this.keystoreService.get(NPM_LOGIN_KEY);

        if(!login) {
            login = await promptInput({
                type: "text",
                required: true,
                message: "Login"
            });

            await this.keystoreService.set(NPM_LOGIN_KEY, login);
        }

        return login;
    }

    protected async getPassword() {
        let password = await this.keystoreService.get(NPM_PASSWORD_KEY);

        if(!password) {
            password = await promptInput({
                type: "password",
                required: true,
                message: "Password"
            });

            await this.keystoreService.set(NPM_PASSWORD_KEY, password);
        }

        return password;
    }

    public async login() {
        // const login = await this.getLogin();
        // const password = await this.getPassword();
        //
        // const res = await this.client
        //     .post("/-/v1/login")
        //     .withJson({
        //         type: "user",
        //         name: await this.getLogin(),
        //         password: await this.getPassword(),
        //         roles: [],
        //         date: new Date().toISOString()
        //     })
        //     .send();
        //
        // console.log(res.status);
        // console.log(await res.json());
    }

    public async createToken(packageName: string) {
        const token = await this.getToken();
        const client = this.client.withHeaders({
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        });

        const data = {
            name: `Token for ${packageName}`,
            bypass_2fa: true,
            expires: 90,
            packages: [packageName],
            packages_and_scopes_permission: "read-write",
            password: await this.getPassword()
        };

        await this.mailService.connect();

        let res = await client.post("/-/npm/v1/tokens")
            .withJson(data)
            .expectStatus(() => true)
            .send();

        if(res.status === 401 && res.header("www-authenticate") === "OTP") {
            console.log(res.status, res.headers, await res.json());

            const otp = await this.getOTP();

            console.log("OTP:", otp);

            if(!otp) {
                throw new Error("Can't get otp");
            }

            res = await client.post("/-/npm/v1/tokens")
                .withHeader("npm-otp", otp)
                .withJson(data)
                .send();
        }

        console.log(res.status, await res.json());
    }

    public async getOTP() {
        console.log("Waiting for otp...");

        const message = await this.mailService.waitForEmailFrom("support@npmjs.com");

        if(!message) {
            return null;
        }

        const root = await message.html();

        if(!root) {
            return null;
        }

        const element = root.querySelectorAll("strong.text-gray-dark").find((element) => {
            return /^[0-9]+$/.test(element.innerText);
        });

        return element?.innerText || null;
    }
}
