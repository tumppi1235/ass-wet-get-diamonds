# Dependency-aware implementation roadmap

## Current development iteration — 2026-11-01

The current actionable work and validation queues are maintained in the [backlog management board](BACKLOG.md#backlog-management-board). This roadmap describes milestone scope; it is not a second task tracker.

User authorized continuous dev backlog work, a shared dev backend and experimental configurable rates (D-024), with physical validation later. A later explicit request promoted only the opt-in compass onto production as version 9 (D-035); shared services and routes remain dev-only. Shared platform identity/D1 services, recorded/personal spawns, density detection, admin player/recovery tools, Character/Collection and XP curve/simulations are implemented in dev; see DEV-CONTINUATION.md and the linked increment reports. Compass/GPS/Enduro field acceptance remains pending, separately from passing software tests.

Event regions, admin world maps, boss definitions, accepted/locked parties, explicit activation, browser-receipt activity damage and separate individual loot are now implemented in shared dev. Next dependency-ready work: operational backups/recovery, remaining artifact simulation/analytics, Enduro activity foundations and provider feasibility, evidence-based progression/objectives, then recommendations and real-path routing. Keep unsupported provider/device work and production promotion as explicit gates.

Current follow-up evidence: private snapshots/offline recovery, collection simulation/analytics, bounded ownership/exact prices, non-route Ideas, source-specific activity classification and dev-safe failure references have now been implemented. Garmin/Strava feasibility investigation is documented; neither provider is connected. See DEV-CONTINUATION.md and the individual reports for exact limits.

Next independent priorities:

Dev version 24 now hosts the full-country compact route planner and planned GPX
control. Rantalantie and Helsinki Foot/Bicycle previews were checked on the actual
site without starting a quest or awarding progress; physical/device gates remain.

The requested four-action software increment is implemented and tested: external
recovery checkpoints/whole-ledger sealing, incremental path loading, detected-only
rarity clues and existing tester controls. See DEV-BACKLOG-INCREMENT.md. Follow-ups:

1. TR-094/101: extend hosted long/dense-route performance evidence within bounded memory and conservative access limits.
2. TR-041: complete a named-tester hosting invitation/access run after specific recipient authorization; no invitation/audience changes have occurred.
3. TR-118: exercise provider-operated restore/drain/retention when supported; software reconciliation is not that operational proof.

P0 Garmin linking/shared-watch inventory/cross-provider dedup/physical tests still depend on supported ingress, account/program choices and device evidence. They are unfinished; independent work continues while those gates wait. Further production promotion, native distribution and deferred quests/companions require their own scope decision.

## M0 — Repair the browser adventure loop

P0 regression and physical acceptance gates:

1. **TR-153:** recover stale GPS, keep latest validated active tile, prevent listener duplication and show diagnostic status.
2. **TR-154:** repair discovery → tile eligibility → attempt → inventory persistence and visible failure reasons.
3. **TR-146 (browser portion):** persist active adventure, flush on background, recover after visibility/foreground/reload, distinguish GPS gaps from an ended adventure.
4. **TR-019 / TR-024:** align landmark and generated collection with the approved own-tile rule, preserving search probability and duplicate protection.
5. **TR-023:** regression and iPhone field validation across tile edges, stale/coarse GPS, interruption, repeated start/stop and a 60-minute lock/return test.

No new collection conveniences while these remain unverified. The user chose browser-only testing; continuous iPhone screen-off GPS remains a separate native/Garmin dependency. Preserve adventure state and recorded progress, but do not manufacture missing tracks or mileage.

## M1 — Playable exploration foundation

Development-only iteration authorized on 2026-10-31: TR-002 contract, TR-078 local lifetime evidence, TR-087 quadratic projection and TR-051 save foundations on `develop`. See [DEV-FOUNDATIONS.md](DEV-FOUNDATIONS.md). These independent foundations can advance while the M0 physical phone retest remains pending; no Auto-Collect or probability changes bypass that gate. Production promotion is not authorized by this iteration.

After the browser fix is retested: TR-E01 core spawning/collection, TR-E02 Finland-wide migration and essential TR-E05 lifetime achievements/quadratic XP. Establish environment isolation foundations TR-111–113/115/119 before a shared backend stores real player data. Geographic/world and account contracts precede global visit density and server-authoritative inventory. Preserve existing saves and tile IDs with a migration plan.

## M2 — Garmin and essential administration

Garmin Enduro 3 data-field activity/GPS proof, account linking, buffered idempotent events and shared inventory. Independently validate provider capabilities; do not assume the existing standalone prototype is connected. Build the separate authenticated admin console and configuration/simulators around the same actual API/world model. Garmin work is captured as TR-155–163 without reusing the original TR-001–154 identifiers.

## M3 — Optional adventure recommendations

TR-E06: simple goal/stat-based suggestions first, then real accessible routes and GPX export. Strava TR-097/TR-164 is optional. No extra completion XP and no formal training quests in the initial recommendation milestone.

## M4 — Cooperative bosses and deeper progression

TR-E04 depends on trusted activity inputs, shared accounts/worlds, movement validation and loot separation. Implement explicit activation, asynchronous 24h encounters, one activity and verified tile presence per participant before scaling/loot. Player stats do not bypass required effort.

## M5 — Production release

Finish TR-E07 isolated environments, migrations/backups, controlled promotion/rollback, monitoring and device field acceptance. Current playtest publication is not proof that these release gates exist. TR-E09 companions/Karma and formal quests remain deferred; Auto-Collect follows reliable collection and offline sync.
