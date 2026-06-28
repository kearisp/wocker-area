Generate a changelog entry for the given commit range.

Arguments: `$ARGUMENTS` — format: `<new-sha> [submodule-path]`

Examples:
- `/changelog 12fe10b ./packages/ws` — submodule at the given path
- `/changelog 12fe10b` — root repository

## Steps

1. Parse arguments:
   - `<new-sha>` = first token.
   - `<submodule-path>` = second token (optional).

2. **If `<submodule-path>` is provided** (submodule mode):
   - Run `git diff HEAD -- <submodule-path>` in the root repo.
   - Extract old SHA from the `Subproject commit <sha>` line in the output.
   - `<repo-dir>` = `<submodule-path>`, range = `<old-sha>..<new-sha>`.
   - Version source: `<submodule-path>/package.json`.
   - Output file: `<submodule-path>/CHANGELOG.md`.

3. **If no path is given** (root repo mode):
   - Run `git log --oneline` to find the previous version tag commit.
   - Old SHA = that commit. Range = `<old-sha>..<new-sha>`.
   - `<repo-dir>` = `.` (root).
   - Version source: `package.json` in the root.
   - Output file: `CHANGELOG.md` in the root.

4. Collect changes inside `<repo-dir>`:
   - `git -C <repo-dir> log <old-sha>..<new-sha> --format="%H %s%n%b"`
   - `git -C <repo-dir> diff <old-sha>..<new-sha> --stat`
   - For files with meaningful changes, read the full diff: `git -C <repo-dir> diff <old-sha>..<new-sha> -- <file>`

5. Exclude version-bump commits (e.g. `v1.1.2`, `bump version`, `release vX.X.X`).

6. Compile the changelog following the rules in @.aiassistant/rules/changelog.md.

7. Determine the new version from the version source file and today's date for the heading.

8. Write the result to the output file:
   - If the file already exists, prepend the new entry above the existing content.
   - If the file does not exist, create it.
