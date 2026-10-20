const sanitize = (filename: string): string => {
    const name = filename
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
        .replace(/^\.+/, "_")
        .trim();

    return name || "file";
};

export const assignLocalNames = <T extends {id: string; filename: string}>(attachments: T[]): (T & {localName: string})[] => {
    const used = new Set<string>();

    return attachments.map((attachment) => {
        let localName = sanitize(attachment.filename);

        if(used.has(localName)) {
            localName = `${attachment.id}_${localName}`;
        }

        used.add(localName);

        return {
            ...attachment,
            localName
        };
    });
};
