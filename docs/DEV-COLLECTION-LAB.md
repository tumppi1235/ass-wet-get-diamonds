# Artefact collection laboratory and regional analytics

TR-038 and TR-012 are implemented in the protected shared dev administration, beneath the existing artefact controls. Production and live game balance are unchanged. No schema migration is needed.

## Isolated collection simulation

Choose a sourced catalog path and 1–500 synthetic players. The selected time and draft spawn rules produce **one shared world appearance**; each synthetic player gets an independent personal first-visit roll. Each player has a new temporary game with configured search-energy/distance/weather assumptions. A seeded simulation RNG makes repeated runs reproducible; live collection continues to use its existing randomness.

The simulation calls the actual generation, density detection, own-tile target selection and search/energy-spending rules. A view point and attempt point are separate. The admin can assume the visitor reached the source tile or remains at the viewing position, and can simulate inaccurate GPS. Distant visibility never grants collection. Current saved region closures/modifiers apply. Repeated same-outing attempts cannot duplicate a find.

Results distinguish the one world appearance, unique personal drops, player/artefact visibility opportunities, eligible attempts, misses and finds. Expected finds sum the actual probability before each attempt, including energy spent on earlier successes. They are an illustrative estimate, not physical activity or a promise of the next random outcome. A world instance can legitimately be collected independently by multiple players.

The laboratory creates no real GPS/world events, player profiles, inventories, XP, claims, snapshots or audit edits. It assumes eligibility rather than proving a physical visit. Recorded-world claim concurrency and device validation remain separately tested/gated. The existing Finland appearance simulator remains available for multi-place rarity-distribution inspection.

## Regional appearance/reward statistics

The latitude/longitude controls choose an area; queries use validated bounded Finland extents and a 1–31-day appearance-birth cohort. Two read-only aggregates report:

- Recorded appearances by spawn-rule revision, rarity and kind; distinct instance counts, unexpired/unretired counts and recorded appearances per elapsed cohort day.
- Per-player claims by spawn-rule and earning-balance revision, rarity, recorded Perception XP, missing legacy receipts and corresponding daily rates.

Two players claiming one world appearance do not inflate its appearance count. Claims can exceed world-instance counts. Only claims through query time are included, and older appearance births remain outside the cohort even if recently claimed. Unknown receipt rewards/configurations are not guessed. Personal/manual IDs have no reliable spawn-rule revision in the existing schema and are labeled accordingly.

These are statistics of **recorded appearances**. Lazy generation means unqueried source places are not a counted national population. An unexpired record does not establish open access or eligibility for a particular player. No capture-success percentage is inferred without a complete attempted-collection denominator. Tables return at most 100 groups with an explicit truncation indicator; narrow the area/time when needed. No materialization/query of future spawns occurs during analytics.

## Evidence

104 regression cases passed across the suite, plus focused final collection-lab checks. Tests verify reproducibility, non-mutation, actual search-probability parity, effort/weather caps, personal-drop extremes, density versus own-tile availability, inaccurate/wrong-tile/closed access rejection, no duplicate attempts, distinct appearance/claim accounting, balance revisions, unknown/future receipts, bounded groups, admin/origin/input validation and unchanged complete snapshot checksums before/after.

Local browser QA ran 200 independent synthetic visitors: one shared world appearance, 51 personal drops and 251 eligible opportunities, with zero world writes. Regional analytics read 24 recorded QA appearances and no real claims. Counts are illustrative fixture/time-dependent results, not live-world rewards. Typecheck/lint, Worker build and refreshed Graphify accompany publication. Physical iPhone/Enduro validation and national load tests remain pending.

Previous recovery release: GitHub `45a784d35db29de16eb8ce0dc81ca2ff79d111ea`, managed source `ca891b774b23a5f2c79939d0a9b4ede0306653f0`, saved dev version `appgver_e5f5c1d1fa888191acac0e626faefb22`. Hosted snapshot preparation passed without downloading/rewinding player data; its temporary in-browser snapshot was cleared. GitHub web/backend/graph checks succeeded: 41244322344 / 41244322357 / 41244322574. Production remains unchanged.
