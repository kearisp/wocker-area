import {ATTACHMENTS_DIR} from "../env";
import {TrelloCard} from "../types";
import {encodeLinkPath} from "./AdfRenderer";
import {formatSize} from "./formatSize";


export const renderCardMarkdown = (card: TrelloCard): string => {
    const sections: string[] = [`# ${card.title}`];

    const fields: [string, string][] = [
        ["URL", card.url],
        ["Board", card.board],
        ["List", card.list],
        ["Labels", card.labels.join(", ")],
        ["Members", card.members.join(", ")],
        ["Due", card.due ? `${card.due}${card.dueComplete ? " (done)" : ""}` : ""],
        ["Archived", card.archived ? "yes" : ""],
        ["Updated", card.updated]
    ];

    sections.push(
        fields
            .filter(([, value]) => value)
            .map(([name, value]) => `- **${name}:** ${value}`)
            .join("\n")
    );

    if(card.description) {
        sections.push(`## Description\n\n${card.description}`);
    }

    for(const checklist of card.checklists) {
        const items = checklist.items.map((item) => `- [${item.done ? "x" : " "}] ${item.name}`);

        sections.push(`## Checklist: ${checklist.name}\n\n${items.join("\n") || "_empty_"}`);
    }

    if(card.links.length > 0) {
        sections.push(`## Links\n\n${card.links.map((link) => `- [${link.name}](${link.url})`).join("\n")}`);
    }

    if(card.attachments.length > 0) {
        const lines = card.attachments.map((attachment) => {
            const path = encodeLinkPath(`${ATTACHMENTS_DIR}/${attachment.localName}`);

            return `- [${attachment.filename}](${path}) (${formatSize(attachment.size)})`;
        });

        sections.push(`## Attachments\n\n${lines.join("\n")}`);
    }

    if(card.comments.length > 0) {
        const comments = card.comments.map((comment) => `### ${comment.author} — ${comment.created}\n\n${comment.body}`);

        sections.push(`## Comments\n\n${comments.join("\n\n")}`);
    }

    return sections.join("\n\n") + "\n";
};
