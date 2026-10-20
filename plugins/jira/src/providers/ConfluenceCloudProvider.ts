import {Writable} from "stream";
import {ConfluenceProvider} from "./ConfluenceProvider";
import {AtlassianClient} from "../clients/AtlassianClient";
import {AdfNode, AdfRenderer} from "../makes/AdfRenderer";
import {assignLocalNames} from "../makes/assignLocalNames";
import {formatDate} from "../makes/formatDate";
import {makeMediaResolver} from "../makes/makeMediaResolver";
import {isTinyLink, parsePageId} from "../makes/parsePageId";
import {
    ConfluenceComment,
    ConfluencePage,
    ConfluenceRef,
    JiraAttachment,
    JiraCredentials
} from "../types";


const ADF = {"body-format": "atlas_doc_format"};

const parseBody = (entity: any): AdfNode | null => {
    const value = entity?.body?.atlas_doc_format?.value;

    if(!value) {
        return null;
    }

    return typeof value === "string" ? JSON.parse(value) : value;
};

export class ConfluenceCloudProvider extends ConfluenceProvider {
    protected readonly client: AtlassianClient;
    protected readonly users = new Map<string, Promise<string>>();

    public constructor(credentials: JiraCredentials) {
        super();

        this.client = new AtlassianClient(credentials);
    }

    protected get wikiUrl(): string {
        return `${this.client.baseUrl}/wiki`;
    }

    public async resolvePageId(input: string): Promise<string> {
        const id = parsePageId(input);

        if(id) {
            return id;
        }

        if(isTinyLink(input)) {
            const url = new URL(input),
                  resolved = parsePageId(await this.client.finalUrl(url.pathname + url.search));

            if(resolved) {
                return resolved;
            }
        }

        throw new Error(`Cannot find a Confluence page id in "${input}". Pass a page URL or id.`);
    }

    // Follows `_links.next` cursors, which already carry the original query.
    protected async getAll<T = any>(path: string, query: Record<string, any> = {}): Promise<T[]> {
        const results: T[] = [];

        let next: string | undefined = path,
            params: Record<string, any> = query;

        while(next) {
            const page: any = await this.client.get(next, params);

            results.push(...page.results || []);
            next = page._links?.next;
            params = {};
        }

        return results;
    }

    protected getUserName(accountId?: string): Promise<string> {
        if(!accountId) {
            return Promise.resolve("");
        }

        let name = this.users.get(accountId);

        if(!name) {
            name = this.client
                .get<any>("/wiki/rest/api/user", {accountId})
                .then((user) => user.displayName || accountId)
                .catch(() => accountId);

            this.users.set(accountId, name);
        }

        return name;
    }

    protected toAttachments(items: any[]): JiraAttachment[] {
        return assignLocalNames(
            items.map((item) => {
                const link: string = item.downloadLink || item._links?.download || "";

                return {
                    id: String(item.id),
                    filename: item.title,
                    size: item.fileSize || 0,
                    mimeType: item.mediaType || "",
                    url: link.startsWith("/wiki") ? `${this.client.baseUrl}${link}` : `${this.wikiUrl}${link}`,
                    mediaId: item.fileId
                };
            })
        );
    }

    public async getPage(id: string): Promise<ConfluencePage> {
        const page = await this.client.get<any>(`/wiki/api/v2/pages/${id}`, ADF);

        const [space, labels, attachmentItems, footerItems, inlineItems, childItems] = await Promise.all([
            this.client.get<any>(`/wiki/api/v2/spaces/${page.spaceId}`),
            this.getAll(`/wiki/api/v2/pages/${id}/labels`),
            this.getAll(`/wiki/api/v2/pages/${id}/attachments`),
            this.getAll(`/wiki/api/v2/pages/${id}/footer-comments`, ADF),
            this.getAll(`/wiki/api/v2/pages/${id}/inline-comments`, ADF),
            this.getAll(`/wiki/api/v2/pages/${id}/children`)
        ]);

        const attachments = this.toAttachments(attachmentItems),
              renderer = new AdfRenderer(makeMediaResolver(attachments));

        const toComment = async (item: any, kind: ConfluenceComment["kind"]): Promise<ConfluenceComment> => ({
            id: String(item.id),
            kind,
            author: await this.getUserName(item.version?.authorId) || "Unknown",
            created: formatDate(item.version?.createdAt),
            quote: kind === "inline" ? item.properties?.inlineOriginalSelection : undefined,
            body: renderer.render(parseBody(item))
        });
        const comments = await Promise.all([
            ...footerItems.map((item) => toComment(item, "footer")),
            ...inlineItems.map((item) => toComment(item, "inline"))
        ]);

        const children: ConfluenceRef[] = childItems.map((item: any) => ({
            id: String(item.id),
            title: item.title,
            url: `${this.wikiUrl}/pages/viewpage.action?pageId=${item.id}`
        }));

        return {
            id: String(page.id),
            title: page.title || "",
            url: `${page._links?.base || this.wikiUrl}${page._links?.webui || `/pages/viewpage.action?pageId=${page.id}`}`,
            space: space.key ? `${space.name} (${space.key})` : "",
            author: await this.getUserName(page.authorId),
            created: formatDate(page.createdAt),
            updated: formatDate(page.version?.createdAt),
            version: page.version?.number || 0,
            labels: labels.map((label: any) => label.name),
            body: renderer.render(parseBody(page)),
            children,
            comments: comments.sort((a, b) => a.created.localeCompare(b.created)),
            attachments
        };
    }

    public async downloadAttachment(attachment: JiraAttachment, target: Writable): Promise<void> {
        await this.client.download(attachment.url, target, attachment.filename);
    }
}
