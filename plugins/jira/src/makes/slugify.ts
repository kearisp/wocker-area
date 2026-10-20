const MAX_LENGTH = 60;

export const slugify = (title: string): string => {
    const slug = title
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, MAX_LENGTH)
        .replace(/-+$/g, "");

    return slug || "page";
};

export const pageDirName = (page: {id: string; title: string}): string => {
    return `${page.id}-${slugify(page.title)}`;
};
