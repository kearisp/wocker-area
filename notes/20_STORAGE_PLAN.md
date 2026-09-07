# `storage` plugin — improvement notes

Status: **idea/review only, nothing implemented yet.** This file collects findings from a review of
`plugins/storage` so they aren't lost. Priority order below is suggested, not fixed.

Items 1, 2, 3, 6, 9 and 11 from the original review have been implemented and removed from this list.

## 🐛 Bugs & inconsistencies

**4. No default reassignment after force-deleting the default storage** — `Config.removeStorage`
(`plugins/storage/src/makes/Config.ts:83-89`) clears `default` without picking a replacement.
`StorageService.start()` (`StorageService.ts:218-221`) then silently creates a **new** storage when
called with no name/no default, even if other storages already exist. Prefer prompting the user to
pick one of the existing storages (or point them at `storage:use`).

## 💡 UX / functionality

**5. Inconsistent option validation feedback.** `username`/`password` failures are explained via
`console.info(...)` before re-prompting (`StorageService.ts:84-106`), but invalid `type`/`style` CLI
options are silently dropped and re-prompted with no explanation (`StorageService.ts:62-82`).

**7. Password stored in plaintext in `wocker.json`.** Consistent with other storage-like plugins
(pgsql/mariadb/mongodb), so not unique to this plugin, but worth flagging if a broader security pass
is ever planned.

**8. Only one provider (`MinioProvider`) for the whole `StorageType` enum.** The `StorageProvider`
abstraction (`plugins/storage/src/types/StorageProvider.ts`) is already provider-agnostic — an
"external S3" type (just stores endpoint/access-key/secret, no container) would let dev setups point
at a real S3 bucket without spinning up MinIO.

## 🧪 Code quality

**10. Zero test coverage.** No `*.spec.ts` anywhere under `plugins/storage/src` — not `StorageService`,
`Config`/`Storage`, nor `MinioProvider`. Appears to be the only plugin of this size with no tests at
all; `StorageService` (create/destroy/create-bucket/delete-bucket) and `Config` are the natural
starting points.