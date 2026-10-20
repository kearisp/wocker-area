import Crypto from "crypto";


const base64url = (buffer: Buffer): string => buffer.toString("base64url");

export const createVerifier = (): string => base64url(Crypto.randomBytes(48));

export const createChallenge = (verifier: string): string => {
    return base64url(Crypto.createHash("sha256").update(verifier).digest());
};

export const createState = (): string => base64url(Crypto.randomBytes(16));
