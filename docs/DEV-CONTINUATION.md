# Continuous development backlog run

User authorization on 2026-10-31: continue until backlog work is exhausted, **dev only**, with physical validation to be performed later. Later clarifications authorize a separate shared dev backend and configurable experimental XP/loot balance values. Production remains at `a5dc0cd4ea88f6acb5fcd324d5239e84e73109e3`; do not push main or change its Site/database/audience.

## Execution order

1. TR-111/112/113/119: preserve local profiles and create isolated shared dev services, platform identity, authorization and migration tests. Use the existing private dev Site ID; no production resources or passwords are copied.
2. TR-121/123/125/126 and TR-051/078/079/083: explicit Foot/Bicycle categories, validated movement events, idempotent effort/XP ledger, experimental versioned dev rules.
3. TR-003–018/028–030: deterministic accessible spawns, shared visitation, independent discovery/collection, regeneration and bounded world queries.
4. TR-031–042/115/118: usable protected admin controls, config, audit, tests, schema migration/backup/recovery.
5. Remaining progression/loot, cooperative bosses, recommendations/routing, watch integrations and release tooling in dependency order. Provider/device tests and external approvals remain explicit gates, not invented successes. Deferred/superseded designs are not revived silently.

## Current state

Shared dev server deployed: official Sites Vinext starter in `dev-server/`, preserving platform sign-in. Hosted Tumppi profile/admin access verified; all initial GitHub checks passed. Existing Expo export and the Worker share the dev origin. Browser-local mode and saves remain available. Shared mode is opt-in and never uploads old passwords or merges histories. Access remains owner-private. The next increment implements recorded spawns, first personal drops, density detection and protected spawn tools; see DEV-SPAWNS.md. Continue with admin player tools/recovery, then progression/boss/recommendation dependencies.

Physical tests pending: GPS/route/collection recovery, national field access, iPhone compass and Enduro 3 activity/connectivity. Experimental rates must be labeled and recorded in a config revision, with no retroactive rewards or production changes.

Player tools/journal increment: protected search/inventory/XP edits, per-edit snapshots, safe exploration-map reset and guarded restore, shared Character/Collection. See DEV-PLAYER-TOOLS.md. Next: versioned XP curve/simulations, remaining spawn region/modifier/map tools, then boss dependencies.

Progression laboratory increment: protected versioned coefficient/history/draft recovery, shared earning arithmetic, zero-write estimates and chronological casual/regular/highly-active Foot/Bicycle histories. See DEV-PROGRESSION-LAB.md. Continue remaining world-region/modifier/admin map stories, then encounter effort/loot foundations.

World-region increment: protected event/blocked regions, configurable appearance factors, bounded admin world/density map, indexed visits and community refresh. See DEV-WORLD-REGIONS.md. Next dependency-ready P0: boss definitions and explicit encounter lifecycle with server-recorded activity evidence; keep provider/device proof separate. Spawn analytics/collection simulation, claims pagination and recovery/export remain actionable later work.

Boss foundations increment: sourced persisted definitions with immutable physical policy, four briefs, protected tier controls and isolated combat simulation. See DEV-BOSS-FOUNDATIONS.md. Continue server activity summaries/tile evidence, explicit activation, accepted/locked parties, one-activity contributions, deadline settlement, loot separation and shared player encounter UI. Do not treat synthetic simulations as physical activity verification.

Shared encounter increment: explicit accepted parties, locked activation, receipt-derived Foot/Bicycle activities, one contribution per player, immutable deadlines, shared HP, individual minimums and atomic individual loot. Attribute-specific capped loot, signature items and meaningful cooperation Fellowship are connected to the phone UI and protected zero-write loot simulator. See DEV-ENCOUNTERS.md. Browser/provider/physical gates remain explicit. Next: encounter administration and operational recovery/export, remaining spawn analytics/collection simulation, bounded ownership pagination, evidence-based progression/objectives and integration feasibility.

