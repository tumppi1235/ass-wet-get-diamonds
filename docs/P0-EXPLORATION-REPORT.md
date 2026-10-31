# P0 exploration repair and test evidence — 2026-10-31

Scope: TR-146 browser persistence/recovery, TR-153 live GPS/tile freeze, TR-154 collection eligibility. Device reported by player: Chrome on iPhone. Player chose browser testing without Apple Developer access.

## Findings and changes

- Background events previously called Stop quest. GPS listeners also stopped without foreground recovery. Adventure identity/status now persists separately from the watcher, saves on background, and reconnects on return or a stale watcher. Generations discard late callbacks and pending subscriptions are cleaned up. Only an explicit stop ends a real adventure.
- Current position was applied only while recording, and selected purchase tile could appear to be the current tile. Validated GPS now moves Discovery and Adventure positions; the current tile has its own white outline, distinct from purchase selection. Recovery creates a fresh route baseline, with zero distance through the unseen gap.
- Landmark collection still used a legacy 70m radius. Collection now uses the artefact's own tile and an action-time fresh eligible fix, including casual Discovery. Stale/coarse/outside/fast fixes remain ineligible; duplicate attempts and existing probability rules remain intact.
- Active adventure metadata survives JSON persistence. Reloading/re-entering does not reset gold, search attempts, inventory or outing identity. Explicitly starting a new outing retains the existing reset rules.

## Evidence and limits

Local automated run: **32/32 passed**, lint and TypeScript passed, including lifecycle cleanup. The latest generated `test-results/summary.md` / JUnit and GitHub Actions are the authoritative final count. Evidence comes from deterministic simulated GPS and existing account/resource/map tests, not a physical iPhone walk. Working-tree runs are labeled as such; committed CI runs identify the exact source SHA.

Phone lock/reopen, touch navigation and a real outdoor tile crossing remain **PENDING** in [TEST-PLAN.md](TEST-PLAN.md). Do not mark the full P0 stories Done until their device checks pass. Continuous locked-screen iPhone browser GPS is unsupported in this test scope: the adventure remains active, but missing positions/distance/rewards cannot be reconstructed. The [Geolocation specification](https://www.w3.org/TR/geolocation/#request-a-position) makes visible-document state relevant to delivery; a native or independent activity recorder is a separate future gate.

Environment/pipeline scope: development/production client storage separation, dual-variant CI, retained JUnit/log artifacts and exact-artifact promotion are implemented. A separate private development Site is configured. Shared backend isolation, repository reviewer rules and unattended Sites deployment are not claimed complete.
