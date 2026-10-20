export const formatDate = (value?: string): string => {
    return value ? value.slice(0, 16).replace("T", " ") : "";
};
