import {describe, it, expect} from "@jest/globals";
import {parseIssueKey} from "./parseIssueKey";


describe("parseIssueKey", () => {
    it("returns a plain key upper-cased", () => {
        expect(parseIssueKey("proj-123")).toBe("PROJ-123");
    });

    it("extracts the key from a browse URL", () => {
        expect(parseIssueKey("https://acme.atlassian.net/browse/ABC-45?focusedCommentId=1")).toBe("ABC-45");
    });

    it("extracts the key from a board URL", () => {
        expect(parseIssueKey("https://acme.atlassian.net/jira/software/projects/ABC/boards/1?selectedIssue=ABC-7")).toBe("ABC-7");
    });

    it("throws when there is no key", () => {
        expect(() => parseIssueKey("nothing here")).toThrow("Cannot find an issue key");
    });
});
