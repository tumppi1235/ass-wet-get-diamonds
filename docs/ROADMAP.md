# Dependency-aware implementation roadmap

## Current development iteration — 2026-10-31

User requested backlog continuation in dev after the GPS/route readability release. Keep production unchanged. TR-165 live browser compass is the next independent navigation item: sensor permission, relative direction, screen rotation and honest north-up fallback. Implementation and automated coverage are in DEV-COMPASS.md; physical acceptance is still pending. This does not bypass the M0 field gates or enable new collection conveniences. Future P0 server/world stories still require shared-service/account decisions; XP earning formulas remain undecided.

## M0 — Repair the browser adventure loop

Next five priorities, in execution order:

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
