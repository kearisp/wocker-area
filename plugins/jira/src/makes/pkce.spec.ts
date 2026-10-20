import {describe, it, expect} from "@jest/globals";
import {createChallenge, createState, createVerifier} from "./pkce";


describe("pkce", () => {
    it("derives the challenge as in RFC 7636 appendix B", () => {
        expect(createChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
    });

    it("creates verifiers of an allowed length and alphabet", () => {
        const verifier = createVerifier();

        expect(verifier.length).toBeGreaterThanOrEqual(43);
        expect(verifier.length).toBeLessThanOrEqual(128);
        expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("creates different values on every call", () => {
        expect(createVerifier()).not.toBe(createVerifier());
        expect(createState()).not.toBe(createState());
    });
});
