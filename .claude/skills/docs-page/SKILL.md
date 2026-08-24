---
name: docs-page
description: Write or update a documentation page in this repo's docs site (docs/public/docs/{plugins,presets,project}/<topic>-en.md and -uk.md) — use whenever asked to write, update, or fix docs for a wocker plugin, preset, or project feature, in English and/or Ukrainian.
---

# Writing docs pages in this repo

This repo's user docs live in `docs/public/docs/` and are served by a custom Vite + React SPA (`docs/src/index.tsx`) — there is no VitePress/Docusaurus. Each topic is a pair of plain markdown files, one per language.

## Where docs live

- `docs/public/docs/plugins/<plugin>-<lang>.md` — plugin docs (e.g. `redis-en.md`, `redis-uk.md`).
- `docs/public/docs/presets/<preset>-<lang>.md` — preset docs (node, php, custom).
- `docs/public/docs/project/<topic>-<lang>.md` — project-feature docs (env, domains, logs, ssl, http-auth, build-args, init, management).
- `docs/public/docs/index-<lang>.md`, `installation-<lang>.md` — top-level pages.
- `<lang>` is **`en`** or **`uk`** (not `ua`, despite the `LocaleType.UA` enum name in `docs/src/types/LocaleType.ts`).

## File format

- No frontmatter. Files start directly with `# Title`.
- `##` for major sections, `###` only for per-command detail subsections if you use that older style (see below).
- Fenced code blocks: ```` ```shell ```` for commands, ```` ```text ```` / ```` ```hosts ```` for file snippets.
- `> ⚠ text` blockquote for destructive-action warnings.
- No CONTRIBUTING.md or style guide exists in this repo — conventions must be inferred from the best-maintained existing pages, not assumed.

## Structure template (use this — it's the current best-practice pattern)

Modeled on `pgsql-en.md` / `mail-en.md` (NOT the older stub style still present in some files — see below):

1. `# <Title>`
2. `## Commands` — one code block, one command signature per line, full option flags inline. Followed by a one-paragraph plain-language summary of what the plugin manages.
3. `## Installation` — `ws plugin:install <name>` (verify this verb against `packages/ws/src/modules/plugin/controllers/PluginController.ts` — several existing docs, e.g. `pgsql-en.md`/`mail-en.md`, wrongly say `ws plugin:add`; don't copy that mistake into new/updated pages).
4. `## Quick start` — a short numbered-by-comment shell walkthrough (create → use → start → interact).
5. `## Commands` again (heading repeats intentionally) — the same commands grouped into logical blocks with inline `#` comments.
6. `## Options reference` — bullet list grouped by command name, one bullet per flag: `` `-x, --flag <arg>` — description``, including defaults and edge-case behavior (e.g. what happens when `--host` is set).
7. `## Notes` — bullets for: default-service-when-argument-omitted behavior, external/edge-case service behavior, any admin-tool/companion-container behavior (name it, its default domain, how it's enabled/disabled/started), completion support.

Older pages (`mariadb-en.md`, `webdriver-en.md`) use a `### <command>` heading-per-command style with `**Options:**` bold labels instead of a single "Options reference" section — acceptable if you're extending an existing page already in that style, but prefer the newer pattern above for new pages or full rewrites.

The very sparse stub style still present in files like `mongodb-en.md`, `memcached-en.md`, `ngrok-en.md` (just a bare `## Installation` + `## Commands` command list, no prose) is legacy and not a pattern to copy — treat as a candidate for the same upgrade this skill describes if asked to touch them.

## Always verify against source, never against the old doc

Old docs in this repo have been found stale — e.g. `redis-en.md` used to document a `--image-version` flag that no longer exists. Before writing:

1. Read the plugin's `*Controller.ts` for the real `@Command`/`@Option`/`@Description` decorators (command signatures, every flag, its short alias, its description).
2. Read the corresponding `*Service.ts` and config `makes/*.ts` for real defaults (default image/version, default port, what a flag actually does, what's ignored under what conditions).
3. Cross-check any CLI verb you're not 100% sure of (like `plugin:install` vs `plugin:add`) against its actual controller in `packages/ws/src/`.
4. Never invent an option or command that isn't in the decorators — if the old doc lists something you can't find in source, drop it (or ask, if the mismatch seems like it could be a doc bug worth flagging rather than a stale doc).

## EN/UK parity

The `-en.md` and `-uk.md` files for a topic must stay section-for-section identical — same headings in the same order, same content coverage, just translated. `pgsql-uk.md` currently has an extra "Приклади" (Examples) section that `pgsql-en.md` lacks — that's a drift bug, not a pattern to imitate. When writing both files, write them together and diff their heading lists before finishing.

## Wiring a brand-new topic (only when the page doesn't exist yet)

Editing or rewriting an existing page needs no wiring — the route already exists. Only for a genuinely new topic:
- Add a `Router` entry and a `MENU` entry in `docs/src/env.ts`.
- Add a `menu.<key>` label to `docs/public/locales/en.json` and the matching `uk.json`.

## What NOT to do

- Don't trust the current doc content as ground truth for commands/options — always re-derive from the controller/service source.
- Don't leave EN and UK asymmetric (different section sets, one having content the other lacks).
- Don't invent an "Examples" or other section not present in the template unless the user asks for it or an equivalent well-maintained page already has it on both sides.