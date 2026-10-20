export type JiraCredentials = {
    url: string;
    email: string;
    token: string;
};

export type JiraAttachment = {
    id: string;
    filename: string;
    localName: string;
    size: number;
    mimeType: string;
    url: string;
    mediaId?: string;
};

export type JiraIssueRef = {
    key: string;
    summary: string;
    status: string;
    relation?: string;
};

export type JiraComment = {
    id: string;
    author: string;
    created: string;
    body: string;
};

export type JiraIssue = {
    key: string;
    url: string;
    summary: string;
    status: string;
    type: string;
    priority: string;
    assignee: string;
    reporter: string;
    labels: string[];
    created: string;
    updated: string;
    description: string;
    subtasks: JiraIssueRef[];
    links: JiraIssueRef[];
    comments: JiraComment[];
    attachments: JiraAttachment[];
};

export type ConfluenceRef = {
    id: string;
    title: string;
    url: string;
};

export type ConfluenceComment = {
    id: string;
    kind: "footer" | "inline";
    author: string;
    created: string;
    quote?: string;
    body: string;
};

export type ConfluencePage = {
    id: string;
    title: string;
    url: string;
    space: string;
    author: string;
    created: string;
    updated: string;
    version: number;
    labels: string[];
    body: string;
    children: ConfluenceRef[];
    comments: ConfluenceComment[];
    attachments: JiraAttachment[];
};

export type TrelloChecklist = {
    name: string;
    items: {name: string; done: boolean}[];
};

export type TrelloComment = {
    id: string;
    author: string;
    created: string;
    body: string;
};

export type TrelloLink = {
    name: string;
    url: string;
};

export type TrelloCard = {
    id: string;
    shortLink: string;
    url: string;
    title: string;
    board: string;
    list: string;
    labels: string[];
    members: string[];
    due: string;
    dueComplete: boolean;
    archived: boolean;
    updated: string;
    description: string;
    checklists: TrelloChecklist[];
    comments: TrelloComment[];
    links: TrelloLink[];
    attachments: JiraAttachment[];
};

export type OAuthTokens = {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
};
