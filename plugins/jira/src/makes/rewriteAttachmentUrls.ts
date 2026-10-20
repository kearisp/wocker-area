import {ATTACHMENTS_DIR} from "../env";
import {JiraAttachment} from "../types";
import {encodeLinkPath} from "./AdfRenderer";


// Trello descriptions and comments link uploaded files by their server URL, which contains the attachment id.
export const rewriteAttachmentUrls = (text: string, attachments: JiraAttachment[]): string => {
    if(attachments.length === 0) {
        return text;
    }

    return text.replace(/https?:\/\/[^\s)>\]]+/g, (url) => {
        const attachment = attachments.find((item) => url.includes(item.id));

        return attachment
            ? encodeLinkPath(`${ATTACHMENTS_DIR}/${attachment.localName}`)
            : url;
    });
};