Encounter operations follow-up: protected paged state/boss queries, privacy-limited inspection and audited reasoned draft/active cancellation with replay/CAS tests; local QA cleanup verified. No forced victory or wallet editing is provided. Next priority: operational backup/recovery (TR-118), remaining artifact simulations/analytics, watch activity foundations and evidence-based progression.

Garmin activity-field foundation: separate dev application source observes normal Activity.Info, stable pause/resume identity, tile IDs and bounded local intents/metadata without granting rewards or changing released watch binaries. Generic source/test compilation passes; actual Enduro 3 target build fails because its official device profile is missing. Monkey C tests have NOT executed. Private Sites browser identity is not a watch bridge; authenticated transport/linking and provider/device proof remain gates. See DEV-GARMIN-FIELD.md. Continue independent operational recovery and artifact simulations while those gates wait.

Published operations follow-up: GitHub 613bbf9919e4b00444b11612aaa3a662521d1e7d, managed c55900281f17b3d8bcb99a29bf200b8cbbec6d35, saved dev appgver_52b450c875f88191b6c7ab72f56993d2; hosted admin loads successfully. All GitHub checks passed: 41229830613 / 41229830563 / 41229830526. Watch-only source work does not require another website deployment.

Recovery increment TR-118: admin-only consistent 17-table game-data snapshot, strict small-dev size/row/schema limits, integrity checksum and a fresh-file-only offline SQLite restore command. Real migrations and synthetic wallet/ownership/activity/boss-loot ledgers round-trip; local browser download and actual CLI recovery of 52 QA rows verified. No hosted rewind, production change or authentication/password migration. Provider retention, maintenance/reconciliation and hosted disaster drill remain explicit gates. See DEV-RECOVERY.md. Next independent work: artifact collection simulation/analytics, bounded ownership queries and additional evidence/recommendation foundations.

Artefact laboratory/analytics increment: TR-038 actual-rule isolated seeded collection simulation, including detection versus own-tile accuracy/closure and energy effects; TR-012 bounded recorded regional appearance/claim/earning-revision statistics with daily rates and unknown-receipt disclosure. No live profiles or lazy spawns are created by these tools. See DEV-COLLECTION-LAB.md. Next: bounded ownership/current-tile lookup and remaining operational/evidence/recommendation work. Physical/provider/hosted recovery gates remain pending.

Ownership-query increment TR-030: bounded visible-area claim pages/count points, independent exact prices, abortable debounced queries and compatible derived indexes. 110 regressions pass, full builds/typecheck/lint/graph pass; old downloaded schema-5 snapshot also recovers offline after schema-7 support. See DEV-CLAIM-QUERIES.md. Continue evidence-based progression, recommendations and remaining operations; do not mark national load, physical device, provider or hosted recovery gates passed.

Published ownership increment: GitHub 926edbc1ef4d1ab2acb347d42ecc5d4b19716ccc; managed ceffa12b7c89b4e982203993618606a8acca846f; saved dev appgver_4a4e3ce8d7d88191b2c6530c8888d64e. Hosted Tumppi map/exact unvisited price verified without GPS/purchase. Production main remains a5dc0cd4ea88f6acb5fcd324d5239e84e73109e3.

Adventure-ideas increment TR-092/093/095/101/109/110: shared drawer planning with conditional ordinary XP, personal novelty, current rules, sourced non-route destinations and strict unknown-access limits. No reward writes, default location or route line. 114 automated cases and local UI pass; see DEV-ADVENTURE-IDEAS.md. Next dependency-ready work includes imported activity classification/evidence contracts and remaining progression/operations. Real routing/access/elevation, device bridge/auth, hosted recovery and physical testing retain separate gates.

Published Ideas: GitHub acc2085683eab1e642af9c28dad6c8179a0817fa; managed 9b6dcb3bbae2f728d934f70ff9f0079bcceea092; saved dev appgver_6597f26f5f9881919a3292af165a4490. Hosted Tumppi planning verified with no GPS/start/rewards. Owner-private audience and production unchanged.

