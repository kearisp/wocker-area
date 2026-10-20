export const JIRA_URL_KEY = "JIRA_URL";
export const JIRA_EMAIL_KEY = "JIRA_EMAIL";
export const JIRA_TOKEN_KEY = "JIRA_TOKEN";

export const TRELLO_CLIENT_ID_KEY = "TRELLO_CLIENT_ID";
export const TRELLO_ACCESS_TOKEN_KEY = "TRELLO_ACCESS_TOKEN";
export const TRELLO_REFRESH_TOKEN_KEY = "TRELLO_REFRESH_TOKEN";
export const TRELLO_EXPIRES_AT_KEY = "TRELLO_EXPIRES_AT";

export const TRELLO_SCOPES = ["read:board:trello", "read:member:trello", "offline_access"];
export const TRELLO_CALLBACK_PORT = 47821;
export const TRELLO_NOT_LOGGED_IN_MESSAGE = "Not logged in to Trello. Run \"ws trello:login\" first.";

export const DATA_PATH_META = "jira.dataPath";
export const DEFAULT_DATA_PATH = ".ai";
export const TASKS_DIR = "tasks";
export const PULL_MANIFEST = ".pull.json";
export const PAGES_DIR = "pages";
export const CARDS_DIR = "cards";
export const ATTACHMENTS_DIR = "attachments";

export const NOT_CONFIGURED_MESSAGE = "Atlassian credentials are not configured. Run \"ws jira:config\" first.";
