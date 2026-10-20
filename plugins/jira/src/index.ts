import {Plugin} from "@wocker/core";
import {ConfluenceController} from "./controllers/ConfluenceController";
import {JiraController} from "./controllers/JiraController";
import {TrelloController} from "./controllers/TrelloController";
import {ConfluenceService} from "./services/ConfluenceService";
import {CredentialsService} from "./services/CredentialsService";
import {DataPathService} from "./services/DataPathService";
import {JiraService} from "./services/JiraService";
import {TrelloAuthService} from "./services/TrelloAuthService";
import {TrelloService} from "./services/TrelloService";


@Plugin({
    name: "jira",
    controllers: [
        JiraController,
        ConfluenceController,
        TrelloController
    ],
    providers: [
        CredentialsService,
        DataPathService,
        JiraService,
        ConfluenceService,
        TrelloAuthService,
        TrelloService
    ]
})
export default class JiraPlugin {}
