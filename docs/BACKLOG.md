# Trail Relics canonical product backlog

Updated 2026-10-31 from all 38 exchanges in the [shared planning discussion](https://chatgpt.com/share/6ae5b6f5-4554-83ed-a7a0-5727b4a4f412) and the subsequent iPhone Chrome field report. Preserve TR-001–154. TR-155–164 are explicit connectivity additions because the discussion left Garmin/Strava integration tasks unnumbered; they do not replace earlier IDs.

Statuses: Backlog (not implemented), Ready (actionable next), In Progress (implementation/device validation outstanding), Blocked (external dependency), Done (stated acceptance scope evidenced), Deferred, Superseded. Priorities retain source story urgency; milestone order and dependencies determine execution. Done below is explicitly client/local scope where stated, not a claim of server/world integration.

## Current release blockers

TR-153: live GPS/tile freeze; TR-154: discovery claiming; TR-146: adventure persistence and browser recovery, with continuous locked-screen recording separately blocked by iPhone browser capabilities. The user chose to keep browser testing without Apple Developer access. See [ROADMAP.md](ROADMAP.md) for the next five priorities and [DECISIONS.md](DECISIONS.md) for superseded designs.

Automated repair evidence and remaining iPhone field gates: [P0 report](P0-EXPLORATION-REPORT.md), [test register](TEST-PLAN.md). Client dev/prod isolation and dual-variant CI are implemented; remote/shared services remain separate work.

## Epics

| Epic | Name | Milestone |
| --- | --- | --- |
| TR-E01 | Artifact Appearance & Exploration | M0/M1 foundations |
| TR-E02 | Finland-wide Game World | M0/M1 foundations |
| TR-E03 | Administration & Simulation | M2 |
| TR-E04 | World Bosses & Cooperative Adventures | M4 |
| TR-E05 | Player Attributes, XP & Loot | M0/M1 foundations |
| TR-E06 | Adventure & Training Recommendations | M3 |
| TR-E07 | Environments, Deployment & Release Management | M1 foundations / M5 |
| TR-E08 | Movement & Effort Balancing | M0/M1 foundations |
| TR-E09 | Animal Companions & Karma | Deferred |

## TR-E01 — Artifact Appearance & Exploration

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-001 | P0 | Done | Define shared geographic grid and cell IDs | — | The same coordinate maps to the same stable 250m ID across existing clients; existing saves retain their IDs. Existing prototype uses common 250m IDs; national projection/migration remains TR-026/027. |
| TR-002 | P0 | Backlog | Create artifact spawn data model | TR-001 | Spawns have stable IDs, tile, type, rarity, creation/expiry and claim policy. |
| TR-003 | P0 | Backlog | Implement deterministic server-side spawn generation | TR-001, TR-002, TR-112 | Identical world inputs yield the same recorded spawns on every client. |
| TR-004 | P0 | Backlog | Implement rarity tiers and weighted selection | TR-002, TR-003 | Configured weighted rarity selection is repeatable under a seeded test and respects all supported tiers. |
| TR-005 | P0 | Backlog | Add cell visitation statistics | TR-001, TR-112 | Unique/capped player visitation is stored separately from raw GPS sample counts. |
| TR-006 | P1 | Backlog | Add terrain and accessibility modifiers | TR-001, TR-029 | Placement uses mapped accessible terrain and excludes restricted routes. |
| TR-007 | P1 | Backlog | Add time, weather and seasonal modifiers | TR-003, TR-033 | Configured time/weather/season inputs change appearance without changing claim ownership. |
| TR-008 | P1 | Backlog | Implement spawn expiration and regeneration | TR-002, TR-003 | Expired spawns are unavailable and regeneration produces new recorded IDs. |
| TR-009 | P0 | Backlog | Add artifact discovery and claim API | TR-003, TR-010, TR-113 | Authenticated discovery and claim operations return consistent eligibility and inventory results. |
| TR-010 | P0 | Backlog | Prevent duplicate claims across Garmin and mobile | TR-002, TR-113 | Replayed event/activity IDs cannot award an inventory item twice. |
| TR-011 | P1 | Backlog | Create developer spawn simulator for Jyväskylä | TR-003, TR-033 | A developer can simulate spawn inputs and inspect outcomes without changing live world state. |
| TR-012 | P2 | Backlog | Add spawn balancing and analytics | TR-011 | Spawn/reward rates are measurable by region and configuration revision. |
| TR-013 | P0 | Done | Track explored tiles separately for each player | TR-001 | Each player retains their own explored cells after reload and account switching. Existing per-profile local saves implement this; shared identity is separate. |
| TR-014 | P0 | Backlog | Grant XP on first tile visit | TR-013, TR-051, TR-087 | Each personal first tile visit grants configured Exploration XP once. |
| TR-015 | P0 | Backlog | Implement first-visit artifact discovery rolls | TR-002, TR-013 | A first personal visit can roll a personal drop independently of persistent world spawns. |
| TR-016 | P0 | Backlog | Keep personal exploration separate from global visitation statistics | TR-005, TR-013 | One player’s old tiles do not suppress another newcomer’s personal first-visit rewards. |
| TR-017 | P1 | Backlog | Allow repeat visits to discover newly spawned world artifacts | TR-008, TR-009 | Returning to a familiar cell can find a later spawn without repaying first-visit XP. |
| TR-018 | P0 | Backlog | Calculate artifact detection radius from global tile visitation | TR-005, TR-016 | Capped global visit density deterministically controls configurable detection range. |
| TR-019 | P0 | In Progress | Replace separate collection radius with tile-based collection eligibility. | — | An accurate point anywhere inside the artefact tile is eligible; a closer point in another tile is not. |
| TR-020 | P1 | Backlog | Reveal distant artifacts on the map | TR-018, TR-019 | Map clues follow detection eligibility without allowing remote collection. |
| TR-021 | P1 | Backlog | Add Garmin proximity and direction indicators | TR-018, TR-155 | The watch displays direction/distance to an eligible detected artefact within its UI constraints. |
| TR-022 | P2 | Backlog | Introduce rarity-based clues and visibility modifiers | TR-004, TR-018 | Rarity changes clue presentation using documented configurable thresholds. |
| TR-023 | P0 | In Progress | Implement tile-entry detection with GPS accuracy handling. | TR-153 | Validated boundary crossings update the active tile; coarse/stale fixes cannot silently enable collection. |
| TR-024 | P0 | In Progress | Enable collection attempts while inside the artifact's tile. | TR-019, TR-023 | Entering the own tile enables one eligible attempt using the latest fix, without a restart. |
| TR-025 | P0 | Backlog | Support one-button collection on Garmin. | TR-155, TR-154 | The selected supported Garmin interaction triggers at most one eligible attempt. |
| TR-146 | P0 | In Progress | Persist adventures and recover across backgrounding and screen lock | TR-153 | Browser state survives lock/reload and recovers GPS without invented mileage; uninterrupted screen-off recording remains a native/Garmin gate. |
| TR-147 | P2 | Backlog | Implement equippable Auto-Collect items | TR-154, TR-051 | An earned/equipped item enables auto-collect without replacing exploration eligibility. |
| TR-148 | P2 | Backlog | Support configurable rarity thresholds for Auto-Collect | TR-147, TR-004 | Configured rarity thresholds determine automatic versus manual collection. |
| TR-149 | P2 | Backlog | Trigger automatic collection on eligible tile entry | TR-147, TR-148, TR-023 | Only validated entry into the artefact’s own tile triggers an automatic attempt. |
| TR-150 | P2 | Backlog | Support acquiring Auto-Collect items through loot or in-game purchases | TR-147 | Eligible auto-collect equipment can be obtained through the chosen gameplay/shop paths. |
| TR-151 | P2 | Backlog | Add Auto-Collect settings and inventory indicators | TR-147, TR-148 | Equipped state and rarity threshold are visible and can be disabled. |
| TR-152 | P2 | Backlog | Support offline collection and later synchronization | TR-149, TR-158, TR-160 | Offline collection events sync idempotently into the same inventory. |
| TR-153 | P0 | In Progress | Recover live GPS and active-tile updates during exploration | — | An active browser adventure survives interruption, reacquires fresh GPS and updates tiles without duplicate watchers. |
| TR-154 | P0 | In Progress | Repair discovery claiming without restarting exploration | TR-153, TR-019 | An eligible own-tile attempt updates inventory/discovery state and failures explain why, without restarting. |
| TR-155 | P0 | Backlog | Prototype Enduro 3 Connect IQ activity data field | — | A normal Enduro 3 activity supplies real GPS/cell data to the prototype field. |
| TR-156 | P0 | Backlog | Detect normal Garmin activity lifecycle and exploration events | TR-155 | Activity start/finish map to one stable exploration session without opening the phone. |
| TR-157 | P0 | Backlog | Link Garmin device/activity to the player account | TR-113, TR-155 | Account/device linking is authenticated, revocable and environment-specific. |
| TR-158 | P0 | Backlog | Buffer and retry offline watch exploration events | TR-155, TR-157 | Offline events survive reconnect and retry safely without reward duplication. |
| TR-159 | P0 | Backlog | Synchronize Adventure and Discovery into one inventory | TR-112, TR-113, TR-157 | Garmin Adventure and phone Discovery use one authenticated inventory. |
| TR-160 | P0 | Backlog | Deduplicate phone, Garmin and imported activity rewards | TR-159 | One outing recorded/imported from multiple sources produces one reward set. |
| TR-161 | P0 | Backlog | Record distance, speed, elevation and activity metadata | TR-156 | Activity evidence retains the fields needed for future configurable effort rules. |
| TR-162 | P0 | Backlog | Field-test normal Enduro 3 activity to game tile synchronization | TR-156, TR-158, TR-159, TR-160 | An Enduro 3 field test updates game cells/inventory without phone recording. |
| TR-163 | P2 | Backlog | Investigate completed-activity Garmin reconciliation | TR-157, TR-160, TR-161 | Current Garmin program/API feasibility and required approvals are verified before reconciliation work. |

## TR-E02 — Finland-wide Game World

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-026 | P0 | Backlog | Support geographic tiles throughout Finland | TR-001 | Eligible test coordinates across Finland have stable cells without a Jyväskylä-only gate. |
| TR-027 | P0 | Backlog | Remove Jyväskylä-specific game logic and configuration | TR-026 | Region policy is configuration, with saved-ID compatibility and migration evidence. |
| TR-028 | P0 | Backlog | Support countrywide artifact spawning and visitation statistics | TR-003, TR-005, TR-026 | National spawn/visit queries return bounded region data and consistent world IDs. |
| TR-029 | P1 | Backlog | Add configurable regions for testing and events | TR-026 | Test/event regions can be configured without code or accidental live-world changes. |
| TR-030 | P1 | Backlog | Optimize map and artifact queries for national coverage | TR-026, TR-028 | Viewport queries remain bounded at country and close navigation zooms. |

## TR-E03 — Administration & Simulation

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-031 | P0 | Backlog | Create separate admin web application | TR-112, TR-113 | Admins use a separate client against the same authenticated game services. |
| TR-032 | P0 | Backlog | Implement admin authentication and permissions | TR-031, TR-113 | Server-side roles reject unauthorized administration even with direct requests. |
| TR-033 | P0 | Backlog | Create editable game-parameter configuration | TR-032 | Validated versioned parameters can be inspected/edited and reverted by authorized admins. |
| TR-034 | P0 | Backlog | Search and inspect player accounts | TR-032 | An authorized admin can locate a player and inspect the intended account only. |
| TR-035 | P0 | Backlog | Add, remove and modify player inventory items | TR-034 | Inventory edits persist, validate item IDs and produce an audit event. |
| TR-036 | P0 | Backlog | Manually place artifacts on geographic tiles | TR-032, TR-002 | An authorized placement creates a visible world artefact in the chosen geographic tile. |
| TR-037 | P0 | Backlog | View and remove existing world artifacts | TR-036 | World edits/removal propagate consistently and invalidate stale client availability. |
| TR-038 | P1 | Backlog | Simulate artifact spawning and collection | TR-033, TR-009 | Spawn/claim simulation uses the actual rules in an isolated test world. |
| TR-039 | P1 | Backlog | Reset individual players' exploration progress | TR-034 | A targeted reset leaves other players and production inventories intact. |
| TR-040 | P1 | Backlog | Create admin audit logs for changes | TR-032 | Changes record actor, time, target and before/after details without credentials. |
| TR-041 | P1 | Backlog | Manage test-player invitations and access | TR-032 | Test access and invitations cannot escalate ordinary player permissions. |
| TR-042 | P1 | Backlog | Create a world map showing artifacts and visitation density | TR-005, TR-036 | World artefacts and visitation density can be inspected with bounded map queries. |

## TR-E04 — World Bosses & Cooperative Adventures

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-043 | P0 | Backlog | Define boss entity, HP, location and active window | TR-002, TR-112 | Boss definitions persist tier, tile, health policy and an explicit encounter window. |
| TR-044 | P0 | Backlog | Convert verified sports activities into boss damage | TR-043, TR-121, TR-126 | Verified activity evidence determines damage using configured movement rules. |
| TR-045 | P0 | Backlog | Implement shared boss health and contribution tracking | TR-044, TR-130 | Contributions update shared health exactly once per eligible activity. |
| TR-046 | P1 | Backlog | Add boss weaknesses and sport-specific modifiers | TR-044, TR-138 | Boss-specific modifiers are capped and cannot bypass required individual effort. |
| TR-047 | P1 | Backlog | Implement group and guild combat bonuses | TR-045 | Only verified participating members contribute configured team benefits. |
| TR-048 | P0 | Backlog | Implement boss victory rewards and rare-drop rolls | TR-045, TR-070, TR-072 | Qualifying victories produce the correct loot ledger and cannot be rewarded twice. |
| TR-049 | P0 | Backlog | Add boss placement and simulation to admin console | TR-031, TR-043 | Authorized admins can place/simulate bosses in an isolated world. |
| TR-050 | P1 | Backlog | Create first four boss designs and encounter rules | TR-043 | Four boss briefs specify theme, signature reward, tile rules and difficulty. |
| TR-059 | P1 | Superseded | Resolve boss encounters within one adventure. | — | Replaced by TR-129/131: asynchronous shared window, one activity per participant. |
| TR-060 | P1 | Backlog | Cap party-size combat benefits at five contributing players. | TR-043 | At most five verified participants affect encounter scaling and rewards. |
| TR-061 | P1 | Backlog | Configure the solo 50km Greater-or-lower victory baseline | TR-065, TR-066 | The Greater-or-lower solo baseline remains 50 equivalent foot km; Mythical has its separately configured target. |
| TR-062 | P1 | Backlog | Introduce configurable boss HP tiers. | TR-043, TR-033 | Tier and party-size thresholds can be configured and simulated. |
| TR-063 | P1 | Superseded | Implement party damage aggregation and teamwork multiplier. | — | Replace the flat teamwork shortcut with TR-065 scaling and TR-045 contribution tracking. |
| TR-064 | P1 | Backlog | Add an admin combat simulator for balancing encounters. | TR-049, TR-065 | Simulation exposes tier, party size, verified contributions and resulting health. |
| TR-065 | P1 | Backlog | Implement boss HP scaling by party size and difficulty tier. | TR-043, TR-060 | Tier-specific HP scales by verified party size without the old flat bonus shortcut. |
| TR-066 | P1 | Backlog | Set tier-specific solo and group distance targets. | TR-065 | The documented solo/group targets are configurable rather than hardcoded UI values. |
| TR-067 | P1 | Backlog | Require minimum individual contributions for high-tier bosses. | TR-065 | High-tier participants must meet configured individual requirements. |
| TR-068 | P1 | Backlog | Lock party composition for each boss encounter. | TR-130 | Joining/leaving cannot exploit a cheaper locked encounter scaling policy. |
| TR-069 | P1 | Backlog | Cap combat modifiers so high-tier bosses retain their endurance requirements. | TR-065 | Combined modifiers cannot remove the tier’s minimum endurance requirement. |
| TR-129 | P1 | Backlog | Configurable boss encounter window, initially 24 hours. | TR-043 | Explicit activation opens a configurable encounter window, initially 24 hours. |
| TR-130 | P1 | Backlog | Asynchronous party participation, maximum five players. | TR-129, TR-060 | Up to five people can contribute at different times within the same encounter. |
| TR-131 | P1 | Backlog | Exactly one qualifying activity per player per encounter. | TR-129, TR-130 | Exactly one qualifying continuous activity counts per participant per encounter. Revised option B replaces multiple activities in the window. |
| TR-132 | P1 | Backlog | Boss tile must be visited during that activity. | TR-131, TR-023 | Each participant’s own boss-tile visit is verified during their qualifying activity/window. |
| TR-133 | P1 | Backlog | Track encounter deadlines, party contributions and boss HP | TR-129, TR-130, TR-131, TR-132 | Deadline, health and individual contribution state remain consistent after reconnect. |
| TR-134 | P1 | Backlog | Apply minimum individual contribution requirements | TR-067, TR-131 | A participant who misses individual minimums cannot receive undeserved victory credit. |
| TR-135 | P1 | Backlog | Resolve encounters automatically on victory or expiration | TR-133, TR-134 | Victory/expiry resolves exactly once, with a persisted outcome. |
| TR-136 | P2 | Backlog | Show encounter countdown and party progress on mobile and Garmin | TR-133, TR-155 | Phone/watch show consistent encounter timing and qualified participation. |
| TR-137 | P1 | Backlog | Support distance, elevation and exploration boss objectives | TR-043, TR-044 | Boss objectives support separately configured distance/elevation/exploration evidence. |
| TR-138 | P1 | Backlog | Configure boss-specific objective combinations and movement multipliers | TR-137, TR-123 | Boss definitions combine objective and movement rules without arbitrary client bonuses. |
| TR-144 | P1 | Backlog | Boss Tile Reached | TR-023, TR-043 | Verified tile arrival shows boss details but does not start the timer. |
| TR-145 | P1 | Backlog | Boss Fight Activated | TR-144, TR-129 | Explicit player activation creates the encounter and notifies the intended party. |

## TR-E05 — Player Attributes, XP & Loot

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-051 | P0 | Backlog | Implement player XP, level and six core attributes | TR-078, TR-087 | All six attributes and independent XP totals survive profile reload. |
| TR-052 | P0 | Backlog | Award attribute XP from verified activities and exploration | TR-051, TR-079 | Verified exploration/activity events grant the correct attribute XP once. |
| TR-053 | P0 | Superseded | Apply player attributes to boss combat | — | Replaced by TR-070/071: attributes affect loot rather than bypassing physical victory. |
| TR-054 | P1 | Superseded | Add attribute progression and diminishing returns | — | Consolidated into TR-087/088 and TR-076; do not implement a second progression curve. |
| TR-055 | P1 | Backlog | Create player character and statistics screen | TR-051 | The player can see lifetime attribute levels, XP and next-level progress. |
| TR-056 | P2 | Backlog | Implement emerging player archetypes | TR-051 | Archetypes describe achievements without locking players out of activities. |
| TR-057 | P1 | Backlog | Add admin tools to modify and reset player attributes | TR-032, TR-051 | Attribute edits/resets are authorized and audited. |
| TR-058 | P1 | Backlog | Balance progression across different sports and abilities | TR-121, TR-123 | Simulations compare casual/regular/ultra and different sports without speed-based Agility. |
| TR-070 | P0 | Backlog | Separate boss victory calculations from loot calculations | TR-043, TR-051 | Changing character levels cannot independently satisfy physical boss victory requirements. |
| TR-071 | P0 | Backlog | Implement attribute-specific loot modifiers | TR-051, TR-070 | Each attribute changes its documented loot opportunity with configured caps. |
| TR-072 | P0 | Backlog | Implement individual boss loot rolls | TR-070, TR-043 | Each qualified participant receives their own idempotent loot roll. |
| TR-073 | P1 | Backlog | Introduce boss-specific signature artifacts | TR-048 | Signature loot is linked to its boss’s versioned loot table. |
| TR-074 | P1 | Backlog | Add contribution-based loot modifiers | TR-044, TR-071 | Contribution modifies individual loot within configured limits. |
| TR-075 | P0 | Backlog | Add guaranteed base rewards for boss victories | TR-048 | Every qualifying victory receives the configured base reward. |
| TR-076 | P1 | Backlog | Add diminishing returns and progression balancing | TR-087, TR-088 | Repeated high levels do not create unbounded loot probability. |
| TR-077 | P1 | Backlog | Create admin loot-probability simulator | TR-033, TR-071 | The admin simulator reports base chance, relative modifiers and final capped probability. |
| TR-078 | P0 | Backlog | Record lifetime player achievements and activity statistics | TR-013 | Raw lifetime evidence remains available when XP balance formulas change. |
| TR-079 | P0 | Backlog | Convert verified exploration and activities into attribute XP | TR-078, TR-121 | An event ledger derives the correct XP without duplicate activity rewards. |
| TR-080 | P0 | Superseded | Implement progressive XP-to-level curves | — | Use the explicitly approved quadratic curve in TR-087. |
| TR-081 | P1 | Backlog | Add activity-specific XP calculations | TR-079, TR-121 | Activity categories use independently configurable XP earning rules. |
| TR-082 | P1 | Backlog | Earn Agility through terrain, sport and geographic diversity | TR-078, TR-086 | Terrain/sport variety and geographic spread increase Agility; raw pace does not. Revised at source turn 38; earlier personal-pace wording is superseded. |
| TR-083 | P0 | Backlog | Prevent repetitive XP farming and duplicate rewards | TR-078, TR-160 | Replayed activities and repeated first-visit events cannot duplicate XP. |
| TR-084 | P1 | Backlog | Display lifetime achievements and attribute progression | TR-051, TR-078 | Players can inspect the achievements underlying their XP. |
| TR-085 | P1 | Backlog | Add attribute progression simulator to admin console | TR-033, TR-079 | Simulation can replay representative activity histories with versioned rules. |
| TR-086 | P1 | Backlog | Track geographic adventure diversity | TR-026, TR-078 | Large-cell/region spread is tracked separately from small-tile coverage. |
| TR-087 | P0 | Backlog | Implement quadratic attribute XP progression | TR-078 | Cumulative XP equals configurable coefficient × (level−1)^2, initially 25. |
| TR-088 | P1 | Backlog | Apply diminishing returns to attribute-based loot bonuses | TR-087, TR-071 | Attribute loot bonuses approach a configured cap and remain relative modifiers. |
| TR-089 | P1 | Backlog | Add XP curve configuration and visualization to the admin console | TR-033, TR-087 | Admins can graph/change versioned curves without losing raw achievement data. |
| TR-090 | P1 | Backlog | Simulate progression for casual, regular and highly active players | TR-087, TR-089 | Progression reports compare realistic casual, regular and highly active histories. |
| TR-091 | P1 | Backlog | Balance XP earning rates independently for all six attributes | TR-079, TR-090 | Each attribute earning rate can be tuned independently while using the same level curve. |

## TR-E06 — Adventure & Training Recommendations

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-092 | P1 | Backlog | Adventure recommendation interface | TR-051 | The player can choose an attribute goal and see route or non-route suggestions. |
| TR-093 | P1 | Backlog | Personalized recommendations for accumulating specific attributes | TR-092, TR-095 | Suggestions reflect selected goal, location and preferences without bonus quest XP. |
| TR-094 | P1 | Backlog | Route generation using real trail and geographic data | TR-026, TR-101 | Routes follow real usable geographic paths and have valid GPX coordinates. |
| TR-095 | P1 | Backlog | Estimated attribute XP for recommendations | TR-079, TR-087 | Displayed estimates use the same versioned XP rules as verified completed activity. |
| TR-096 | P1 | Backlog | Include artifact and boss opportunities in recommendations | TR-094, TR-003, TR-043 | Relevant detected artefacts/bosses can be included without forcing extra collection range. |
| TR-097 | P2 | Backlog | Evaluate Strava segments as potential training suggestions | TR-164 | Feasibility, permissions and permitted Strava segment use are documented before implementation. |
| TR-098 | P1 | Backlog | GPX export for Garmin and other navigation devices | TR-094 | A generated GPX route can be exported and validated in a supported navigation workflow. |
| TR-099 | P2 | Backlog | Compare predicted versus actual adventure rewards | TR-095 | Verified actual rewards can be compared with estimates without double rewards. |
| TR-100 | P2 | Backlog | Add group adventure and boss-route planning | TR-094, TR-130 | A party route includes encounter timing and each member’s required tile visit. |
| TR-101 | P1 | Backlog | Match suggestions to sport, distance, difficulty and accessibility | TR-026 | Suggestions respect sport, distance, difficulty and access constraints. |
| TR-102 | P1 | Deferred | Implement location-based training quests | — | Deferred formal-quest design; ordinary recommendation XP is handled in TR-092–110, without a completion bonus. |
| TR-103 | P1 | Deferred | Support repeatable objectives such as hill ascents | — | Deferred formal-quest design; ordinary recommendation XP is handled in TR-092–110, without a completion bonus. |
| TR-104 | P1 | Deferred | Verify quest completion using GPS and elevation data | — | Deferred formal-quest design; ordinary recommendation XP is handled in TR-092–110, without a completion bonus. |
| TR-105 | P1 | Deferred | Award attribute XP and completion bonuses | — | Deferred formal-quest design; ordinary recommendation XP is handled in TR-092–110, without a completion bonus. |
| TR-106 | P2 | Deferred | Generate quests from terrain, routes and geographic features | — | Deferred formal-quest design; ordinary recommendation XP is handled in TR-092–110, without a completion bonus. |
| TR-107 | P1 | Deferred | Allow admins to create and configure custom training quests | — | Deferred formal-quest design; ordinary recommendation XP is handled in TR-092–110, without a completion bonus. |
| TR-108 | P2 | Deferred | Show live quest progress during Garmin activities | — | Deferred formal-quest design; ordinary recommendation XP is handled in TR-092–110, without a completion bonus. |
| TR-109 | P1 | Backlog | Generate non-route training suggestions, including hill repeats | TR-092, TR-095 | Non-route guidance such as hill repeats estimates ordinary verified activity XP. |
| TR-110 | P1 | Backlog | Recommend adventures that introduce new sports, terrain or regions | TR-082, TR-093 | Suggestions can prioritize unfamiliar sports, terrain or regions. |
| TR-164 | P2 | Backlog | Investigate optional Strava activity/account connectivity | TR-113, TR-160 | Strava is optional; verify permissions, account linking, activity deduplication and data-use constraints. |

## TR-E07 — Environments, Deployment & Release Management

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-111 | P0 | In Progress | Establish separate Development and Production environments | — | Development and production are explicitly identified and independently deployable. |
| TR-112 | P0 | In Progress | Create separate databases, storage and game-world state | TR-111 | Mutable world/player data and storage are isolated, with an isolation test. |
| TR-113 | P0 | Backlog | Configure environment-specific APIs, secrets and authentication | TR-111 | Clients cannot mix environment APIs, auth or secret scopes. |
| TR-114 | P1 | In Progress | Implement automated build, test and deployment pipelines | TR-111 | Versioned builds run required validation before a deployable artifact is produced. |
| TR-115 | P0 | Backlog | Support independent game-balance configurations for Dev and Prod | TR-111, TR-033 | A development balance edit cannot alter production parameters. |
| TR-116 | P1 | In Progress | Create a controlled Dev → Prod release process | TR-114, TR-115 | A specific validated revision is promoted with an auditable rollback path. |
| TR-117 | P1 | Backlog | Add production monitoring, error logging and alerts | TR-113 | Production failures are observable without leaking precise location histories. |
| TR-118 | P0 | Backlog | Implement database backups, migrations and rollback procedures | TR-112 | A tested migration/backup/restore path preserves player inventories and progress. |
| TR-119 | P0 | Backlog | Separate test players, artifacts, bosses and inventories from production | TR-111, TR-112 | Test players, inventories and placed spawns cannot enter production accidentally. |
| TR-120 | P1 | In Progress | Document release procedures and environment configuration | TR-116, TR-118 | A new maintainer can follow promotion, rollback and recovery instructions. |

## TR-E08 — Movement & Effort Balancing

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-121 | P0 | Backlog | Implement Foot and Bicycle movement categories | — | Walk/run/hike map to Foot and cycling maps to Bicycle. |
| TR-122 | P0 | Backlog | Map Garmin and imported activity types to movement categories | TR-121, TR-155 | Known imported activity types map deterministically; unknowns are not guessed from speed alone. |
| TR-123 | P0 | Backlog | Implement configurable movement-based XP multipliers | TR-121, TR-079 | Initial Foot 1.0 and Bicycle 0.4 factors are versioned and configurable. |
| TR-124 | P1 | Backlog | Implement movement-based boss damage multipliers | TR-121, TR-044 | Boss distance damage uses the configured 2/0.8 HP per km baseline. |
| TR-125 | P0 | Backlog | Give both movement categories full geographic discovery credit | TR-121, TR-013 | Both modes receive full valid geographic discovery credit. |
| TR-126 | P1 | Backlog | Add activity validation and basic anti-cheat checks | TR-121, TR-153 | Implausible motion and replayed activity evidence cannot create rewards. |
| TR-127 | P1 | Backlog | Add movement balancing controls to admin console | TR-033, TR-123, TR-124 | Admins can simulate and tune movement factors without touching production tests. |
| TR-128 | P2 | Deferred | Support mixed-mode adventures in a future release | TR-121, TR-126 | A later design can split a recorded adventure into verified movement segments. |

## TR-E09 — Animal Companions & Karma

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-139 | P3 | Deferred | Create animal companion profiles | — | A player can create an optional named animal companion profile. |
| TR-140 | P3 | Deferred | Mark recorded activities as companion adventures | TR-139 | An eligible activity can be marked as a self-declared companion outing. |
| TR-141 | P3 | Deferred | Award Karma for companion activities | TR-140 | Companion time outdoors earns capped Karma, not speed-based animal rewards. |
| TR-142 | P3 | Deferred | Add companion avatars and cosmetic progression | TR-139 | Cosmetics/titles do not make companions a competitive requirement. |
| TR-143 | P3 | Deferred | Configure Karma rewards and daily limits | TR-141, TR-033 | Karma rates/caps are configurable independently of combat XP. |

## Scope and evidence

Current code already has local registration/login, saved inventories, curated/generated discoveries, retro map, walking/first-visit gold and local tile claims. These are useful prototype capabilities, not completion of shared-world/admin/XP stories. No boss, global visitation, cloud identity, production environment split, live Garmin connectivity, Strava link or Auto-Collect is implemented by creating this backlog.

The P0 implementation report and device retest checklist must be linked here before claiming the full release gates are complete. The original [GAME-ROADMAP.md](GAME-ROADMAP.md) is retained as an idea/provenance memo; this document and DECISIONS.md govern current implementation order. Chat workstream names are defined in PROJECT-ORGANIZATION.md; no chats are claimed to have been created or moved.
