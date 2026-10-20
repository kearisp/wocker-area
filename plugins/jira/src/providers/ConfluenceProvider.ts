import {Writable} from "stream";
import {ConfluencePage, JiraAttachment} from "../types";


export abstract class ConfluenceProvider {
    public abstract resolvePageId(input: string): Promise<string>;
    public abstract getPage(id: string): Promise<ConfluencePage>;
    public abstract downloadAttachment(attachment: JiraAttachment, target: Writable): Promise<void>;
}
