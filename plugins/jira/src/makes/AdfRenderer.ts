export type AdfMark = {
    type: string;
    attrs?: Record<string, any>;
};

export type AdfNode = {
    type: string;
    text?: string;
    attrs?: Record<string, any>;
    marks?: AdfMark[];
    content?: AdfNode[];
};

export type ResolvedMedia = {
    name: string;
    path: string;
    image: boolean;
};

export type MediaResolver = (attrs: Record<string, any>) => ResolvedMedia | null;

const INLINE_TYPES = ["hardBreak", "mention", "emoji", "inlineCard", "status", "date", "mediaInline", "inlineExtension"];

export const encodeLinkPath = (path: string): string => {
    return encodeURI(path).replace(/\(/g, "%28").replace(/\)/g, "%29");
};

export class AdfRenderer {
    public constructor(
        protected readonly resolveMedia: MediaResolver = () => null
    ) {}

    public render(doc?: AdfNode | null): string {
        if(!doc) {
            return "";
        }

        return this.blocks(doc.content || []).trim();
    }

    protected blocks(nodes: AdfNode[], separator = "\n\n"): string {
        return nodes
            .map((node) => this.block(node))
            .filter((text) => text !== "")
            .join(separator);
    }

    protected block(node: AdfNode): string {
        const content = node.content || [];

        switch(node.type) {
            case "paragraph":
                return this.inlines(content);

            case "heading":
                return `${"#".repeat(node.attrs?.level || 1)} ${this.inlines(content)}`;

            case "bulletList":
                return this.list(content, () => "- ");

            case "orderedList": {
                const start = Number(node.attrs?.order ?? 1);

                return this.list(content, (index) => `${start + index}. `);
            }

            case "taskList":
                return this.list(content, (index) => {
                    return content[index].attrs?.state === "DONE" ? "- [x] " : "- [ ] ";
                });

            case "decisionList":
                return this.list(content, () => "- ");

            case "codeBlock":
                return `\`\`\`${node.attrs?.language || ""}\n${content.map((item) => item.text || "").join("")}\n\`\`\``;

            case "blockquote":
                return this.quote(this.blocks(content));

            case "rule":
                return "---";

            case "panel": {
                const type: string = node.attrs?.panelType || "info",
                      label = type.charAt(0).toUpperCase() + type.slice(1);

                return this.quote(`**${label}**\n\n${this.blocks(content)}`);
            }

            case "expand":
            case "nestedExpand": {
                const title = node.attrs?.title ? `**${node.attrs.title}**` : "";

                return [title, this.blocks(content)].filter(Boolean).join("\n\n");
            }

            case "table":
                return this.table(content);

            case "mediaSingle":
            case "mediaGroup":
                return content.map((item) => this.media(item)).join("\n\n");

            case "media":
                return this.media(node);

            case "extension":
                return this.macro(node);

            default:
                if(node.text !== undefined || INLINE_TYPES.includes(node.type)) {
                    return this.inline(node);
                }

                return this.blocks(content);
        }
    }

    protected list(items: AdfNode[], marker: (index: number) => string): string {
        return items
            .map((item, index) => {
                const prefix = marker(index),
                      indent = " ".repeat(prefix.length),
                      [first, ...rest] = this.blocks(item.content || [], "\n").split("\n");

                return [
                    prefix + first,
                    ...rest.map((line) => line ? indent + line : line)
                ].join("\n");
            })
            .join("\n");
    }

    protected quote(text: string): string {
        return text
            .split("\n")
            .map((line) => line ? `> ${line}` : ">")
            .join("\n");
    }

    protected table(rows: AdfNode[]): string {
        if(rows.length === 0) {
            return "";
        }

        const cell = (node: AdfNode): string => {
            return this.blocks(node.content || [], "<br>")
                .replace(/\n/g, "<br>")
                .replace(/\|/g, "\\|");
        };
        const lines = rows.map((row) => `| ${(row.content || []).map(cell).join(" | ")} |`),
              columns = Math.max(...rows.map((row) => (row.content || []).length));

        lines.splice(1, 0, `| ${Array(columns).fill("---").join(" | ")} |`);

        return lines.join("\n");
    }

    protected media(node: AdfNode): string {
        if(node.type !== "media" && node.type !== "mediaInline") {
            return this.blocks(node.content || []);
        }

        const attrs = node.attrs || {},
              resolved = this.resolveMedia(attrs);

        if(!resolved) {
            return `[attachment unavailable: ${attrs.alt || attrs.id || "unknown"}]`;
        }

        const link = `(${encodeLinkPath(resolved.path)})`;

        return resolved.image
            ? `![${resolved.name}]${link}`
            : `[${resolved.name}]${link}`;
    }

    // Confluence macros have no markdown form; keep their name so the reader knows something was there.
    protected macro(node: AdfNode): string {
        const name = node.attrs?.text || node.attrs?.extensionKey || "unknown";

        return `[macro: ${name}]`;
    }

    protected inlines(nodes: AdfNode[]): string {
        return nodes.map((node) => this.inline(node)).join("");
    }

    protected inline(node: AdfNode): string {
        switch(node.type) {
            case "text":
                return this.marks(node.text || "", node.marks || []);

            case "hardBreak":
                return "  \n";

            case "mention":
                return node.attrs?.text || "@user";

            case "emoji":
                return node.attrs?.text || node.attrs?.shortName || "";

            case "inlineCard": {
                const url = node.attrs?.url || "";

                return url ? `[${url}](${url})` : "";
            }

            case "status":
                return `[${node.attrs?.text || ""}]`;

            case "date":
                return new Date(Number(node.attrs?.timestamp)).toISOString().slice(0, 10);

            case "media":
            case "mediaInline":
                return this.media(node);

            case "inlineExtension":
                return this.macro(node);

            default:
                return this.inlines(node.content || []);
        }
    }

    protected marks(text: string, marks: AdfMark[]): string {
        return marks.reduce((result, mark) => {
            switch(mark.type) {
                case "strong":
                    return `**${result}**`;

                case "em":
                    return `_${result}_`;

                case "strike":
                    return `~~${result}~~`;

                case "code":
                    return `\`${result}\``;

                case "link":
                    return `[${result}](${mark.attrs?.href || ""})`;

                default:
                    return result;
            }
        }, text);
    }
}
