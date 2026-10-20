import {ATTACHMENTS_DIR} from "../env";
import {JiraAttachment} from "../types";
import {MediaResolver} from "./AdfRenderer";


// Jira media nodes only carry the file name in `alt`; Confluence ones carry the file UUID in `id`,
// which matches the attachment's `mediaId`.
export const makeMediaResolver = (attachments: JiraAttachment[]): MediaResolver => {
    return (attrs) => {
        const id = String(attrs.id ?? ""),
              alt: string = attrs.alt || "",
              attachment = attachments.find((item) => item.mediaId && item.mediaId === id)
                  || attachments.find((item) => item.filename === alt)
                  || attachments.find((item) => alt && item.filename.toLowerCase() === alt.toLowerCase())
                  || attachments.find((item) => item.id === id);

        if(!attachment) {
            return null;
        }

        return {
            name: attachment.filename,
            path: `${ATTACHMENTS_DIR}/${attachment.localName}`,
            image: attachment.mimeType.startsWith("image/")
        };
    };
};
