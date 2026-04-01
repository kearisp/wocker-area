import {Plugin} from "@wocker/core";
import {NpmController} from "./controllers/NpmController";


@Plugin({
    name: "npm",
    controllers: [NpmController]
})
export default class NpmPlugin {}
