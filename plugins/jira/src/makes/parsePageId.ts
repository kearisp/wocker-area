export const isTinyLink = (input: string): boolean => {
    return /\/wiki\/x\/[\w-]+/.test(input);
};

export const parsePageId = (input: string): string | null => {
    const text = input.trim();

    if(/^\d+$/.test(text)) {
        return text;
    }

    const byQuery = text.match(/[?&]pageId=(\d+)/);

    if(byQuery) {
        return byQuery[1];
    }

    const byPath = text.match(/\/pages\/(\d+)(?:[/?#]|$)/);

    return byPath ? byPath[1] : null;
};
