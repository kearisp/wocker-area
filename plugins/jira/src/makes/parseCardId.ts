export const parseCardId = (input: string): string => {
    const text = input.trim();

    const byUrl = text.match(/\/c\/([A-Za-z0-9]{8})(?:[/?#]|$)/);

    if(byUrl) {
        return byUrl[1];
    }

    if(/^[0-9a-f]{24}$/i.test(text) || /^[A-Za-z0-9]{8}$/.test(text)) {
        return text;
    }

    throw new Error(`Cannot find a Trello card in "${input}". Pass a card URL (https://trello.com/c/...), a short link or an id.`);
};
