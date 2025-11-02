---
apply: manually
---

Release changelog generation

Goal
Produce clear, reviewer‑friendly release notes in English, grouped by change type and scoped to plugins when relevant.

Scope
- Applies to repository releases (tags) and to major feature branches that need aggregated notes.
- Uses Conventional Commits style inputs where available.

Sections and order
List sections only if non‑empty, in this order:
1) Breaking Changes
2) Features
3) Fixes
4) Performance
5) Documentation
6) Refactoring
7) Chore / Maintenance
8) Dependency Updates

Entry format
- Use a single bullet per change. Keep it concise and start with a verb in past tense.
- If a PR number exists, append it as (#123). If an issue number exists, append it as closes #123 when applicable.
- If there is a BREAKING CHANGE footer in a commit, surface it under Breaking Changes with a one‑line impact note.

Examples
Features
- added healthcheck and documented PGDATA initialization
- introduced localtunnel Dockerfile and usage guide

Fixes
- corrected default port in README and sample env
- ensured Windows PowerShell commands in scripts work on WSL

Breaking Changes
- changed default volume layout; requires re‑creating the data volume for existing users.

Dependency Updates
- bump typescript to 5.5.x and eslint to 9.x

How to compile the changelog
1) Collect commits since the previous tag (or from the start of the branch if first release).
2) Group by type and scope based on commit messages (Conventional Commits: feat, fix, perf, docs, refactor, chore, deps).
3) Promote commits with BREAKING CHANGE footers into “Breaking Changes” with a concise impact statement.
4) De‑duplicate entries when multiple commits contribute to the same user‑visible change; keep the highest‑level description.
5) Ensure language is clear and consistent; avoid internal-only jargon.

Version header format
- Use the tag or release name as the heading, e.g.: v1.4.0 — 2025‑09‑30
- Optionally include comparison links:
  - Compare: https://github.com/<org>/<repo>/compare/v1.3.0...v1.4.0

Template
## vX.Y.Z — YYYY‑MM‑DD

### Breaking Changes
- <impact note>

### Features
- <summary>

### Fixes
- <summary>

### Performance
- <summary>

### Documentation
- <summary>

### Refactoring
- <summary>

### Chore / Maintenance
- <summary>

### Dependency Updates
- <summary>

Quality checklist
- Entries are in English and concise.
- No empty section headers.
- Any breaking impacts are clearly called out.
- Comparison link (if applicable) is valid.
