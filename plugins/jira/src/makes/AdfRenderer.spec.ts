import {describe, it, expect} from "@jest/globals";
import {AdfNode, AdfRenderer} from "./AdfRenderer";


const doc = (...content: AdfNode[]): AdfNode => ({type: "doc", content});
const text = (value: string, marks?: AdfNode["marks"]): AdfNode => ({type: "text", text: value, marks});
const paragraph = (...content: AdfNode[]): AdfNode => ({type: "paragraph", content});

describe("AdfRenderer", () => {
    const renderer = new AdfRenderer();

    it("renders empty input as an empty string", () => {
        expect(renderer.render(null)).toBe("");
        expect(renderer.render(doc())).toBe("");
    });

    it("renders paragraphs, headings and marks", () => {
        const result = renderer.render(doc(
            {type: "heading", attrs: {level: 2}, content: [text("Title")]},
            paragraph(
                text("bold", [{type: "strong"}]),
                text(" and "),
                text("code", [{type: "code"}]),
                text(" and "),
                text("site", [{type: "link", attrs: {href: "https://example.com"}}])
            )
        ));

        expect(result).toBe("## Title\n\n**bold** and `code` and [site](https://example.com)");
    });

    it("renders nested lists with indentation", () => {
        const result = renderer.render(doc({
            type: "bulletList",
            content: [
                {
                    type: "listItem",
                    content: [
                        paragraph(text("one")),
                        {
                            type: "orderedList",
                            content: [
                                {type: "listItem", content: [paragraph(text("a"))]},
                                {type: "listItem", content: [paragraph(text("b"))]}
                            ]
                        }
                    ]
                },
                {type: "listItem", content: [paragraph(text("two"))]}
            ]
        }));

        expect(result).toBe("- one\n  1. a\n  2. b\n- two");
    });

    it("renders code blocks, quotes and rules", () => {
        const result = renderer.render(doc(
            {type: "codeBlock", attrs: {language: "ts"}, content: [text("const a = 1;")]},
            {type: "blockquote", content: [paragraph(text("quoted"))]},
            {type: "rule"}
        ));

        expect(result).toBe("```ts\nconst a = 1;\n```\n\n> quoted\n\n---");
    });

    it("renders tables with a header separator and escaped pipes", () => {
        const result = renderer.render(doc({
            type: "table",
            content: [
                {
                    type: "tableRow",
                    content: [
                        {type: "tableHeader", content: [paragraph(text("A"))]},
                        {type: "tableHeader", content: [paragraph(text("B"))]}
                    ]
                },
                {
                    type: "tableRow",
                    content: [
                        {type: "tableCell", content: [paragraph(text("1"))]},
                        {type: "tableCell", content: [paragraph(text("x|y"))]}
                    ]
                }
            ]
        }));

        expect(result).toBe("| A | B |\n| --- | --- |\n| 1 | x\\|y |");
    });

    it("renders task lists and inline nodes", () => {
        const result = renderer.render(doc(
            {
                type: "taskList",
                content: [
                    {type: "taskItem", attrs: {state: "DONE"}, content: [text("done")]},
                    {type: "taskItem", attrs: {state: "TODO"}, content: [{type: "mention", attrs: {text: "@kris"}}]}
                ]
            },
            paragraph({type: "inlineCard", attrs: {url: "https://example.com/x"}})
        ));

        expect(result).toBe("- [x] done\n- [ ] @kris\n\n[https://example.com/x](https://example.com/x)");
    });

    it("keeps the name of Confluence macros", () => {
        const result = renderer.render(doc(
            {type: "extension", attrs: {extensionKey: "toc"}},
            paragraph(text("see "), {type: "inlineExtension", attrs: {text: "Jira issue"}}),
            {type: "bodiedExtension", attrs: {extensionKey: "details"}, content: [paragraph(text("inside"))]}
        ));

        expect(result).toBe("[macro: toc]\n\nsee [macro: Jira issue]\n\ninside");
    });

    it("links media to local files when they are resolved", () => {
        const media = new AdfRenderer((attrs) => {
            return attrs.alt === "shot.png"
                ? {name: "shot.png", path: "attachments/my shot.png", image: true}
                : attrs.alt === "spec.pdf"
                    ? {name: "spec.pdf", path: "attachments/spec.pdf", image: false}
                    : null;
        });
        const result = media.render(doc(
            {type: "mediaSingle", content: [{type: "media", attrs: {id: "1", alt: "shot.png"}}]},
            {type: "mediaGroup", content: [
                {type: "media", attrs: {id: "2", alt: "spec.pdf"}},
                {type: "media", attrs: {id: "3", alt: "gone.txt"}}
            ]}
        ));

        expect(result).toBe([
            "![shot.png](attachments/my%20shot.png)",
            "[spec.pdf](attachments/spec.pdf)",
            "[attachment unavailable: gone.txt]"
        ].join("\n\n"));
    });
});
