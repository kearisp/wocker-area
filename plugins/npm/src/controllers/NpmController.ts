import {
    Controller,
    Description,
    Command,
    Param,
    Event
} from "@wocker/core";
import {promptInput} from "@wocker/utils";
import {NpmService} from "../services/NpmService";
import {MailService} from "../services/MailService";


@Controller()
@Description("Npm commands")
export class NpmController {
    public constructor(
        protected readonly npmService: NpmService,
        protected readonly mailService: MailService
    ) {}

    @Command("npm:test")
    public async test() {
        console.log(process.stdin.isTTY, process.stdout.isTTY);

        await promptInput({
            message: "npm password"
        });

        return "";
    }

    @Command("npm:wait-otp")
    public async waitOtp() {
        await this.mailService.connect();

        const otp = await this.npmService.getOTP();

        console.log(`OTP: ${otp}`);
    }

    @Command("npm:login")
    public async login() {
        await this.npmService.login();
    }

    @Command("npm:create-token [package]")
    @Description("Create token for package")
    public async createToken(
        @Param("package")
        @Description("Package name")
        packageName?: string
    ) {
        if(!packageName) {
            packageName = await promptInput({
                type: "text",
                required: true,
                message: "Package name"
            });
        }

        await this.npmService.createToken(packageName);
    }

    @Event("finish")
    public async event() {
        await this.mailService.disconnect();
    }
}
