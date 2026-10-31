# Shared development world — first service increment

User authorized a shared backend and configurable experimental XP/loot values in development only. Production remains the existing public static playtest. The existing private dev Site now runs a Worker plus its own D1 database, retaining its URL, audience and local-storage keys. Hosted platform identity, Tumppi profile creation and protected admin reads passed.

## Two explicit play modes

The original local game remains available with all existing phone profiles, passwords, gold, collections and tile claims. **Quest controls → Open shared dev world** opens `/shared`, using the Site's ChatGPT identity and a separate display name. It starts a new shared dev journal; it never uploads local passwords, copies old histories or merges wallets automatically. A later explicit import must distinguish legacy evidence and prevent retroactive farming.

Shared mode supports Foot/Bicycle, start/stop, accepted GPS exploration, own-tile artefact attempts, progression and shared gold tile purchases. Server-side rules calculate state; clients send events, not authoritative balances/inventories. The original local mode remains walking-only. Native sharing and Garmin/Strava import are later integrations.

## Identity, storage and concurrency

- Sites owns sign-in and injects the authenticated subject. API writes require the same origin; per-player queries always use that subject, never a user ID supplied in JSON. Anonymous requests and non-admin administrative requests are rejected.
- The configured owner email is a runtime value, not a password or client setting. It grants the initial shared administrator role from a platform-verified identity. Ordinary profile creation ignores requested roles. The private Site audience remains unchanged.
- D1 tables store members, versioned player state, event receipts, unique per-player visits, shared claims, configuration history, audits, backups and spawn records. Schema-only Drizzle migrations are generated and tested; request handling never creates tables.
- Each write uses an event ID, payload hash, expected player revision and a transactional compare-and-swap guard. Duplicate receipts replay without re-awarding; changed payloads/stale revisions are rejected. A conflicting tile price rolls back both ownership and wallet changes.
- The client stores at most one pending event per shared subject. A lost response can be retried with the same ID after reload. An old offline GPS fix is rejected rather than transformed into invented distance; the full Garmin/offline reconciliation backlog is not completed by this envelope.
- Other players' visits are aggregated separately from personal coverage. Shared claims cost previous price +1, burn gold and never pay the previous owner. Neither ownership nor visits are copied to production.

## Experimental revision `dev-experimental-1`

| Rule | Initial value |
| --- | ---: |
| Exploration XP, first personal tile | 5 |
| Agility XP, first regional block (8×8 legacy tiles) | 3 |
| Perception XP, successful new artefact collection | 10 |
| Endurance XP | 1 per 250 equivalent metres |
| Foot / Bicycle effort factors | 1.0 / 0.4 |
| Foot / Bicycle speed limits | 7 / 22 m/s |

Both modes get full geographic credit and physical distance/gold; only configured effort XP is scaled. The regional block uses the compatible legacy grid, not an exact national 2km metric projection. Power and Fellowship stay at zero until real elevation/cooperation evidence is supported. These are labeled development experiments, not final balance or a physiological equivalence.

The separate Vinext admin client at `/admin-world` uses the same protected API. It lists shared players, edits validated balance values and displays audit records. Every configuration edit creates a new immutable revision plus an actor/time/before-after audit, and affects only future events. It does not recalculate previously awarded XP. Legacy `/admin` remains device-local administration.

## Tests and known limits

`shared-world.test.ts` applies the actual SQL migrations to isolated SQLite databases and tests authorization, own-origin writes, role escalation rejection, development environment guard, receipts/revisions, lost-response replay after reload, account namespace separation, Foot/Bicycle effort, coarse/gap exclusion, shared purchases and audited non-retroactive configuration changes. A browser-only native-fetch binding error found in local UI testing has its own regression.

Local end-to-end browser testing used only the official loopback Sites test identity (`local_seedy`), never real user credentials: shared profile creation, state loading, owner/admin routing and an actual audited configuration edit passed against the local D1 emulator. No location was injected or fabricated. Cloud platform identity and physical phone GPS/compass acceptance remain separate checks.

GPS validation is basic consistency checking, not hardware attestation. See DEV-SPAWNS.md for deterministic regeneration, personal discovery, density detection and bounded spawn queries. Worldwide-exclusive claims, six-source XP, co-op/bosses, admin reset/restore, invitations and offline watch reconciliation remain pending. Raw shared GPS transport now replaces stalled watchers, ignores old/background callbacks and resumes an active quest after reload; gaps still earn no invented distance.

## Build and recovery

Install dependencies in both `mobile/` and `dev-server/`. Run mobile quality, server lint/types and `node tools/Build-SharedDev.cjs`. This creates `.tools/shared-dev-build/` with the Worker, static Expo game, hosting manifest and migration metadata. `Prepare-SharedDevHost.cjs` mirrors committed source/artifacts to the existing dev checkout only, guarding its exact project ID. Runtime settings are configured through Sites, not committed files. The local `.dev.vars` and `.wrangler` data are excluded.

All local-server identity emulation stays out of hosted builds. Deployment applies new migrations without dropping old tables. Rollback must preserve the dev database; returning to the earlier static version hides shared mode but retains the shared records for a later forward deployment. Do not apply these migrations or the dev runtime values to production.
