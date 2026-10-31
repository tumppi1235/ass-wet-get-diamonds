# Dev snapshots and offline recovery drill — TR-118

The protected `/admin-world` console can prepare a private game-data snapshot. This is development only. There is **no hosted restore endpoint**, no overwrite of the shared database and no migration of phone-local profiles or production data.

## Snapshot scope

The admin confirms private storage, prepares a snapshot and saves the offered JSON file. The same-origin, authenticated POST is admin-only and uses `Cache-Control: no-store`. No public asset link or external storage provider is introduced.

One D1 batch transaction reads all 17 `trail_*` tables, including member references/roles, current wallets/inventory/XP, configuration history, activity/event receipts, visits, tile ownership, spawns and claim ledger, boss definitions, parties, contributions, rewards, per-player recovery snapshots, audit and integrity rows. It captures a consistent game state rather than stitching unrelated paged reads together. Hosting secrets, platform authentication, the hosting service's migration metadata, original local profiles/passwords and watch storage are outside this export.

The current format identifies the exact dev Site, schema migration 0007 and capture time, with a SHA-256 checksum. The checksum detects file damage; it is not encryption or a signed attestation. The file contains private identifiers and saved location routes. Keep it private and out of public GitHub reports; share only redacted aggregate recovery results.

The current small-dev limit is 5,000 rows per table and a combined 512 KiB JSON file. SQL suppresses oversized table results before transfer; metadata and final file size are checked. Extra/new game tables, missing rows, wrong schema and oversized output fail the whole export. No partial JSON file is offered as a complete backup. This bounded tool is not a large national-database backup strategy.

## Offline recovery

From the repository root, with the installed mobile dependencies:

```powershell
node mobile/node_modules/tsx/dist/cli.mjs tools/Restore-SharedDevSnapshot.mts --input PRIVATE-SNAPSHOT.json --output NEW-local.sqlite
```

The output **must not exist**. The tool uses exclusive file creation, validates size/schema/project/checksum, applies the real append-only migrations and restores the fixed table/column list with prepared values. It checks foreign keys and SQLite integrity, then reports table counts/checksum without printing player contents. A failed drill rolls back and removes only its newly created output. Existing files are refused and never overwritten. There is no network or hosted-write path.

The recovery command accepts known schemas 5, 6 and 7 with their matching column definitions and migration prefixes, preserving older saved snapshots after the claim-index additions. A later game schema requires updated format/column coverage and a fresh passing drill; do not edit applied migrations to make an older snapshot fit. A restored offline database contains private gameplay data and role references but has no copied platform authentication credential or hosting secret.

## Evidence

- Real SQL tests export a synthetic played world with gold, ownership, completed activities, boss contributions and individual reward receipts; restore into a new database; and compare source/restored data and all table counts.
- Wrong environment, damaged checksum, missing tables, future schema, oversized files, broken foreign keys and existing output paths are rejected. No failed/partial restore is retained.
- Snapshot API tests reject ordinary players and foreign origins and preserve the source world.
- Local browser QA prepared/downloaded a snapshot of the isolated Shared QA world (52 rows), then the actual command restored that downloaded file into ignored `.tools/local-qa-recovery-20261031.sqlite`, passing integrity checks and reporting `hostedDatabaseChanged: false`. The QA world has no real player GPS recording. The richer automated fixture separately covers ownership and boss rewards.
- 100 regression cases pass, with mobile/server typecheck and lint. Worker build and graph checks accompany this increment. These are software/offline results, not a hosted disaster-recovery pass or physical device validation.

## Operational gates and runbook

Before migration/deployment, run CI and retain the exact previous source/build; append schema migrations rather than modifying applied SQL. Download a fresh private dev snapshot when within this tool's size limit and run the offline drill. A source-only rollback does not reverse database changes: use forward-compatible code or a reviewed repair migration. Never replay an old migration or restore player state independently from its ownership/reward ledgers.

For an actual hosted incident: use the reviewed dev maintenance controls after the guarded release is active and older requests have drained, preserve current evidence, identify the affected migration/time, and request a provider-level consistent recovery through the hosting service. Review the full world/ledger restore and reconcile pending client actions and revision monotonicity before reopening. Maintenance pause/resume and same-transaction write fencing are now implemented; provider restore and revision reconciliation remain gates. See DEV-MAINTENANCE.md. No live player data is rewound during routine QA.

Cloudflare documents D1 Time Travel and transactional batches, but the managed Sites tools available here expose database inspection rather than a provider restore operation. The managed database's plan/retention and an actual provider-operated restore drill have not been verified. Do not promise a retention period or disaster recovery objective from an offline JSON drill. Larger exports require the provider path; no silent truncation is acceptable.

References checked 2026-10-31: [D1 transactional batch](https://developers.cloudflare.com/d1/worker-api/d1-database/), [Time Travel and backups](https://developers.cloudflare.com/d1/reference/time-travel/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).
