# Shared dev maintenance/write coordination — TR-118

The protected admin console now has explicit **Pause shared dev** and **Reopen shared dev** controls. This is an operational pause of the development service, not the user's adventure Stop button. Production, phone-local profiles, active-adventure records and encounter rules/deadlines are unchanged.

## Scope and atomic boundary

The default is open. A confirmed admin transition uses the current revision, a bounded reason, an action identity and an atomic configuration/audit transaction. Replaying an action recovers its outcome without undoing a later transition; stale/changed actions cannot silently replace newer state. This uses existing configuration/audit/integrity tables, with no new migration or snapshot schema.

While paused, normal game APIs and ordinary admin edits return a no-store 503 with a retry hint. This includes GET operations that otherwise generate appearances, index older rows or settle encounter expiry. Existing identity/status reads, admin maintenance controls and protected complete snapshot exports remain available. The console hides ordinary editing tools until reopened.

An initial API check alone is insufficient. The guarded database adds an epoch/pause check to the **same D1 batch transaction** as each game write, including standalone writes and lazy reads that mutate state. A request begun before a pause cannot commit after that pause wins the database transaction order. Old request epochs also fail after reopening, preventing a late in-flight operation from silently resuming. Statements/transaction results retain their existing shapes and CAS/reward logic. Trusted application read-only queries and batches remain zero-write; unsupported exec/raw/session shortcuts do not expose an unguarded binding.

This boundary applies to code using the new guarded API. Before first operational use, confirm the new release is serving requests and older in-flight workers have drained. Do not roll back to code that ignores maintenance state and assume the pause remains enforced. No database trigger or provider-wide write lock is claimed. Cloudflare documents transactional batch ordering/rollback and per-statement result objects: [D1 database API](https://developers.cloudflare.com/d1/worker-api/d1-database/), [return objects](https://developers.cloudflare.com/d1/worker-api/return-object/).

## Pending actions and time

The browser's persisted world/encounter journals retain a 503 as an unknown/retryable outcome. Reopening does not discard a pending envelope or grant a replacement reward. A committed pre-pause event replays through its original receipt; a fenced event can retry without partial wallet/inventory/claim writes. Accurate GPS that has become stale still fails normal validation on retry, and the subsequent fresh fix begins an appropriate segment. No missing mileage is reconstructed.

Pausing does **not** extend encounter deadlines or change accepted effort/loot rules. Avoid maintenance during a time-sensitive test encounter unless participants understand that limit. Expiry settlement resumes on the next permitted read/action. Game Start/Stop is unavailable during the service pause; the saved adventure remains active until the player can explicitly stop/recover it.

## Recovery runbook addition

1. Retain the exact currently deployed source/build and verify the maintenance-aware release is active; drain older requests.
2. Inspect active test encounters and coordinate timing. Confirm the pause, reload its authoritative state, then prepare a complete private snapshot and perform the existing fresh-file offline recovery drill.
3. Keep the service paused during reviewed migrations/provider operations. The current controls **do not restore** the hosted database. Provider retention, consistent restore capability and an actual hosted disaster drill remain unverified.
4. Before reopening any restored world, reconcile world revisions and pending journals with complete event/claim/reward ledgers. A rewind can lose committed receipts or collide with queued actions; maintenance alone does not solve that. Do not independently restore a wallet or remove unknown pending actions as a shortcut.
5. Resume with the current maintenance revision only after reconciliation. Retry pending actions against authoritative state and verify fresh location; do not award recording gaps. Retain the maintenance audit alongside the incident/release evidence.

## Verification

Seven focused tests use actual migrations/SQLite transactions: admin/origin/confirmation and revision guards, idempotent transitions, lazy GET/admin/signup blocking, allowed private snapshot/identity/status reads, stale epochs, standalone/transactional writes and returning mutations, pause races at both first write and reward commit, zero-write reports, unsupported database shortcuts, and persisted browser retry of the identical event after reopening. The test adapter now recognizes row-producing SQL from statement metadata, including DML RETURNING, rather than assuming only SELECT can return rows.

The complete 126-case suite, mobile/server typecheck/lint, Worker build and local structural graph pass. A real local browser paused the isolated QA service, prepared a complete 55-row snapshot while paused without downloading it, and reopened at revision 2; ordinary controls returned. Reload cleared the temporary snapshot link. No real GPS, live-player reset, hosted pause/restore or production write was used. Physical/browser interruption and hosted disaster-recovery gates remain pending.