Activity-category foundation TR-122: offline source-specific Connect IQ/Strava mapping with manual/trainer/virtual/assisted distinctions, no unknown-speed inference, no reward eligibility and raw dev-field start metadata. 117 software regressions and generic watch source/test compilation pass; tests on the watch have NOT executed. See DEV-ACTIVITY-CATEGORIES.md. This source/CLI-only increment requires no website deployment. Continue independent evidence/progression/operations while native/provider/physical gates wait.

Provider feasibility TR-163/164/097: current official Garmin Personal/Business and Strava OAuth/capacity/webhook/data-use documents checked. Personal Garmin is owner-only, not the multi-user program; June 2026 Strava rules prevent assuming permanent/shared rewards or a persistent segment index are allowed. See CONNECTIVITY-FEASIBILITY.md. No terms, credentials, account data, access changes or provider messages were submitted. Completed investigation does not complete TR-160 or a watch bridge. Continue dependency-ready dev work.

Dev diagnostic foundation TR-117: unexpected API failures return a generated reference and bounded allowlisted application log, excluding private payloads/identity/routes/exceptions. 119 regressions, mobile/server quality, Worker build and graph pass. No real hosted failure, player write, monitoring subscription or production alert was induced. See DEV-OBSERVABILITY.md. Remaining independent work includes evidence-backed terrain/sport diversity, route/access feasibility and further recovery operations; physical/provider/production gates remain explicit.

Maintenance/write-coordination TR-118: explicit protected pause/resume, idempotent audit/config CAS, same-transaction game-write fences and stale epochs, frozen lazy GET mutations, allowed private snapshots and preserved pending web journals. Seven focused SQL/client cases plus the full 126-case suite, types/lint/Worker build/graph pass. Local QA pause/snapshot preparation/reopen passed; hosted service was not paused. See DEV-MAINTENANCE.md for old-worker drain, unchanged deadlines and remaining provider/reconciliation gates. Next independent work: evidence-backed terrain/sport diversity, then real-path/access feasibility and rarity clues; keep production and physical/provider gates unchanged.

Published maintenance: GitHub 1525971f3336e88b4ea3c0cd14a0bdd6ebb3a7be; managed 5e3067c4d8c3ee723bb6ff982e6c48bf6cc15967; saved dev appgver_6e1000a8f18481918b3d93c594697d76. Hosted console verified OPEN at revision 0 without a hosted pause or player change.

Diversity TR-082/052/091/110: permanent first terrain/Foot/Bicycle experiences, locked outing policy, independent experimental configuration, conservative classified segments, explicit stop qualification, recovery anti-farming and conditional Ideas estimates. 131 regressions, mobile/server checks, full builds/graph and local rule-save/Character review pass; see DEV-DIVERSITY.md. No historical or fake GPS rewards. Next: real-path/access feasibility and route/GPX work, rarity clues and remaining access/recovery gates. Recheck Enduro profile availability before treating the device gate as unchanged.

Published diversity: GitHub db619f706e5a9ceb9b33bdf9ee4b2d65fb728c3b; managed e3b983de49582ad63987fc17ddf698e69d0ac6f2; saved dev appgver_96adcef9612081919bd0ee279444b527. Hosted admin saved the authorized 3/5 XP experiment as diversity-dev-1, with 250/1000 m thresholds; no automatic region classifications were added. Hosted Character confirms Tumppi still has no qualified experience/XP, no GPS was started, and the service remains open/private. Enduro target was reattempted on 2026-11-01 and still fails Invalid device id enduro3; official profile directory is absent. Existing 774,297,008-byte Finland PBF and geometry/node-ID city/Haukivuori extracts are available for offline route investigation; validate source/header/checksum before generating route artifacts. Production remains a5dc0cd.

Route input inspection: the retained PBF's MD5 matches its downloaded checksum exactly (5b113c7a2c31d8465eead4a958eab97b); pyosmium reads generator osmium/1.16.0 and replication timestamp 2026-10-30T21:24:51Z / sequence 4956. Existing city extract has 35 city groups, 112,444 ways and 671,596 vertices with OSM node IDs/tags; Haukivuori has a separate broader road/path extract. This proves a reusable offline input, not route connectivity, public-access truth or a generated GPX. Native osmium extensions target Python 3.12: use the bundled codex-primary-runtime/dependencies/python/python.exe with .tools/osm-python on sys.path. Graphify's Python 3.13 cannot load those cp312 extensions; no reinstall is needed. Next route work should inspect exact graph/access/coverage contracts, add local Jyväskylä/road connectivity from the full PBF where needed, and avoid straight-line gap connections.

