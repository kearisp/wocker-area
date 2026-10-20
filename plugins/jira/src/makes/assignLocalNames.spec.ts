import {describe, it, expect} from "@jest/globals";
import {assignLocalNames} from "./assignLocalNames";


describe("assignLocalNames", () => {
    it("keeps ordinary names", () => {
        const [file] = assignLocalNames([{id: "1", filename: "shot.png"}]);

        expect(file.localName).toBe("shot.png");
    });

    it("replaces path separators and leading dots", () => {
        const result = assignLocalNames([
            {id: "1", filename: "../etc/passwd"},
            {id: "2", filename: ".env"}
        ]);

        expect(result.map((file) => file.localName)).toEqual([".._etc_passwd".replace(/^\.+/, "_"), "_env"]);
    });

    it("prefixes the id on collisions", () => {
        const result = assignLocalNames([
            {id: "1", filename: "a.txt"},
            {id: "2", filename: "a.txt"}
        ]);

        expect(result.map((file) => file.localName)).toEqual(["a.txt", "2_a.txt"]);
    });
});
