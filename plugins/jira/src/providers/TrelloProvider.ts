import {Writable} from "stream";
import {JiraAttachment, TrelloCard} from "../types";


export abstract class TrelloProvider {
    public abstract getCard(id: string): Promise<TrelloCard>;
    public abstract downloadAttachment(attachment: JiraAttachment, target: Writable): Promise<void>;
}
