import {FetchMessageObject} from "imapflow";
import {simpleParser} from "mailparser";
import {parse as parseHtml} from "node-html-parser";


export class Message {
    public constructor(
        protected readonly data: FetchMessageObject
    ) {}

    public async html() {
        if(!this.data.source) {
            return null;
        }

        const parsedMail = await simpleParser(this.data.source);

        return parseHtml(parsedMail.html || "");
    }
}
