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

## Pending receipt reconciliation — 2026-11-01

Shared dev now checks the exact owner/action identity and payload hash with
`POST /api/trail/pending-status`. This is a same-origin, authenticated, no-store,
zero-write inspection, including while maintenance is paused. One SQL statement
observes the matching receipt and player revision together. It never generates
spawns, creates a missing player, settles encounter expiry or returns another
player's receipt/hash. The normal request-size limit still applies.

The phone retains a per-profile highest observed world revision. Loads, event
results, loot results and pending inspections refuse a lower/missing revision
after a higher one was seen. Pending envelopes and the checkpoint remain saved;
there is no automatic reset to the older state. A receipt identity mismatch also
preserves the original envelope. The new **Check saved action and reload** controls
clear only confirmed receipts, or a world action whose original CAS revision is
already obsolete. Unknown equal/missing-revision actions remain available to retry.
Encounter failures also remain journalled until resolved explicitly.

An explicit **Cancel unsynced action** control is available when open. Its
same-origin `POST /api/trail/cancel-pending` requires confirmation, records a
terminal no-award receipt under the **original** owner/action identity and exact
payload hash, and audits the cancellation in one guarded transaction. A delayed
original transaction either wins first (its outcome is preserved) or loses to
the cancellation's unique receipt (all original gameplay writes roll back).
This releases stale/invalid GPS or party requests without an endless retry loop.
Cancellation does not stop an adventure, leave a party, reverse a purchase or
remove any already recorded reward. No new schema or balance rule is introduced.
A failure after receipt persistence but before refresh keeps the phone journal;
its next retry/check recovers the recorded outcome rather than reissuing rewards.

Ten new SQL/client regressions cover owner/origin/membership/size-shape checks,
paused zero-write inspection, lost responses, identity mismatch, stale CAS,
synthetic revision rewinds/missing rows, both cancellation race orders, late
original event/party replay, idempotent cancellation, and a pause racing its
commit. The existing encounter journal regression now requires explicit durable
cancellation after a rejected activation. These isolated tests do not rewind a
hosted database or record GPS for a real player.

### Limits and first-rollout drain

This is a client-observed rewind guard and pending-action protocol, **not complete
hosted restore reconciliation**. It cannot detect a restore that reuses equal or
higher counters, a lost encounter receipt with an unchanged player counter, a new
phone without a checkpoint, cleared local storage, or every concurrent-tab
checkpoint race. A server recovery generation/barrier and reviewed complete-ledger
reconciliation are still required before reopening any restored world. Never
delete checkpoints or manufacture gold/routes to get around this gate.

For the maintenance-aware rollout:

1. Record the exact successful saved version/source and preserve the previous
   artifact. Confirm the current health response includes `maintenanceProtocol:1`
   and `pendingRecoveryProtocol:1`; this identifies the serving protocol only.
2. Obtain provider evidence that older, maintenance-unaware workers/requests have
   drained before relying on the write fence. A successful deployment, elapsed
   phone timeout or health response alone is **not** such evidence. Managed Sites
   does not currently expose a request-drain control here; leave this gate open.
3. Pause using the current maintenance revision. Inspect pending receipts while
   paused and retain complete snapshots/ledgers. Cancellations and gameplay
   retries remain fenced until normal operation resumes.
4. For an ordinary pause with no restore, reopen and retry/check/cancel the same
   envelopes. For any provider restore, keep paused until the server-generation
   and whole-ledger reconciliation gates above have been satisfied and reviewed.

Production and phone-local profiles are unaffected. Old open tabs may still use
the earlier recovery UI; refresh for this protocol. Supported prior frontend
assets remain available, but preserving them does not make old client code
recovery-aware or prove old server requests drained.

References checked 2026-10-31: [D1 transactional batch](https://developers.cloudflare.com/d1/worker-api/d1-database/), [Time Travel and backups](https://developers.cloudflare.com/d1/reference/time-travel/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/).
