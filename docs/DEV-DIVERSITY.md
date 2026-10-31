# Terrain and movement diversity — TR-082/052/091/110

Shared dev now records permanent first experiences for three manually classified terrain categories (urban, trail, woodland) and the two supported movement categories (Foot, Bicycle). These are separate from existing first-tile/region Exploration/Agility, distance Endurance, collection Perception and qualified cooperative Fellowship. Power/elevation remains unsupported.

## Experimental rules

The independent protected diversity configuration begins at zero rates for save/rule compatibility. The administrator can review **Use diversity experiment as draft**, then save an audited revision:

| Source | Initial experiment | Qualification |
| --- | --- | --- |
| First terrain class | 3 Agility XP | 250 classified recorded metres in one outing |
| First movement category | 5 Agility XP | Complete and explicitly Stop one outing with 1,000 accepted recorded metres |

Rates are independently editable from 0–10,000 XP; thresholds are 250–100,000 metres. This is a dev experiment under the user's authorization, not final balancing. A saved revision changes future outing policies, never existing XP. Each outing snapshots the diversity rules at start. Its rates/thresholds remain locked even if the administrator edits settings during the activity.

Terrain grants at the qualifying accepted GPS event. Movement grants at explicit Stop. Repeated stop/events, revisits, later outings, policy changes, map resets and compatible older-snapshot restores cannot repay an already qualified category. Qualification is recorded even when the locked XP rate is zero. Short separate outings do not accumulate a movement qualification. No subtype distinction between Walk/Run/Hike is inferred from Foot; imported sport expansion remains separate.

## Accepted evidence and unknowns

Only new accepted shared browser GPS segments within an active real-GPS adventure contribute. Existing location freshness, accuracy, speed, jump and gap checks apply. Demo movement, unknown historical totals, admin XP/inventory edits and long gaps are not diversity evidence. An older active adventure starts a new diversity counter from newly accepted segments; stopping an old saved 50 km counter does not create a reward.

Terrain requires explicit active administrator region classification. Both segment endpoints must have one non-conflicting class and share an active containing region throughout the observation interval. The segment's bounding box must not intersect an active blocked/conflicting region. This is deliberately conservative and can exclude legitimate edge segments; it is not an automatic geographic survey or proof of public access. Unknown/unclassified land stays unknown. A changed region revision does not bridge an old classification anchor into the new one.

Valid accepted movement distance can qualify Foot/Bicycle independently of terrain classification; collection restrictions still apply separately. Terrain counters reset for a new outing, while permanent category experience persists. No elevation/ascent is derived from map colors or activity type.

Server-loaded policy/region revisions, event receipts, XP and player revision settle with transaction guards. A concurrent policy/closure edit rolls back the action and its reward/evidence. The receipt records the locked diversity revision and any qualifying source/XP. Existing tables/snapshot schema remain unchanged. Admin recovery merges permanent diversity history and clears partial active qualification rather than allowing re-earning through a rewind.

## Player and admin experience

Character shows qualified terrain/movement history and, during an outing, recorded qualification distance and locked experimental rules. It does not invent experiences from earlier mileage. Ideas can conditionally project new movement/selected-terrain Agility alongside one new regional block, with explicit requirements and zero grants. These are new-outing estimates; an already active outing retains its starting policy.

The separate admin controls load/edit/version/audit these rules without changing players. Enabling rates does not classify any region. Terrain rewards therefore need an explicitly configured region; the system does not silently label Haukkala, Sippulanniemi or all Finland woodland. Movement qualification is available wherever normal Finland GPS validation permits recording.

## Evidence and remaining gates

Five focused cases cover real reducer/SQL/API behaviour: one-time terrain/movement and repeat rejection, equal Foot/Bicycle credit, short-outing limits, locked/zero rates, legacy saves, reset/restore anti-farming, unavailable/conflicting/blocked terrain, disjoint regions and interior conflicts despite same-class endpoints, GPS gaps, event replay, configuration/closure races, admin/origin/validation controls and non-writing conditional estimates. The complete 131-case suite, mobile/server typecheck/lint, full Expo/Worker build and local structural graph pass.

Local browser saved the 3/5 XP experiment as diversity-dev-1; Character still displayed no qualified categories and no earned XP. No GPS permission, fabricated user movement, historical award, real-player reset or production write was used. Physical phone verification, automatic terrain/access data, finer imported sports and final balance remain pending. Hosting publication and actual active configuration must be checked independently; compiling this source alone does not enable rewards.

Hosted rollout subsequently verified: the private dev console saved diversity-dev-1 with 3/5 XP and 250/1000 m thresholds. Tumppi's Character still shows zero physical experience and XP; enabling rules granted nothing. No classifications were automatically created, so terrain earning requires explicitly classified regions. Production and audience are unchanged.
