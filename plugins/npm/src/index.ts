import {Plugin} from "@wocker/core";
import {NpmController} from "./controllers/NpmController";
import {NpmService} from "./services/NpmService";
import {MailService} from "./services/MailService";


@Plugin({
    name: "npm",
    controllers: [NpmController],
    providers: [
        NpmService,
        MailService
    ]
})
export default class NpmPlugin {}