Routing foundation TR-094/101: GitHub 5266738d78ce813ed07c6192db303eacb4dccd61
adds an offline national extractor, conservative mode/direction/node/relation
policy, geometry-preserving chunks/auditor and bounded pure A*. Ten reader/graph
tests plus all 137 app regressions pass; mobile/server types/lint and graph refresh
pass. The full Finland build retained 1,565,822 ways / 19,157,565 geometry-point
occurrences into 2,958,005 edges / 12,825 chunks / 272,221,317 compressed bytes
(largest decoded chunk 9,213,340 bytes). See DEV-ROUTING.md for exact manifest
identity and public preview observations, including Rantalantie. Full audit
passes every chunk/source edge and reconstructs all 1,565,822 accepted ways;
actual output is in docs/evidence/finland-route-audit-2026-11-01.json.
No route UI/API/GPX or website deployment is claimed. Next:
resolve bounded/reproducible hosting of these ignored derived assets, connect
owner-authenticated zero-write route plans with live blocked-region intersections,
add preview/offsets and valid planned GPX, then retain actual import/field gates.
Do not upload the full country graph into a phone/Worker request or fabricate
connectors on disconnection. Production/shared player data remain unchanged.

Routing follow-up also adds the fixed-public-catalog smoke tool, actual national
footprint observations and conservative active-region segment checks (including
interior crossings/boundary contact and exact time windows). Code release
5266738 passed all four GitHub jobs: route 41253997056, graph 41253997053,
web 41253997104 and backend 41253997218. Follow-up source and audit evidence have
their own commit; this is not a hosted route release or physical test.

Route planner increment TR-094/098/101: complete immutable country data is staged
through existing Site ASSETS as binary files; owner-authenticated zero-write
plans accept fresh GPS or explicit catalog origins, re-read closures, serialize
graph allocations and report bounded failures. Shared Ideas provides searchable
Foot/Bicycle previews, offset labels, separate gold-dashed map geometry and
planned GPX download. Public Rantalantie succeeds locally without moving Shared
QA, starting a quest or granting gold/XP; viewport testing is not physical GPS.
146 app regressions and server checks/build/graph pass; the real 28-point GPX
passed official XSD validation (evidence retained). See DEV-ROUTE-PLANNER.md for
input/size/search limits, the corrected .bin transport, reproduction and remaining
hosted/large-area/device gates. Publication is the next step; preserve prod,
audience, all ledgers and phone tests. Follow with larger-area compact/lazy
routing, relevant detected relic/boss opportunities and other independent stories.

2026-11-01 release handoff: the user requested a relevant production package.
Only the opt-in compass was promoted as public version 9; see
PRODUCTION-COMPASS-RELEASE.md. The production branch was merged back into develop;
all 146 regressions, lint/types and the refreshed structural graph passed.

The dev route planner is still **not published**. Nine bounded source pushes uploaded
the raw national map source, leaving remote hosting main at
9197fa8379b81b8532758c7628491e67c6c75042. The fully restored, tested managed tree
is committed locally as 37437d6103c155784af40eed07a41e18fa25618b (tree
c5a685951c2be32bc7c36f1ee0e5ec25b2f6fc4a), retained alongside the earlier full
backup. All 13,688 prepared artifact files were byte-verified after correcting
checkout CRLF formatting; the managed checkout is clean. The final push nevertheless
resent 278,659,036 bytes and exceeded the host's 64 MiB per-push limit. No archive
or saved version was produced for that failed attempt, and no intermediate data
commit was deployed. Do not retry that same oversized push. The next release step
is to upload the compiled routing .bin paths in bounded commits too, then restore
and verify the exact full tree before packaging/private publication. Preserve all
existing backups, branch history, dev audience and database settings. Physical
navigation and compass validation remain pending.

