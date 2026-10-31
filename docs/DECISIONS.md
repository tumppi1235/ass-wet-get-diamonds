# Decision log

Source baseline: [shared discussion](https://chatgpt.com/share/6ae5b6f5-4554-83ed-a7a0-5727b4a4f412), reviewed in full on 2026-10-31, plus later direct instructions in this development chat. Later explicit user decisions supersede earlier proposals.

| ID | Decision | Replaces / limits |
| --- | --- | --- |
| D-001 | Finland-wide product; Jyväskylä remains a test region | Current geographic gate is not yet national support |
| D-002 | Phone Discovery and Garmin Adventure feed one future inventory | Current profiles/inventory still installation-local |
| D-003 | Detection range and collection eligibility differ; collection uses the artefact's own tile | Separate collection-radius proposal and legacy 70m landmark gate |
| D-004 | Greater distance, effort and varied exploration offer better rewards | No unapproved formula changes during bug fixes |
| D-005 | Six permanent effort-earned attributes with configurable quadratic XP, initial coefficient 25 | Generic/exponential progression proposals |
| D-006 | Agility means terrain/sport/geographic diversity | Personal-pace Agility is superseded |
| D-007 | Physical activity determines boss victory; attributes primarily affect loot | Character-level damage shortcuts are superseded |
| D-008 | Explicit boss activation; default 24h, asynchronous party up to five; one activity and personal boss-tile visit per player | Multiple-activity accumulation and simultaneous-only party designs |
| D-009 | Mythical remains an ultra-level challenge; 50km solo baseline applies to Greater or below | Universal 50km override and flat party bonus that trivializes Mythical |
| D-010 | Foot 1.0 / Bicycle 0.4 initial effort model, configurable | Not a biological equivalence or current live movement support |
| D-011 | Recommendations guide normal XP; no extra quest bonus | Formal training quests TR-102–108 deferred |
| D-012 | Separate dev/prod mutable data/config/auth before a true production shared world | Existing public static playtest is not that architecture |
| D-013 | Auto-Collect follows validated tile entry and configured rarity; manual collection must work first | Amulet tiers/names are not finalized |
| D-014 | Animal companions/Karma are deferred P3 | Not a prerequisite for MVP or competitive progression |
| D-015 | User tests Chrome on iPhone and chooses browser testing for now, without Apple Developer access | Browser persistence/recovery is implementable; uninterrupted locked-screen GPS needs a native/independent recording path |
| D-016 | Repair TR-153/TR-154 and persist/recover adventures before new gameplay | No changes to gold rates, claim prices or search chance to conceal GPS bugs |
| D-017 | Add development/production client variants, dual CI reports and exact-artifact promotion; publish test evidence to GitHub | No silent migration of existing player data; full server isolation remains planned; physical tests remain distinct from simulated GPS |
| D-018 | Continue priority-led work on `develop` and the private dev Site; advance independent P0 data/XP foundations while phone checks are pending | Do not deploy this iteration to production; do not invent XP earning rates or historical effort. Compass orientation is TR-165/P1 backlog. |
| D-019 | Add sourced national path relics and Finland eligibility in dev; retain all existing tile IDs and use geographic distance for new GPS effort | No production promotion, retroactive coin/mileage rewrite or silent metric-grid migration; national random cell-centre destinations stay disabled outside the old local generator area. |
| D-020 | User explicitly promotes the Finland/journal playtest to production and requests a dense Rantalantie, Haukivuori cluster | Supersedes D-018/019 dev-only publication limits for this release. Keep production storage keys/audience and pending phone gates; no invented field-test pass or XP earning rules. |
| D-021 | Apply pinned Graphify locally for development relationships, evidence labels and CI reports (TR-166) | Keep canonical docs, source verification and real tests authoritative. No game dependency, semantic/cloud indexing, global agent settings or production deployment. |
| D-022 | Stabilize map rendering and keep the last accurate route anchor through short GPS accuracy dips (TR-167/168) | Retain the 25m collection/reward accuracy gate, 30s gap break and speed/jump checks. Held map positions never enable collection; no long-gap distance or retroactive route reconstruction. Preserve saves and use distinct explored/ownership styles. |

Open decisions: final spawn/rarity formulas, national tile projection/migration, shared identity/backend provider, supported Garmin bridge, Strava permissions, exact boss individual minimums and activity-window boundaries, XP earning rates, amulet thresholds, long-term location-data retention, native distribution route.
