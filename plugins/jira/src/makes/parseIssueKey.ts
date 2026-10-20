export const parseIssueKey = (input: string): string => {
    const match = input.match(/[A-Za-z][A-Za-z0-9_]*-\d+/);

    if(!match) {
        throw new Error(`Cannot find an issue key (like PROJ-123) in "${input}"`);
    }

    return match[0].toUpperCase();
};