Regular-game hotfix update (2026-11-01): private dev version 22 is now live from
hosting source e5ab15b5b5b782642c79691b17a32fb88d7e33b9, a focused live-version-21
base plus TR-169–171 fixes. Production stays version 9. See TRAIL-GOLD-FIXES.md.
The route upload attempt above remains unpublished, but remote hosting main is
now **e5ab15b**, not 9197fa8. Do not restore/deploy the older c5a6859 full tree over
the route/gold fixes. Preserve that backup and integrate the hotfix into a newly
built, tested, byte-verified routing release based on the new remote head before
continuing bounded compiled-map uploads. Existing schema, audience, runtime
settings and player data must stay intact.

Route publication update — dev version 24 is now live. See DEV-ROUTE-PLANNER.md
for exact source, archive and hosted checks. Nine original map uploads resolved
the Git limit but the v1 archive exceeded both input and expanded limits; the
source-build fallback version 23 also failed and was never deployed. Compact
runtime format 2 retains every node/coordinate and mode/direction flag, reducing
map bytes by 35%. Bounded compact uploads, fresh Worker output and tested
supported frontend retention produced an acceptable archive. Current hosting
main/live source is **1e80e671c19e585b7321370f1948ee5f918030cd**. Old snapshots
and oversized candidates remain historical; do not restore them over this
release. Hosted Rantalantie and Helsinki Foot/Bicycle plans and the GPX control
were smoke-tested with no player progress changes. Physical navigation/device
checks remain pending. The next implementation action is TR-118 recovery revision
reconciliation/write draining; larger-area lazy routing remains a later action.

TR-118 pending-recovery increment: owner-scoped zero-write receipt inspection
works during maintenance; phone checkpoints block observed revision rewinds;
explicit cancellation reserves the original event/action identity with an atomic
no-award receipt and audit. Late originals cannot commit gameplay after it wins.
All 166 regressions and mobile/server types/lint pass. No schema, earning rule,
production profile or real-player reward changed. See DEV-RECOVERY.md for exact
limits. This is not complete hosted restoration: server recovery generations,
whole-ledger reconciliation and provider drain/retention evidence remain next.

Published as private **dev version 25**: hosting main/live source is now
`b7aa38f5db19e3cff90b035768c386b77209b524`, saved version
`appgprj_6ae5c02d5c008191b51fda4f4f39c7a5~appgver_ef32ae1618248191bdd1fab9ef548ba1`.
See DEV-RECOVERY.md for archive/native deployment/CI provenance. Hosted profile
and health checks passed without changing Tumppi's progress or starting GPS.
The full dev-24 route dataset and regular-game GPS/trail/gold fixes are retained;
production remains version 9. Do not restore the older 1e80e67/failed candidates
over this release. Continue TR-118's server recovery-generation/barrier work;
do not confuse these client checkpoints with complete hosted restore safety.

Latest release: private dev version 27 completes the requested four software
increments: externally pinned recovery generations/whole-ledger sealing,
incremental bounded route loading, detected-only rarity clues, and existing
shared tester controls. See DEV-BACKLOG-INCREMENT.md and docs/evidence/dev27-release.json.
Application source is 72d20967c5de20c36ea2d72733ea411ae9f73bae; current hosting
main/live source is d00db4d7fb8ad44f98b7ee89ee21413c82490b9e. Saved version is
appgprj_6ae5c02d5c008191b51fda4f4f39c7a5~appgver_8b4c95495a108191b6cee15e802a9cf7.
All 180 regressions, types/lint, builds, graph and four GitHub workflows pass.
Hosted Haukkala route/admin reads and final source/profile checks passed without
changing real player progress, roles/access, external generation or maintenance.
Production stays version 9. The country runtime remains checksum 74e4c9af...;
all exact hashes/limits are in the release report. Do not restore old candidates
over this code, especially after using generation/access controls. Next follow-ups
are hosted long/dense route performance, named authorized invitations and actual
provider restore/drain/retention and physical validation. Those operational gates
are not completed by the software proof; no hosted rewind was performed.
