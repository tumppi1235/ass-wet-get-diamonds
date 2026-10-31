# Development iteration: P0 data and progression foundations

User requested continued priority-led development on 2026-10-31. Branch: `develop`. Publish only to the existing private development Site; do not promote or change the live playtest. The compass request is recorded as TR-165/P1, not implemented by this iteration.

## Scope and ordering

The M0 fixes passed automated checks and desktop smoke tests, but physical iPhone checks remain pending. This iteration advances independent foundations, with no new collection shortcuts, chance changes or missing-distance reconstruction. Dependency-ready P0 work: TR-002 spawn contract, TR-078 lifetime evidence, TR-087 agreed curve and TR-051 storage foundations. A minimal Profile view makes the saved records inspectable during testing; it is not the full character/archetype system.

## Spawn contract — TR-002

`mobile/src/game/spawns.ts` defines version, spawn identity separate from tile identity, type, rarity, geographic position, kind, creation/expiry, claim policy and optional personal owner. New spawns require known creation times, dynamic spawns expire, and personal first-visit spawns belong to one player. Validation rejects coordinate/tile mismatches and invalid policy/timestamp combinations. Personal visibility and exact expiry boundaries are tested. Worldwide unique claims still require a trusted service; a client model is not enforcement.

The legacy adapter preserves every curated relic's current tile/coordinates/rarity and assigns a separate stable namespace for its spawn ID. Unknown legacy creation times remain null. This contract does not replace the current generator or migrate existing inventory IDs, placement, probabilities or save keys. New rarity tiers and actual spawn balancing remain separate stories.

## Lifetime evidence — TR-078 (partial)

Development saves add versioned evidence independently of XP projections: accepted GPS walking distance/observed time, first recorded tile/find evidence and activity totals keyed by stable adventure ID. Replayed timestamps and repeated finds cannot duplicate evidence. Discovery records tiles/finds without workout distance; GPS adventure segments record effort. Demo engine movement never writes GPS evidence. Foreground/reload recovery starts a segment without inventing gap time/distance. Only collection already present in inventory can be recorded as a find.

Migration retains existing visits, inventory, gold and claims. Old visit/find IDs are retained as legacy evidence with unknown times. The current outing's distance is not assumed to be lifetime distance. Older data may include demos, so legacy and new GPS records remain distinguishable. New fields are optional, installation/profile-local and development-only; this is not shared identity or server-verified activity. Elevation, terrain/sport diversity, provider activities and cooperation evidence remain future work. No extra raw coordinates are added to the evidence ledger; the existing saved route remains separate.

## Progression — TR-051 (partial), TR-087

All six independent XP totals are stored, validated and preserved through account-service reload. The level projection uses the approved `coefficient × (level−1)^2`, initially 25, with independently scoped development/production configuration. Level 1 starts at 0; levels 2/3/4 require cumulative 25/100/225. Negative, fractional, non-finite and unsafe inputs are rejected; large safe XP totals are handled explicitly.

No XP earning formula has been approved yet. All initial XP remains zero; no gold conversion, speed-based Agility, historical XP guess or boss damage effect is introduced. Profile shows lifetime records and attribute levels/next thresholds, and explains that XP rewards are not active. Character-wide level policy and XP earning are not claimed complete.

## Validation / player check

Run both environment variants through `npm --prefix mobile run quality`; GitHub Actions publishes JUnit/log summaries and exports. Foundation cases are in `foundations.test.ts`; account tests verify storage/reload of lifetime records and all XP totals. Production tests verify the new state initialization stays disabled.

In dev: open Profile and inspect Adventure Journal; walk with precise GPS, return after a lock, stop/reload, and confirm lifetime totals retain accepted effort while quest totals can reset. A city demo must leave GPS lifetime totals/XP unchanged. Denied/stale/coarse GPS must not add records. Verify the production Site remains on its previous release SHA. Physical phone checks remain pending until recorded as such.
