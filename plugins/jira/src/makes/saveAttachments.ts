import FS from "fs";
import Path from "path";
import {Writable} from "stream";
import {JiraAttachment} from "../types";


export type AttachmentDownloader = (attachment: JiraAttachment, target: Writable) => Promise<void>;

export type SaveAttachmentsResult = {
    downloaded: number;
    skipped: number;
    failed: string[];
};

export const saveAttachments = async (
    dir: string,
    attachments: JiraAttachment[],
    download: AttachmentDownloader
): Promise<SaveAttachmentsResult> => {
    const result: SaveAttachmentsResult = {downloaded: 0, skipped: 0, failed: []};

    if(attachments.length > 0) {
        FS.mkdirSync(dir, {recursive: true});
    }

    for(const attachment of attachments) {
        const file = Path.join(dir, attachment.localName);

        if(FS.existsSync(file) && FS.statSync(file).size === attachment.size) {
            result.skipped++;
            continue;
        }

        const target = FS.createWriteStream(file);

        try {
            await download(attachment, target);
            result.downloaded++;
        }
        catch(err) {
            // The stream may still be opening the file; removing it first would let the open recreate it.
            if(!target.closed) {
                await new Promise<void>((resolve) => {
                    target.once("close", () => resolve());
                    target.destroy();
                });
            }

            FS.rmSync(file, {force: true});
            result.failed.push(`${attachment.filename}: ${(err as Error).message}`);
        }
    }

    return result;
};
