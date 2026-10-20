# @wocker/jira-plugin

Downloads Atlassian Cloud content into the project as markdown, so an agent can read it:

- a Jira task: description, metadata, subtasks, linked issues, comments and attachments;
- a Confluence page: body, metadata, labels, comments (footer and inline), child pages and attachments.

## Commands

```bash
ws jira:config [--local] [--path] [-n <project>]
ws jira:fetch <PROJ-123 | task URL> [--path <dir>] [-n <project>]
ws jira:pull [--all] [--clear [--yes]] [--path <dir>] [-n <project>]
ws confluence:pull <page id | page URL> [--children] [--path <dir>] [-n <project>]
```

- `jira:config` asks for the Atlassian site URL, email and API token and stores them in the keystore. They are shared by Jira and Confluence. With `--local` they are stored as project secrets instead and override the global ones. With `--path` it also asks for the data directory.
- `jira:fetch` writes the task to `<jira.dataPath>/tasks/<KEY>/<KEY>.md` and the attachments to `<jira.dataPath>/tasks/<KEY>/attachments/`.
- `jira:pull` downloads all open tasks assigned to you (`assignee = currentUser() AND statusCategory != Done`) in the same layout as `jira:fetch`; `--all` includes done tasks. One failing task does not stop the rest. The downloaded keys are recorded in `<jira.dataPath>/tasks/.pull.json`.
- `jira:pull --clear` deletes the directories of tasks that an earlier `jira:pull` downloaded but that are no longer in the result. It lists them and asks for confirmation; `--yes` confirms automatically, and without a TTY `--yes` is required. Tasks saved with `jira:fetch` are never deleted.
- `confluence:pull` writes the page to `<jira.dataPath>/pages/<id>-<slug>/<slug>.md` and the attachments to `<jira.dataPath>/pages/<id>-<slug>/attachments/`. Child pages are listed with links to Confluence. With `--children` all descendants are downloaded too, each into its own directory next to the page, and the list links to the local copies.

`jira.dataPath` is a project meta value, relative to the project directory. If it is not set, `jira:fetch` and `confluence:pull` ask for it once and save it.

Re-running `jira:fetch` or `confluence:pull` rewrites the markdown and skips attachments that already exist with the same size. If a Confluence page is renamed, its directory name changes with it and the old one stays. Add the data directory to `.gitignore` if you do not want it committed.

Only Atlassian Cloud is supported for now (email + API token).

## Creating the API token

Create a token at https://id.atlassian.com/manage-profile/security/api-tokens with **Create API token**. Use the plain token, not **Create API token with scopes**: scoped tokens do not work with the site URL this plugin uses. The token sees the same Jira projects and Confluence spaces as your account.
