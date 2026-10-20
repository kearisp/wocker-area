import {Writable} from "stream";
import {TrelloProvider} from "./TrelloProvider";
import {TrelloClient} from "../clients/TrelloClient";
import {assignLocalNames} from "../makes/assignLocalNames";
import {formatDate} from "../makes/formatDate";
import {rewriteAttachmentUrls} from "../makes/rewriteAttachmentUrls";
import {JiraAttachment, TrelloCard, TrelloComment} from "../types";


const COMMENTS_PAGE_SIZE = 1000;

export class TrelloCloudProvider extends TrelloProvider {
    protected readonly client: TrelloClient;

    public constructor(getAccessToken: () => Promise<string>) {
        super();

        this.client = new TrelloClient(getAccessToken);
    }

    // Actions come newest first; `before` takes the id of the last one seen.
    protected async getComments(cardId: string): Promise<any[]> {
        const comments: any[] = [];

        let before: string | undefined;

        while(true) {
            const page = await this.client.get<any[]>(`/1/cards/${cardId}/actions`, {
                filter: "commentCard",
                limit: COMMENTS_PAGE_SIZE,
                ...before ? {before} : {}
            });

            comments.push(...page);

            if(page.length < COMMENTS_PAGE_SIZE) {
                return comments;
            }

            before = page[page.length - 1].id;
        }
    }

    public async getCard(id: string): Promise<TrelloCard> {
        const card = await this.client.get<any>(`/1/cards/${id}`, {
            fields: "name,desc,url,shortLink,due,dueComplete,dateLastActivity,closed,labels",
            members: "true",
            member_fields: "fullName,username",
            list: "true",
            list_fields: "name",
            board: "true",
            board_fields: "name",
            attachments: "true",
            attachment_fields: "all",
            checklists: "all"
        });
        const comments = await this.getComments(card.id);

        const uploads: JiraAttachment[] = assignLocalNames(
            (card.attachments || [])
                .filter((item: any) => item.isUpload)
                .map((item: any) => ({
                    id: String(item.id),
                    filename: item.fileName || item.name,
                    size: item.bytes || 0,
                    mimeType: item.mimeType || "",
                    url: item.url
                }))
        );
        const rewrite = (text: string): string => rewriteAttachmentUrls(text || "", uploads);

        return {
            id: card.id,
            shortLink: card.shortLink,
            url: card.url,
            title: card.name || "",
            board: card.board?.name || "",
            list: card.list?.name || "",
            labels: (card.labels || []).map((label: any) => label.name || label.color).filter(Boolean),
            members: (card.members || []).map((member: any) => member.fullName || member.username),
            due: formatDate(card.due),
            dueComplete: !!card.dueComplete,
            archived: !!card.closed,
            updated: formatDate(card.dateLastActivity),
            description: rewrite(card.desc),
            checklists: (card.checklists || [])
                .sort((a: any, b: any) => a.pos - b.pos)
                .map((checklist: any) => ({
                    name: checklist.name,
                    items: (checklist.checkItems || [])
                        .sort((a: any, b: any) => a.pos - b.pos)
                        .map((item: any) => ({name: item.name, done: item.state === "complete"}))
                })),
            comments: comments
                .map((action: any): TrelloComment => ({
                    id: action.id,
                    author: action.memberCreator?.fullName || action.memberCreator?.username || "Unknown",
                    created: formatDate(action.date),
                    body: rewrite(action.data?.text)
                }))
                .reverse(),
            links: (card.attachments || [])
                .filter((item: any) => !item.isUpload)
                .map((item: any) => ({name: item.name || item.url, url: item.url})),
            attachments: uploads
        };
    }

    public async downloadAttachment(attachment: JiraAttachment, target: Writable): Promise<void> {
        await this.client.download(attachment.url, target, attachment.filename);
    }
}
