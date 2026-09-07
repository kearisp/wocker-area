# wocker v2 — update plan

Status: **early scoping, nothing implemented yet.** This file collects the intended scope for the
next major version so it isn't lost. Priority **99**.

## Scope

- **ESM everywhere.** Every package/plugin moves from `"type": "commonjs"` to `"type": "module"`.
- **Test runner:** Jest is replaced by Vitest across the monorepo.
- **TypeScript / build:** TypeScript gets bumped (versions are currently split `^5.8.3`/`^5.9.x`
  across packages — worth aligning as part of this). Tentative direction for the workspace build
  itself: TS project references + TS7's `--builders` flag, replacing today's independent
  per-package `tsc --watch` processes — not yet decided, needs follow-up before it's locked in.
- **`@kearisp/cli` upgrade** (still under development upstream). `packages/core` currently pins
  `@kearisp/cli@^2.0.9`; target version TBD once the new architecture lands. Two behavior changes
  that affect command controllers:
  1. **`-h` will work without required arguments being supplied first.** Today, calling `-h` on a
     command that has a required param (e.g. `@Command("preset:install <preset>")`) fails with a
     "command does not exist" error unless a value is actually passed for the required arg (e.g.
     `ws preset:install dump -h`). The new version fixes this.
  2. **Multiple `@Command(...)` decorators stacked on one controller method become aliases of a
     single command**, instead of being registered as independent commands. This is already the
     de-facto usage pattern in this codebase (e.g. `PresetController` `preset:install <repository>`
     / `preset:install <repository>@<version>`, `MariadbController` `mariadb:ls` / `mariadb:list`)
     — those cases need no change.
- **`@wocker/prompts`:** bump `@inquirer/core` to latest. Currently blocked — `packages/prompts` is
  CJS (`"type": "commonjs"`) and the installed `@inquirer/core@10.3.2` is already ESM-only, so a
  further bump isn't installable until the package itself moves to ESM (see "ESM everywhere" above
  — this is one of the concrete reasons that migration is needed, not just a style preference).

## Command rename check (`@kearisp/cli` alias behavior)

Behavior change #2 above only affects `@wocker/ws`: checked every `@Command(...)` in
`packages/` and `plugins/` for a controller where the **same base command name** is registered both
bare (no args) and with a **required** arg, on *different* methods — that shape doesn't fit "aliases
of one command" and needs a rename to stay unambiguous under the new CLI.

Found one confirmed case:

- **`packages/ws/src/modules/core/controllers/DebugController.ts`** — `debug` (line 24, method
  `debug()`, no-arg status getter) vs. `debug <status>` / `debug:<status>` (lines 125-126, method
  `setDebug()`, required `status` setter). These are two different methods sharing the `debug` root
  — needs renaming. **Exact new name(s): TBD**, decide when the `@kearisp/cli` rewrite is closer to
  landing.

No other controller in the monorepo currently has this shape (checked via root-name diffing across
every `@Command(...)` call site, cross-referenced per controller and globally).

## Open questions

- Target `@kearisp/cli` version/release date — depends on upstream progress.
- Final naming for the `debug`/`debug <status>` rename.
- TS7 project-references + `--builders` build approach — still needs to be worked out in detail.
