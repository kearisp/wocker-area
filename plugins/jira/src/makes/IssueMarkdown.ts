import {ATTACHMENTS_DIR} from "../env";
import {JiraIssue, JiraIssueRef} from "../types";
import {encodeLinkPath} from "./AdfRenderer";
import {formatSize} from "./formatSize";


const formatRef = (ref: JiraIssueRef): string => {
    const relation = ref.relation ? `${ref.relation} ` : "",
          status = ref.status ? ` (${ref.status})` : "";

    return `- ${relation}${ref.key} — ${ref.summary}${status}`;
};

export const renderIssueMarkdown = (issue: JiraIssue): string => {
    const sections: string[] = [`# ${issue.key}: ${issue.summary}`];

    const fields: [string, string][] = [
        ["URL", issue.url],
        ["Status", issue.status],
        ["Type", issue.type],
        ["Priority", issue.priority],
        ["Assignee", issue.assignee],
        ["Reporter", issue.reporter],
        ["Labels", issue.labels.join(", ")],
        ["Created", issue.created],
        ["Updated", issue.updated]
    ];

    sections.push(
        fields
            .filter(([, value]) => value)
            .map(([name, value]) => `- **${name}:** ${value}`)
            .join("\n")
    );

    if(issue.description) {
        sections.push(`## Description\n\n${issue.description}`);
    }

    if(issue.subtasks.length > 0) {
        sections.push(`## Subtasks\n\n${issue.subtasks.map(formatRef).join("\n")}`);
    }

    if(issue.links.length > 0) {
        sections.push(`## Linked issues\n\n${issue.links.map(formatRef).join("\n")}`);
    }

    if(issue.attachments.length > 0) {
        const lines = issue.attachments.map((attachment) => {
            const path = encodeLinkPath(`${ATTACHMENTS_DIR}/${attachment.localName}`);

            return `- [${attachment.filename}](${path}) (${formatSize(attachment.size)})`;
        });

        sections.push(`## Attachments\n\n${lines.join("\n")}`);
    }

    if(issue.comments.length > 0) {
        const comments = issue.comments.map((comment) => {
            return `### ${comment.author} — ${comment.created}\n\n${comment.body}`;
        });

        sections.push(`## Comments\n\n${comments.join("\n\n")}`);
    }

    return sections.join("\n\n") + "\n";
};
