export type NpmToken = {
    name: string;
    description: string | null;
    key: string;
    token: string;
    expiry: string;
    cidr: unknown;
    bypass_2fa: boolean;
    revoked: null;
    created: string;
    updated: null | string;
    accessed: null | string;
    permissions: {
        name: string;
        action: string;
    }[],
    scopes: {
        name: string;
        type: string;
    }[];
};
