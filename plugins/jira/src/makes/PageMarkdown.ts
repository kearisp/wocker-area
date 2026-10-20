import {ATTACHMENTS_DIR} from "../env";
import {ConfluencePage} from "../types";
import {encodeLinkPath} from "./AdfRenderer";
import {formatSize} from "./formatSize";
import {pageDirName, slugify} from "./slugify";


export type PageMarkdownOptions = {
    // Children are saved next to the page, so they can be linked locally.
    linkChildren?: boolean;
};

export const renderPageMarkdown = (page: ConfluencePage, options: PageMarkdownOptions = {}): string => {
    const sections: string[] = [`# ${page.title}`];

    const fields: [string, string][] = [
        ["URL", page.url],
        ["Space", page.space],
        ["Author", page.author],
        ["Created", page.created],
        ["Updated", page.updated],
        ["Version", page.version ? String(page.version) : ""],
        ["Labels", page.labels.join(", ")]
    ];

    sections.push(
        fields
            .filter(([, value]) => value)
            .map(([name, value]) => `- **${name}:** ${value}`)
            .join("\n")
    );

    if(page.body) {
        sections.push(page.body);
    }

    if(page.children.length > 0) {
        const lines = page.children.map((child) => {
            const target = options.linkChildren
                ? encodeLinkPath(`../${pageDirName(child)}/${slugify(child.title)}.md`)
                : child.url;

            return `- [${child.title}](${target})`;
        });

        sections.push(`## Child pages\n\n${lines.join("\n")}`);
    }

    if(page.attachments.length > 0) {
        const lines = page.attachments.map((attachment) => {
            const path = encodeLinkPath(`${ATTACHMENTS_DIR}/${attachment.localName}`);

            return `- [${attachment.filename}](${path}) (${formatSize(attachment.size)})`;
        });

        sections.push(`## Attachments\n\n${lines.join("\n")}`);
    }

    if(page.comments.length > 0) {
        const comments = page.comments.map((comment) => {
            const kind = comment.kind === "inline" ? " (inline)" : "",
                  quote = comment.quote ? `${comment.quote.split("\n").map((line) => `> ${line}`).join("\n")}\n\n` : "";

            return `### ${comment.author} — ${comment.created}${kind}\n\n${quote}${comment.body}`;
        });

        sections.push(`## Comments\n\n${comments.join("\n\n")}`);
    }

    return sections.join("\n\n") + "\n";
};
