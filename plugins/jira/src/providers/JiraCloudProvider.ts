import {Writable} from "stream";
import {JiraProvider} from "./JiraProvider";
import {AtlassianClient} from "../clients/AtlassianClient";
import {AdfNode, AdfRenderer} from "../makes/AdfRenderer";
import {assignLocalNames} from "../makes/assignLocalNames";
import {formatDate} from "../makes/formatDate";
import {makeMediaResolver} from "../makes/makeMediaResolver";
import {
    JiraAttachment,
    JiraComment,
    JiraCredentials,
    JiraIssue,
    JiraIssueRef
} from "../types";


const ISSUE_FIELDS = [
    "summary",
    "description",
    "status",
    "issuetype",
    "priority",
    "assignee",
    "reporter",
    "labels",
    "created",
    "updated",
    "attachment",
    "subtasks",
    "issuelinks"
];

const COMMENTS_PAGE_SIZE = 100;
const SEARCH_PAGE_SIZE = 100;

const toRef = (issue: any, relation?: string): JiraIssueRef => ({
    key: issue.key,
    summary: issue.fields?.summary || "",
    status: issue.fields?.status?.name || "",
    relation
});

export class JiraCloudProvider extends JiraProvider {
    protected readonly client: AtlassianClient;

    public constructor(credentials: JiraCredentials) {
        super();

        this.client = new AtlassianClient(credentials);
    }

    protected async getComments(key: string): Promise<any[]> {
        const comments: any[] = [];

        let startAt = 0;

        while(true) {
            const page = await this.client.get<any>(`/rest/api/3/issue/${key}/comment`, {
                startAt,
                maxResults: COMMENTS_PAGE_SIZE,
                orderBy: "created"
            });

            comments.push(...page.comments || []);
            startAt += (page.comments || []).length;

            if(!page.comments?.length || startAt >= page.total) {
                return comments;
            }
        }
    }

    public async searchIssueKeys(jql: string): Promise<string[]> {
        const keys: string[] = [];

        let nextPageToken: string | undefined;

        do {
            const page = await this.client.get<any>("/rest/api/3/search/jql", {
                jql,
                fields: "key",
                maxResults: SEARCH_PAGE_SIZE,
                ...nextPageToken ? {nextPageToken} : {}
            });

            keys.push(...(page.issues || []).map((issue: any) => issue.key));
            nextPageToken = page.isLast ? undefined : page.nextPageToken;
        }
        while(nextPageToken);

        return keys;
    }

    public async getIssue(key: string): Promise<JiraIssue> {
        const issue = await this.client.get<any>(`/rest/api/3/issue/${key}`, {
            fields: ISSUE_FIELDS.join(",")
        });
        const comments = await this.getComments(key),
              fields = issue.fields || {};

        const attachments: JiraAttachment[] = assignLocalNames(
            (fields.attachment || []).map((item: any) => ({
                id: String(item.id),
                filename: item.filename,
                size: item.size || 0,
                mimeType: item.mimeType || "",
                url: item.content
            }))
        );
        const renderer = new AdfRenderer(makeMediaResolver(attachments));

        return {
            key: issue.key,
            url: `${this.client.baseUrl}/browse/${issue.key}`,
            summary: fields.summary || "",
            status: fields.status?.name || "",
            type: fields.issuetype?.name || "",
            priority: fields.priority?.name || "",
            assignee: fields.assignee?.displayName || "",
            reporter: fields.reporter?.displayName || "",
            labels: fields.labels || [],
            created: formatDate(fields.created),
            updated: formatDate(fields.updated),
            description: renderer.render(fields.description as AdfNode | null),
            subtasks: (fields.subtasks || []).map((item: any) => toRef(item)),
            links: (fields.issuelinks || []).map((link: any): JiraIssueRef => {
                return link.outwardIssue
                    ? toRef(link.outwardIssue, link.type?.outward)
                    : toRef(link.inwardIssue, link.type?.inward);
            }),
            comments: comments.map((comment: any): JiraComment => ({
                id: String(comment.id),
                author: comment.author?.displayName || "Unknown",
                created: formatDate(comment.created),
                body: renderer.render(comment.body as AdfNode | null)
            })),
            attachments
        };
    }

    public async downloadAttachment(attachment: JiraAttachment, target: Writable): Promise<void> {
        await this.client.download(attachment.url, target, attachment.filename);
    }
}
