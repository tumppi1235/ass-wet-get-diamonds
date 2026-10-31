# Approved design and current playtest rules

## Core loop and geography

Explore real streets/trails, discover artefacts, develop a character through actual effort, and keep one inventory across future Adventure/Discovery sources. Product scope is Finland; Jyväskylä is a development region. Current saved IDs are 250m cells in the existing projection and require a compatibility/migration plan before national expansion.

Adventure Mode targets Garmin-linked recorded training. Discovery Mode works through the phone without a watch workout. The browser's explicit adventure recording is an interim phone test path. Appearance, visibility and collection are separate: persistent/dynamic/personal first-visit drops are planned; less-visited places can reveal clues farther away. Collection eligibility is entering the artefact's tile, not a second 70m radius or reaching its centre. Accurate GPS and current validated state still matter. Existing attempt probability and one-attempt-per-outing rules are preserved during P0 repairs; guaranteed collection and expanded rarity tiers are not silently introduced.

## Current gold and claims

Active exploration earns 1 gold per 250m of accepted walking distance, including repeat tiles, plus 1 gold per first-ever tile visit. Partial distance carries across outings. Existing balances and visits are preserved, with no retroactive rewards. Location-only observation does not award distance gold. Explored tiles can be bought for 1 gold initially; each later purchase of that same tile costs previous price + 1. Own-tile repurchases are blocked. Transfers between other local profiles burn the cost rather than paying the previous owner. Claims remain local until shared services exist.

## Six attributes and loot

| Attribute | Earned through |
| --- | --- |
| Exploration | Unique tile/region coverage |
| Power | Elevation gain and climbing effort |
| Agility | Terrain variety, sport variety and geographic spread; replaces pace-based Agility |
| Endurance | Sustained activity, distance and duration |
| Perception | Artefact types, clues and collection |
| Fellowship | Verified meaningful cooperative participation |

Approved cumulative progression: `XP(level) = coefficient × (level - 1)^2`, initially coefficient 25, configurable. All six use quadratic levels with independently balanced earning rates. Lifetime achievements and XP ledgers persist. Attribute effects on loot have diminishing returns; character levels do not bypass physical boss victory requirements. Numerical XP examples and loot percentages from the discussion are balancing proposals until simulated and approved.

## Boss encounters: latest rules

Reaching a boss tile records presence and shows the boss; it does not activate a fight. Explicit activation starts a configurable window, initially 24 hours. At most five players participate asynchronously. Each supplies exactly one continuous qualifying activity, including normal pauses. Every participant must personally visit the boss tile during that activity and within the encounter window. Contributions need verified effort and tier-specific minimums; party size scales difficulty. Each qualifying victor gets an individual loot roll/base reward.

Distance/elevation/exploration objectives may be combined later. Current balancing targets, not implemented values:

| Tier | Solo foot km | 2 players each | 3 players each | 5 players each |
| --- | ---: | ---: | ---: | ---: |
| Lesser | 20 | 11 | 8 | 5 |
| Standard | 35 | 22 | 17 | 12 |
| Greater | 50 | 35 | 28 | 22 |
| Mythical | 75 | 65 | 58 | 50 |

The initial broad solo-50km guarantee was refined to Greater or lower; Mythical remains exceptional. Exact minimums, activity-already-underway eligibility and modifier caps remain to be finalized. Four concepts: Metsänvartija, Hallahukka, Syvänne, Kivenkulkija. No boss system is live.

## Movement, recommendations and later conveniences

Agreed initial movement model: Foot (walk/run/hike) 1.0 and Bicycle 0.4 effort factor; full geographic discovery/Agility credit for both. Proposed boss rates are 2 HP/km on foot and 0.8 by bicycle, configurable. Use verified activity types, not speed alone, to classify movement. This is not permission to loosen the current walking-only validator before a tested movement-mode implementation.

Recommendations suggest real routes/GPX exports or training such as hill repeats, with estimated normal attribute XP. Following a suggestion earns no special completion bonus. Formal training quests TR-102–108 are deferred. Strava segments are an optional feasibility investigation, not a routing dependency.

Auto-Collect is an equippable, earnable/purchasable convenience with configurable rarity thresholds. It follows the same tile/GPS eligibility, deduplication and inventory rules. Specific amulet names/thresholds remain proposals. Animal companions/Karma are low priority, separate from competitive combat progression. Guilds, woodland resources and events remain in the preserved idea memo.
