# Trail Relics canonical product backlog

Updated 2026-10-31 from all 38 exchanges in the [shared planning discussion](https://chatgpt.com/share/6ae5b6f5-4554-83ed-a7a0-5727b4a4f412), the subsequent iPhone Chrome field report and later requests. Preserve TR-001–154. TR-155–164 capture connectivity additions; TR-165 captures the requested live phone compass. No original IDs are replaced.

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
| TR-002 | P0 | Done | Create artifact spawn data model | TR-001 | Versioned spawn contract, validated identity/tile/coordinates/type/rarity/timestamps/policy, personal owner and legacy adapter in `game/spawns.ts`; tested in `foundations.test.ts`. Model only: no server generator, shared claims or new live appearances. |
| TR-003 | P0 | Done | Implement deterministic server-side spawn generation | TR-001, TR-002, TR-112 | Shared dev records deterministic revision/source/window spawns at sourced path coordinates. SQL and seeded tests; see DEV-SPAWNS.md. |
| TR-004 | P0 | Done | Implement rarity tiers and weighted selection | TR-002, TR-003 | Configurable Common/Rare/Legendary weights use repeatable seeded selection; distribution and tier tests pass. |
| TR-005 | P0 | Done | Add cell visitation statistics | TR-001, TR-112 | D1 unique tile/player visits are separate from personal rewards; independent-newcomer SQL tests pass. |
| TR-006 | P1 | In Progress | Add terrain and accessibility modifiers | TR-001, TR-029 | Sourced paths plus manually classified event terrain and blocked-area checks are implemented in shared dev, including capture/config race rollback. Automatic terrain classification and physical access verification remain. |
| TR-007 | P1 | Done | Add time, weather and seasonal modifiers | TR-003, TR-033 | Versioned UTC window-season/night and configured test-weather modifiers alter future appearance, preserve recorded claims and cap combined factors; phase identity tests pass. |
| TR-008 | P1 | Done | Implement spawn expiration and regeneration | TR-002, TR-003 | Expired records are unavailable; later UTC windows create new identities without changing existing inventory. |
| TR-009 | P0 | In Progress | Add artifact discovery and claim API | TR-003, TR-010, TR-113 | Shared APIs enforce fresh own-tile eligibility and atomic spawn/player claim receipts. Web SQL tests pass; device integration/field checks remain. |
| TR-010 | P0 | In Progress | Prevent duplicate claims across Garmin and mobile | TR-002, TR-113 | Atomic per-spawn/player ledger and event replay prevent duplicate shared web rewards. Garmin bridge remains TR-157–160. |
| TR-011 | P1 | Done | Create developer spawn simulator for Jyväskylä | TR-003, TR-033 | Protected zero-write simulation uses actual generation for 501 sourced positions including Jyväskylä. Local browser verified. |
| TR-012 | P2 | Done | Add spawn balancing and analytics | TR-011 | Protected bounded regional birth-cohort statistics separate distinct recorded appearances from per-player claims and earning revisions, with Perception XP/daily rates, unknown receipt handling and group limits. Lazy records are not a national population census; see DEV-COLLECTION-LAB.md. |
| TR-013 | P0 | Done | Track explored tiles separately for each player | TR-001 | Each player retains their own explored cells after reload and account switching. Existing per-profile local saves implement this; shared identity is separate. |
| TR-014 | P0 | Done | Grant XP on first tile visit | TR-013, TR-051, TR-087 | Experimental first-tile Exploration XP is awarded once; other visitors, replay and config edits cannot repay it. SQL verified. |
| TR-015 | P0 | Done | Implement first-visit artifact discovery rolls | TR-002, TR-013 | First accepted visit to a sourced tile independently rolls a personal drop; later visits/config edits cannot reroll. No unsafe unsourced placement. |
| TR-016 | P0 | Done | Keep personal exploration separate from global visitation statistics | TR-005, TR-013 | Personal coverage and global density are separate; two-newcomer SQL tests prove independent owner-only rewards. |
| TR-017 | P1 | In Progress | Allow repeat visits to discover newly spawned world artifacts | TR-008, TR-009 | Returning can detect new window identities without first-tile XP. Software tested; physical return visit pending. |
| TR-018 | P0 | Done | Calculate artifact detection radius from global tile visitation | TR-005, TR-016 | Configurable capped unique-visitor density controls detection range, preserving own-tile eligibility. Boundary/cap tests pass. |
| TR-019 | P0 | In Progress | Replace separate collection radius with tile-based collection eligibility. | — | An accurate point anywhere inside the artefact tile is eligible; a closer point in another tile is not. |
| TR-020 | P1 | In Progress | Reveal distant artifacts on the map | TR-018, TR-019 | Shared map shows detected nearby spawns while collection still needs own-tile GPS. Legacy catalog suppressed only in shared mode; field checks pending. |
| TR-021 | P1 | Backlog | Add Garmin proximity and direction indicators | TR-018, TR-155 | The watch displays direction/distance to an eligible detected artefact within its UI constraints. |
| TR-022 | P2 | Backlog | Introduce rarity-based clues and visibility modifiers | TR-004, TR-018 | Rarity changes clue presentation using documented configurable thresholds. |
| TR-023 | P0 | In Progress | Implement tile-entry detection with GPS accuracy handling. | TR-153 | Validated boundary crossings update the active tile; coarse/stale fixes cannot silently enable collection. |
| TR-024 | P0 | In Progress | Enable collection attempts while inside the artifact's tile. | TR-019, TR-023 | Entering the own tile enables one eligible attempt using the latest fix, without a restart. |
| TR-025 | P0 | In Progress | Support one-button collection on Garmin. | TR-155, TR-154 | Manual-LAP-only intent hook compiles and deduplicates by activity/tile without auto-lap capture. Target build, device interaction proof, linked detected spawns and authoritative collection remain. |
| TR-146 | P0 | In Progress | Persist adventures and recover across backgrounding and screen lock | TR-153 | Browser state survives lock/reload and recovers GPS without invented mileage; uninterrupted screen-off recording remains a native/Garmin gate. |
| TR-147 | P2 | Backlog | Implement equippable Auto-Collect items | TR-154, TR-051 | An earned/equipped item enables auto-collect without replacing exploration eligibility. |
| TR-148 | P2 | Backlog | Support configurable rarity thresholds for Auto-Collect | TR-147, TR-004 | Configured rarity thresholds determine automatic versus manual collection. |
| TR-149 | P2 | Backlog | Trigger automatic collection on eligible tile entry | TR-147, TR-148, TR-023 | Only validated entry into the artefact’s own tile triggers an automatic attempt. |
| TR-150 | P2 | Backlog | Support acquiring Auto-Collect items through loot or in-game purchases | TR-147 | Eligible auto-collect equipment can be obtained through the chosen gameplay/shop paths. |
| TR-151 | P2 | Backlog | Add Auto-Collect settings and inventory indicators | TR-147, TR-148 | Equipped state and rarity threshold are visible and can be disabled. |
| TR-152 | P2 | Backlog | Support offline collection and later synchronization | TR-149, TR-158, TR-160 | Offline collection events sync idempotently into the same inventory. |
| TR-153 | P0 | In Progress | Recover live GPS and active-tile updates during exploration | — | An active browser adventure survives interruption, reacquires fresh GPS and updates tiles without duplicate watchers. |
| TR-154 | P0 | In Progress | Repair discovery claiming without restarting exploration | TR-153, TR-019 | An eligible own-tile attempt updates inventory/discovery state and failures explain why, without restarting. |
| TR-155 | P0 | In Progress | Prototype Enduro 3 Connect IQ activity data field | — | Separate normal-activity data-field source and Monkey C tests compile generically with SDK 9.3.0. Actual Enduro 3 profile is missing; target build/simulator/physical GPS proof remain pending. See DEV-GARMIN-FIELD.md. |
| TR-156 | P0 | In Progress | Detect normal Garmin activity lifecycle and exploration events | TR-155 | Data-field source keeps stable SDK start/profile identity across pauses/reloads and records reset as ended-unverified. Save/discard distinction, executed simulator and real normal-activity tests remain. |
| TR-157 | P0 | Backlog | Link Garmin device/activity to the player account | TR-113, TR-155 | Account/device linking is authenticated, revocable and environment-specific. |
| TR-158 | P0 | In Progress | Buffer and retry offline watch exploration events | TR-155, TR-157 | Device-local bounded 64-event activity/tile/intent queue preserves unacknowledged records and compiles; authenticated link, acknowledgements, transport retries and device execution remain. |
| TR-159 | P0 | Backlog | Synchronize Adventure and Discovery into one inventory | TR-112, TR-113, TR-157 | Garmin Adventure and phone Discovery use one authenticated inventory. |
| TR-160 | P0 | Backlog | Deduplicate phone, Garmin and imported activity rewards | TR-159 | One outing recorded/imported from multiple sources produces one reward set. |
| TR-161 | P0 | In Progress | Record distance, speed, elevation and activity metadata | TR-156 | Data-field prototype observes SDK distance/timer/ascent and tile-entry locations separately from game-validated evidence. Quality is not metre accuracy; provider completion/metadata validation remain. |
| TR-162 | P0 | Backlog | Field-test normal Enduro 3 activity to game tile synchronization | TR-156, TR-158, TR-159, TR-160 | An Enduro 3 field test updates game cells/inventory without phone recording. |
| TR-163 | P2 | Done | Investigate completed-activity Garmin reconciliation | TR-157, TR-160, TR-161 | Official Personal/Business paths, separate terms/credentials, callback/evidence and dedup gates documented in CONNECTIVITY-FEASIBILITY.md. Investigation only; no completed import or live provider test. |
| TR-165 | P1 | In Progress | Make the phone compass follow the actual device heading | TR-153 | Dev-only browser implementation and simulated tests: opt-in orientation permission, screen-top heading, relative arrow, circular smoothing, rotation/lifecycle cleanup and explicit north-up fallback. iPhone magnetic data labeled approximate; true-north correction/native support and physical iPhone Chrome verification remain pending. See DEV-COMPASS.md. |

## TR-E02 — Finland-wide Game World

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-026 | P0 | In Progress | Support geographic tiles throughout Finland | TR-001 | Dev uses a Finland multipolygon including Åland, with stable legacy tile IDs, metric GPS distance and coast-intersecting claim cells. Countrywide automated cases pass; physical coast/border tests and any future metric-grid migration remain pending. |
| TR-027 | P0 | In Progress | Remove Jyväskylä-specific game logic and configuration | TR-026 | Dev GPS, gold, tile claims/overlays, labels and collection use Finland policy; production scope stays unchanged. Existing save IDs retained; old distance/coins are not recalculated. See FINLAND-PLAYTEST.md. |
| TR-028 | P0 | In Progress | Support countrywide artifact spawning and visitation statistics | TR-003, TR-005, TR-026 | Dev adds 450 sourced path-side relics (35 towns plus rural trails) and local visits. This finite catalog does not complete server spawn generation, global visitation or shared queries. |
| TR-029 | P1 | Done | Add configurable regions for testing and events | TR-026 | Protected visual-map region drafts, local active windows, terrain/weather/factor settings and access blocking persist with optimistic revisions and audit. Local D1/browser save passed. |
| TR-030 | P1 | In Progress | Optimize map and artifact queries for national coverage | TR-026, TR-028 | Country rendering, bounded spawn pages, indexed community queries, paged visible-area claims, exact tile prices and bounded ownership count groups implemented; compatible legacy-index/recovery tests pass. Full national load and device validation remain. See DEV-CLAIM-QUERIES.md. |

## TR-E03 — Administration & Simulation

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-031 | P0 | Done | Create separate admin web application | TR-112, TR-113 | Separate Vinext admin client uses protected shared dev APIs; hosted owner routing verified. Individual tools retain their own stories. |
| TR-032 | P0 | Done | Implement admin authentication and permissions | TR-031, TR-113 | Platform identity and server roles guard admin rendering/APIs. Escalation/request rejection and local/hosted owner checks pass. |
| TR-033 | P0 | In Progress | Create editable game-parameter configuration | TR-032 | Experimental XP/movement balance is validated, optimistic-versioned and audited through a real admin UI. Local D1 save verified; spawn/boss/loot policies now also have audited controls; broader recovery UI remains. |
| TR-034 | P0 | Done | Search and inspect player accounts | TR-032 | Protected name/ID search and selected-account inspection are implemented; API isolation tests and local browser pass. |
| TR-035 | P0 | Done | Add, remove and modify player inventory items | TR-034 | Supported inventory grants/edits/removal persist with expected revision, before-state snapshot and audit. Test grants do not award field evidence/XP. |
| TR-036 | P0 | In Progress | Manually place artifacts on geographic tiles | TR-032, TR-002 | Protected manual Finland placement and map-ready records have audits and expiry. SQL verified; manual access review/field placement checks remain. |
| TR-037 | P0 | Done | View and remove existing world artifacts | TR-036 | Bounded inspection and audited retirement invalidate availability without removing prior inventory. SQL and local browser verified. |
| TR-038 | P1 | Done | Simulate artifact spawning and collection | TR-033, TR-009 | Protected sourced-path laboratory reuses actual generation/detection/own-tile/search/energy rules in fresh synthetic games. Seeded independent players, accuracy/position/density/closure cases and expected-vs-simulated finds are tested with zero world writes. |
| TR-039 | P1 | Done | Reset individual players' exploration progress | TR-034 | Recoverable map/route reset stops the target quest, preserving gold/inventory/XP/ownership and permanent reward history. Other players unaffected; no first-visit farming. |
| TR-040 | P1 | Done | Create admin audit logs for changes | TR-032 | Protected bounded audit API/UI records balance and spawn edits/retirement with actor/time/before-after, without credentials. |
| TR-041 | P1 | Backlog | Manage test-player invitations and access | TR-032 | Test access and invitations cannot escalate ordinary player permissions. |
| TR-042 | P1 | Done | Create a world map showing artifacts and visitation density | TR-005, TR-036 | Separate admin MapLibre world map shows paged rarity-sized artefacts and indexed unique visitor density, with draft region overlays. SQL and local browser loading verified. |

## TR-E04 — World Bosses & Cooperative Adventures

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-043 | P0 | Done | Define boss entity, HP, location and active window | TR-002, TR-112 | Shared dev persists sourced boss identity/tier/tile/availability and immutable physical-rule snapshot. Protected placement/retirement and SQL tests; live encounters are separate stories. |
| TR-044 | P0 | In Progress | Convert verified sports activities into boss damage | TR-043, TR-121, TR-126 | Server-recorded Foot/Bicycle activity receipts supply post-activation distance and own-tile evidence, not client totals; basic consistency checks and window tests pass. External provider attestation remains. |
| TR-045 | P0 | Done | Implement shared boss health and contribution tracking | TR-044, TR-130 | Shared dev atomically records one activity contribution per member and updates locked encounter HP with revision checks and replay receipts; SQLite conflict tests pass. |
| TR-046 | P1 | Done | Add boss weaknesses and sport-specific modifiers | TR-044, TR-138 | Placed weakness/movement modifiers apply to real shared contribution damage within the snapshotted cap; unmodified equivalent effort still determines the personal minimum. |
| TR-047 | P1 | In Progress | Implement group and guild combat bonuses | TR-045 | Meaningful cooperation by at least two submitted qualified players affects capped individual loot and Fellowship. Roster slots do not create rewards; guild combat is still pending. |
| TR-048 | P0 | Done | Implement boss victory rewards and rare-drop rolls | TR-045, TR-070, TR-072 | Qualified shared dev winners receive an individual persisted gold/item roll and Fellowship where earned; reward row, wallet, inventory, audit and receipt settle atomically with no duplicate claims. |
| TR-049 | P0 | Done | Add boss placement and simulation to admin console | TR-031, TR-043 | Protected sourced boss placement/retirement, physical/loot simulations and paged live encounter operations are implemented. Inspect consent/HP/deadlines/rewards; audited reasoned cancellation preserves player progress and rejects stale or resolved changes. |
| TR-050 | P1 | Done | Create first four boss designs and encounter rules | TR-043 | Four theme/signature/path designs implemented; their signatures are now actual individual Legendary loot outcomes. See DEV-BOSS-FOUNDATIONS.md and DEV-ENCOUNTERS.md. |
| TR-059 | P1 | Superseded | Resolve boss encounters within one adventure. | — | Replaced by TR-129/131: asynchronous shared window, one activity per participant. |
| TR-060 | P1 | Done | Cap party-size combat benefits at five contributing players. | TR-043 | Persistent accepted parties and activity contributors are capped at five distinct players; pending invitations require consent and active rosters are locked. |
| TR-061 | P1 | Done | Configure the solo 50km Greater-or-lower victory baseline | TR-065, TR-066 | Protected policy retains Greater solo 50 equivalent foot km and Lesser/Standard <=50; Mythical has separately guarded ultra targets. Unit tests pass. |
| TR-062 | P1 | Done | Introduce configurable boss HP tiers. | TR-043, TR-033 | Admin edits/audits immutable tier/party distance-to-HP policy and simulates it; placed definitions snapshot their policy. |
| TR-063 | P1 | Superseded | Implement party damage aggregation and teamwork multiplier. | — | Replace the flat teamwork shortcut with TR-065 scaling and TR-045 contribution tracking. |
| TR-064 | P1 | Done | Add an admin combat simulator for balancing encounters. | TR-049, TR-065 | Protected combat simulator reports synthetic participants, physical HP, required/minimum km and qualification with zero world/player writes. Local browser verified. |
| TR-065 | P1 | Done | Implement boss HP scaling by party size and difficulty tier. | TR-043, TR-060 | Activation snapshots HP from the accepted, locked roster and tier policy. Total required effort cannot decrease with party size; new-rule edits cannot rewrite active encounters. |
| TR-066 | P1 | Done | Set tier-specific solo and group distance targets. | TR-065 | Approved solo/2/3/5 targets are configurable with guardrails; four-person experimental totals interpolate 3/5. Defaults and baseline tests pass. |
| TR-067 | P1 | In Progress | Require minimum individual contributions for high-tier bosses. | TR-065 | Configurable unmodified individual minimums and absolute Mythical floor implemented in model/simulator; real participant qualification pending. |
| TR-068 | P1 | Done | Lock party composition for each boss encounter. | TR-130 | Draft members may decline/leave; all invited members must accept before creator activation. Active parties cannot change roster or reduce their locked target. |
| TR-069 | P1 | Done | Cap combat modifiers so high-tier bosses retain their endurance requirements. | TR-065 | Live shared contribution damage applies snapshotted caps; individual qualification uses unmodified physical equivalent distance, including the Mythical floor. |
| TR-129 | P1 | Done | Configurable boss encounter window, initially 24 hours. | TR-043 | Explicit fresh own-tile activation opens the configured window (initial 24h); arrival/drafts start no timer. Rules/deadline persist through reconnect. |
| TR-130 | P1 | Done | Asynchronous party participation, maximum five players. | TR-129, TR-060 | Up to five accepted players submit at different times in the shared window, with party progress refresh and membership-scoped access. |
| TR-131 | P1 | Done | Exactly one qualifying activity per player per encounter. | TR-129, TR-130 | One completed browser activity per participant counts, only post-activation segments, and cannot be reused by that player for the same boss. External imports remain unsupported. |
| TR-132 | P1 | Done | Boss tile must be visited during that activity. | TR-131, TR-023 | Each submitted activity needs its own accepted boss-tile GPS receipt within the encounter window and outside configured blocked-access intervals; saved visits alone do not qualify. |
| TR-133 | P1 | Done | Track encounter deadlines, party contributions and boss HP | TR-129, TR-130, TR-131, TR-132 | Phone Encounters tab shows persisted deadline/countdown, locked HP, party consent, contribution distance and qualification after reload. |
| TR-134 | P1 | Done | Apply minimum individual contribution requirements | TR-067, TR-131 | Per-tier personal minimums use unmodified equivalent effort; unqualified members receive no loot/group credit even if carried to victory. |
| TR-135 | P1 | Done | Resolve encounters automatically on victory or expiration | TR-133, TR-134 | Contributions settle victory/failure atomically; immutable deadline expiry resolves once on read/action and releases reserved slots. No external scheduled worker is claimed. |
| TR-136 | P2 | In Progress | Show encounter countdown and party progress on mobile and Garmin | TR-133, TR-155 | Phone shows persisted encounter countdown, HP and participation with 15-second refresh while visible. Garmin display/sync remains. |
| TR-137 | P1 | Backlog | Support distance, elevation and exploration boss objectives | TR-043, TR-044 | Boss objectives support separately configured distance/elevation/exploration evidence. |
| TR-138 | P1 | Backlog | Configure boss-specific objective combinations and movement multipliers | TR-137, TR-123 | Boss definitions combine objective and movement rules without arbitrary client bonuses. |
| TR-144 | P1 | In Progress | Boss Tile Reached | TR-023, TR-043 | Player can inspect nearby boss details and guide with the compass; accurate own-tile arrival is checked for activation without starting a timer. Automatic arrival presentation/map boss markers remain. |
| TR-145 | P1 | In Progress | Boss Fight Activated | TR-144, TR-129 | Explicit creator activation after consent locks the encounter, and party members see it on refresh. Push/provider/watch notifications remain. |

## TR-E05 — Player Attributes, XP & Loot

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-051 | P0 | In Progress | Implement player XP, level and six core attributes | TR-078, TR-087 | Six saved totals and quadratic levels; four earned sources use authorized experimental shared dev rates. Qualified cooperative Fellowship is now earned; elevation/Power and broader progression remain. |
| TR-052 | P0 | In Progress | Award attribute XP from verified activities and exploration | TR-051, TR-079 | Shared dev computes first-tile Exploration, regional Agility, accepted-distance Endurance and collection Perception from versioned experimental rules. Qualified cooperation now awards Fellowship; Power/elevation and imported-provider evidence remain. |
| TR-053 | P0 | Superseded | Apply player attributes to boss combat | — | Replaced by TR-070/071: attributes affect loot rather than bypassing physical victory. |
| TR-054 | P1 | Superseded | Add attribute progression and diminishing returns | — | Consolidated into TR-087/088 and TR-076; do not implement a second progression curve. |
| TR-055 | P1 | Done | Create player character and statistics screen | TR-051 | Shared Character tab displays all six levels, XP, remaining thresholds and lifetime evidence; map remains visible. Local phone-size browser review passed. |
| TR-056 | P2 | Done | Implement emerging player archetypes | TR-051 | Descriptive archetypes derive from leading attribute levels without restricting activities or changing rewards; deterministic non-mutation tests pass. |
| TR-057 | P1 | Done | Add admin tools to modify and reset player attributes | TR-032, TR-051 | Protected six-attribute edit/reset validates whole non-negative totals and records backup/audit; stale views cannot overwrite newer state. |
| TR-058 | P1 | In Progress | Balance progression across different sports and abilities | TR-121, TR-123 | Admin compares casual/regular/highly-active four-week histories for Foot/Bicycle with editable effort factors and displayed assumptions. Final balancing and wider sports/evidence remain. |
| TR-070 | P0 | Done | Separate boss victory calculations from loot calculations | TR-043, TR-051 | Physical receipt-derived victory and separate per-player loot policy/ledger are implemented; attributes cannot supply HP damage. |
| TR-071 | P0 | Done | Implement attribute-specific loot modifiers | TR-051, TR-070 | Six documented attribute-specific individual loot effects use capped, diminishing modifiers and validated experimental policy. |
| TR-072 | P0 | Done | Implement individual boss loot rolls | TR-070, TR-043 | Each submitted qualified winner gets one server roll and persisted private reward, safe under duplicate nonces, reload and wallet-conflict rollback. |
| TR-073 | P1 | Done | Introduce boss-specific signature artifacts | TR-048 | Four boss signatures become titled Legendary items linked to the placed boss and activation-time loot policy; Collection displays their titles. |
| TR-074 | P1 | Done | Add contribution-based loot modifiers | TR-044, TR-071 | Extra unmodified equivalent effort above the locked target provides a bounded loot modifier; no extra physical damage comes from attribute levels. |
| TR-075 | P0 | Done | Add guaranteed base rewards for boss victories | TR-048 | Every qualified winner receives configured guaranteed gold plus one item; solo and meaningful co-op cases are tested. |
| TR-076 | P1 | In Progress | Add diminishing returns and progression balancing | TR-087, TR-088 | Implemented bounded diminishing loot bonuses and zero-write comparison laboratory. Final progression fairness and real-user balancing remain. |
| TR-077 | P1 | Done | Create admin loot-probability simulator | TR-033, TR-071 | Protected loot simulator reports base/final capped outcome chances, contribution/group modifiers and guaranteed rewards with zero player writes. |
| TR-078 | P0 | In Progress | Record lifetime player achievements and activity statistics | TR-013 | Dev records local GPS distance, observed duration, unique tiles/finds and per-adventure totals independently of XP. Demo and gaps excluded; legacy history labeled, unknown distance not guessed. Imported activity/elevation/cooperation evidence and physical phone verification remain pending. See DEV-FOUNDATIONS.md. |
| TR-079 | P0 | In Progress | Convert verified exploration and activities into attribute XP | TR-078, TR-121 | Atomic server event receipts derive four supported XP sources, persist config revisions and reject replay/stale state. Qualified shared boss cooperation awards Fellowship separately; provider activities and elevation remain. |
| TR-080 | P0 | Superseded | Implement progressive XP-to-level curves | — | Use the explicitly approved quadratic curve in TR-087. |
| TR-081 | P1 | In Progress | Add activity-specific XP calculations | TR-079, TR-121 | Shared explicit Foot/Bicycle earning arithmetic and histories use versioned factors. Imported activity types and unsupported XP sources remain. |
| TR-082 | P1 | In Progress | Earn Agility through terrain, sport and geographic diversity | TR-078, TR-086 | Independent first regional-block Agility is live in shared dev with full credit for both modes; terrain and sport diversity sources remain. |
| TR-083 | P0 | In Progress | Prevent repetitive XP farming and duplicate rewards | TR-078, TR-160 | Shared event ID/payload hash, state revision, per-player visits and pending-event replay prevent duplicate tested web rewards. Cross-provider activity identity/dedup remains TR-160. |
| TR-084 | P1 | Done | Display lifetime achievements and attribute progression | TR-051, TR-078 | Shared Character shows accepted lifetime distance, observed minutes, genuine finds, reached tiles and attribute progress, with unsupported sources explicit. |
| TR-085 | P1 | Done | Add attribute progression simulator to admin console | TR-033, TR-079 | Admin replays representative chronological activity histories with current/draft rules, fractional effort and identity dedup; zero world writes. Reducer parity tests pass. |
| TR-086 | P1 | Done | Track geographic adventure diversity | TR-026, TR-078 | Shared large regional-block spread is tracked separately from per-tile coverage and retained through map reset; Foot/Bicycle and no-repeat tests pass. |
| TR-087 | P0 | Done | Implement quadratic attribute XP progression | TR-078 | `progression.ts`: cumulative XP = coefficient × (level−1)^2, initial 25; levels/remaining XP and independent dev/prod curve configs. Exact threshold, invalid input and large integer tests pass. Earning rules remain TR-079/091. |
| TR-088 | P1 | Done | Apply diminishing returns to attribute-based loot bonuses | TR-087, TR-071 | Attribute loot bonuses asymptotically approach a configured cap, with a combined cap and at least 10% Common outcome probability. |
| TR-089 | P1 | Done | Add XP curve configuration and visualization to the admin console | TR-033, TR-087 | Protected coefficient editing/history, exact level chart and draft recovery use immutable balance revisions; earned XP and production defaults preserved. Local browser/SQL verified. |
| TR-090 | P1 | Done | Simulate progression for casual, regular and highly active players | TR-087, TR-089 | Laboratory compares 12 casual, 20 regular and 32 highly-active synthetic outings across Foot/Bicycle over four weeks, with visible assumptions and no data writes. |
| TR-091 | P1 | In Progress | Balance XP earning rates independently for all six attributes | TR-079, TR-090 | Four exploration rates plus qualified cooperative Fellowship can be tuned independently in dev; unsupported elevation/Power evidence and final six-attribute fairness remain. |

## TR-E06 — Adventure & Training Recommendations

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-092 | P1 | Done | Adventure recommendation interface | TR-051 | Shared dev Ideas tab selects goal, movement, distance and destination preferences and shows non-route guidance with conditional ordinary XP. Unsupported earning evidence is explicit. See DEV-ADVENTURE-IDEAS.md. |
| TR-093 | P1 | In Progress | Personalized recommendations for accumulating specific attributes | TR-092, TR-095 | Non-route guidance uses personal XP/fractional credit, fresh location, paid tile/region history and preferences with zero rewards. Verified route/access and unsupported earning sources remain. |
| TR-094 | P1 | Backlog | Route generation using real trail and geographic data | TR-026, TR-101 | Routes follow real usable geographic paths and have valid GPX coordinates. |
| TR-095 | P1 | In Progress | Estimated attribute XP for recommendations | TR-079, TR-087 | Ideas UI projects conditional ordinary XP/current levels with saved fractional credit and explicit one-tile/region/find assumptions. Accepted Foot/Bicycle arithmetic parity tested; real route/elevation integration remains. |
| TR-096 | P1 | Backlog | Include artifact and boss opportunities in recommendations | TR-094, TR-003, TR-043 | Relevant detected artefacts/bosses can be included without forcing extra collection range. |
| TR-097 | P2 | Done | Evaluate Strava segments as potential training suggestions | TR-164 | Feasibility decision: no persistent segment recommendation cache under assumed permissions; endpoint, deletion and data-use gates documented. No connected segment feature. See CONNECTIVITY-FEASIBILITY.md. |
| TR-098 | P1 | Backlog | GPX export for Garmin and other navigation devices | TR-094 | A generated GPX route can be exported and validated in a supported navigation workflow. |
| TR-099 | P2 | Backlog | Compare predicted versus actual adventure rewards | TR-095 | Verified actual rewards can be compared with estimates without double rewards. |
| TR-100 | P2 | Backlog | Add group adventure and boss-route planning | TR-094, TR-130 | A party route includes encounter timing and each member’s required tile visit. |
| TR-101 | P1 | In Progress | Match suggestions to sport, distance, difficulty and accessibility | TR-026 | Non-route preferences select movement/distance and explicit known terrain. Unknown or conflicting terrain is excluded; required step-free access returns no unverified destinations. Actual route difficulty/permissions/access verification remains. |
| TR-102 | P1 | Deferred | Implement location-based training quests | — | Deferred formal-quest design; ordinary recommendation XP is handled in TR-092–110, without a completion bonus. |
| TR-103 | P1 | Deferred | Support repeatable objectives such as hill ascents | — | Deferred formal-quest design; ordinary recommendation XP is handled in TR-092–110, without a completion bonus. |
| TR-104 | P1 | Deferred | Verify quest completion using GPS and elevation data | — | Deferred formal-quest design; ordinary recommendation XP is handled in TR-092–110, without a completion bonus. |
| TR-105 | P1 | Deferred | Award attribute XP and completion bonuses | — | Deferred formal-quest design; ordinary recommendation XP is handled in TR-092–110, without a completion bonus. |
| TR-106 | P2 | Deferred | Generate quests from terrain, routes and geographic features | — | Deferred formal-quest design; ordinary recommendation XP is handled in TR-092–110, without a completion bonus. |
| TR-107 | P1 | Deferred | Allow admins to create and configure custom training quests | — | Deferred formal-quest design; ordinary recommendation XP is handled in TR-092–110, without a completion bonus. |
| TR-108 | P2 | Deferred | Show live quest progress during Garmin activities | — | Deferred formal-quest design; ordinary recommendation XP is handled in TR-092–110, without a completion bonus. |
| TR-109 | P1 | In Progress | Generate non-route training suggestions, including hill repeats | TR-092, TR-095 | Ordinary distance/new-tile/new-region/collection guidance implemented without plan bonuses. Power/hill-repeat earning awaits supported elevation evidence. |
| TR-110 | P1 | In Progress | Recommend adventures that introduce new sports, terrain or regions | TR-082, TR-093 | New-region ideas exclude already rewarded personal regional blocks. Sport/terrain diversity requires further evidence and earning rules. |
| TR-164 | P2 | Done | Investigate optional Strava activity/account connectivity | TR-113, TR-160 | Current OAuth/capacity/webhooks and June 2026 retention/data-use constraints checked; permanent/shared rewards need provider clarification. Optional path stays disconnected. See CONNECTIVITY-FEASIBILITY.md. |

## TR-E07 — Environments, Deployment & Release Management

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-111 | P0 | In Progress | Establish separate Development and Production environments | — | Development and production are explicitly identified and independently deployable. |
| TR-112 | P0 | In Progress | Create separate databases, storage and game-world state | TR-111 | Mutable world/player data and storage are isolated, with an isolation test. |
| TR-113 | P0 | In Progress | Configure environment-specific APIs, secrets and authentication | TR-111 | Hosted dev API guards runtime environment, platform identity and own-origin writes. Hosted identity verified; production/native services remain separate. |
| TR-114 | P1 | In Progress | Implement automated build, test and deployment pipelines | TR-111 | Versioned builds run required validation before a deployable artifact is produced. |
| TR-115 | P0 | In Progress | Support independent game-balance configurations for Dev and Prod | TR-111, TR-033 | Progression curves have independent environment/version configuration, tested against mutation leakage. Other balance settings and authenticated admin configuration remain pending. |
| TR-116 | P1 | In Progress | Create a controlled Dev → Prod release process | TR-114, TR-115 | A specific validated revision is promoted with an auditable rollback path. |
| TR-117 | P1 | Backlog | Add production monitoring, error logging and alerts | TR-113 | Production failures are observable without leaking precise location histories. |
| TR-118 | P0 | In Progress | Implement database backups, migrations and rollback procedures | TR-112 | Append-only migrations, per-player snapshots and admin-only complete small-dev exports are tested. Fresh offline database recovery preserves wallets/claims/activity/reward ledgers and rejects damage/overwrites/partial exports. Hosted disaster recovery, retention and maintenance/reconciliation gates remain; see DEV-RECOVERY.md. |
| TR-119 | P0 | In Progress | Separate test players, artifacts, bosses and inventories from production | TR-111, TR-112 | Dev Site/D1, test spawns and inventories stay isolated from production. Shared boss definitions, encounters and loot also remain in dev only. |
| TR-120 | P1 | In Progress | Document release procedures and environment configuration | TR-116, TR-118 | A new maintainer can follow promotion, rollback and recovery instructions. |

## TR-E08 — Movement & Effort Balancing

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-121 | P0 | In Progress | Implement Foot and Bicycle movement categories | — | Shared dev offers explicit Foot/Bicycle, locks movement within an active adventure and validates with mode-specific limits. Original local mode remains walking-only. Physical/import type validation pending. |
| TR-122 | P0 | In Progress | Map Garmin and imported activity types to movement categories | TR-121, TR-155 | Source-specific Connect IQ/Strava classifier and offline inspector map supported metadata, preserve indoor/virtual/assisted/manual flags and reject guessed types. Dev field records initial raw sport/subSport. Tests pass; real authenticated imports/device execution remain. See DEV-ACTIVITY-CATEGORIES.md. |
| TR-123 | P0 | In Progress | Implement configurable movement-based XP multipliers | TR-121, TR-079 | Shared Endurance effort uses versioned Foot 1.0/Bicycle 0.4 defaults; protected admin configuration affects future events only. Broader six-attribute/provider effort remains pending. |
| TR-124 | P1 | Done | Implement movement-based boss damage multipliers | TR-121, TR-044 | Completed shared Foot/Bicycle activity receipts use the placed boss policy for physical damage; provider import validation remains a separate gate. |
| TR-125 | P0 | In Progress | Give both movement categories full geographic discovery credit | TR-121, TR-013 | Tests show equal first-tile/regional discovery XP for Foot/Bicycle, independent of effort scaling. Shared server world and physical validation pending. |
| TR-126 | P1 | In Progress | Add activity validation and basic anti-cheat checks | TR-121, TR-153 | Shared dev rejects invalid/coarse/stale/future/implausible GPS and duplicate events, with no long-gap rewards. This is consistency checking, not hardware anti-spoofing; provider validation remains. |
| TR-127 | P1 | In Progress | Add movement balancing controls to admin console | TR-033, TR-123, TR-124 | Protected factor controls and two-mode progression histories are implemented. Boss damage balancing follows actual encounter rules. |
| TR-128 | P2 | Deferred | Support mixed-mode adventures in a future release | TR-121, TR-126 | A later design can split a recorded adventure into verified movement segments. |

## TR-E09 — Animal Companions & Karma

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-139 | P3 | Deferred | Create animal companion profiles | — | A player can create an optional named animal companion profile. |
| TR-140 | P3 | Deferred | Mark recorded activities as companion adventures | TR-139 | An eligible activity can be marked as a self-declared companion outing. |
| TR-141 | P3 | Deferred | Award Karma for companion activities | TR-140 | Companion time outdoors earns capped Karma, not speed-based animal rewards. |
| TR-142 | P3 | Deferred | Add companion avatars and cosmetic progression | TR-139 | Cosmetics/titles do not make companions a competitive requirement. |
| TR-143 | P3 | Deferred | Configure Karma rewards and daily limits | TR-141, TR-033 | Karma rates/caps are configurable independently of combat XP. |

## Field-test follow-ups

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-167 | P0 | In Progress | Stabilize GPS map/text and preserve route through short accuracy dips | TR-153 | Local fixes and simulated regressions implemented; no coarse rewards or long-gap route bridges. Physical iPhone retest pending. See GPS-MAP-STABILITY.md. |
| TR-168 | P1 | In Progress | Make explored and claimed tiles clearly distinguishable | TR-030 | Teal dashed exploration, dark-cased gold personal claims, violet other claims, ownership labels, legend and wider route implemented. Browser/mobile visual review and field retest tracked in GPS-MAP-STABILITY.md. |

## Developer knowledge tooling

| ID | Priority | Status | Story / outcome | Dependencies | Acceptance and implementation notes |
| --- | --- | --- | --- | --- | --- |
| TR-166 | P1 | Done | Apply Graphify to development and change-impact analysis | — | Reviewed/pinned upstream, project-local Codex skill, code-only graph, scoped queries, evidence labels and graph integrity checks verified locally. CI workflow publishes downloadable reports on future runs. Docs remain canonical; no semantic indexing, Monkey C parser, cloud graph or gameplay change. See GRAPHIFY.md. |

## Scope and evidence

Current code already has local registration/login, saved inventories, curated/generated discoveries, retro map, walking/first-visit gold and local tile claims. These are useful prototype capabilities, not completion of shared-world/admin/XP stories. No boss, global visitation, cloud identity, production environment split, live Garmin connectivity, Strava link or Auto-Collect is implemented by creating this backlog.

The P0 implementation report and device retest checklist must be linked here before claiming the full release gates are complete. The original [GAME-ROADMAP.md](GAME-ROADMAP.md) is retained as an idea/provenance memo; this document and DECISIONS.md govern current implementation order. Chat workstream names are defined in PROJECT-ORGANIZATION.md; no chats are claimed to have been created or moved.
