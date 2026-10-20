import {Writable} from "stream";
import {JiraAttachment, JiraIssue} from "../types";


export abstract class JiraProvider {
    public abstract searchIssueKeys(jql: string): Promise<string[]>;
    public abstract getIssue(key: string): Promise<JiraIssue>;
    public abstract downloadAttachment(attachment: JiraAttachment, target: Writable): Promise<void>;
}
