# Regression and phone test register

Every release records the source SHA, browser/device, date, expected/actual behavior and evidence. Automated GPS is simulated; it does not prove physical phone recording. Attach no passwords, raw private tracks or precise home coordinates to public GitHub results.

Released four-story **dev version 27**: **180** regressions pass, adding five complete
recovery-generation/reconciliation tests, three incremental-route cases, two
detected-rarity clue cases and four tester-access/transaction race cases. Ten
offline public-catalog route checks are retained with explicit unavailable cases.
See [DEV-BACKLOG-INCREMENT.md](DEV-BACKLOG-INCREMENT.md). No live restore, player
suspension, invitation or fabricated GPS run is used as evidence.

All four workflows pass for source `72d20967c5de20c36ea2d72733ea411ae9f73bae`.
Actual hosted reads cover the 5.58km Haukkala preview/map, tester/recovery admin,
protocol markers and final release/source/profile after reload. Exact provenance,
archive checks and remaining gates are recorded in DEV-BACKLOG-INCREMENT.md and
docs/evidence/dev27-release.json. Production remains version 9.

TR-118 pending recovery candidate (2026-11-01): all **166** regression cases,
mobile typecheck/lint and server typecheck/lint pass. Ten new isolated SQL/client
cases cover zero-write owner-scoped paused receipt inspection, retained unknown
envelopes, stale world CAS, observed revision rewind, explicit atomic cancellation,
both original/cancellation transaction orders, a pause racing cancellation,
late original replay and a lost cancellation response. The previous encounter
validation test now resolves its journal through explicit durable cancellation.
See DEV-RECOVERY.md for scope and the server-generation/provider drain gates.
No hosted restore, real GPS run or physical device pass is claimed.

Published as private dev version **25**. All four GitHub workflows succeeded for
source `bd2fdd473902270d64f34b2273d106b2ef13d917`. Actual hosted Quest/profile and
health protocol reads passed, retaining Tumppi's stopped quest and zero progress.
No live pending journal was manufactured, cancelled or reset. Exact saved-version,
archive and remaining recovery gates are recorded in
[DEV-RECOVERY.md](DEV-RECOVERY.md#released-dev-version-25).

| Test | Story / notion | Expected result | Evidence / status |
| --- | --- | --- | --- |
| GPS-01 | TR-153 active tile freezes | Walk across two tile boundaries; white current-tile outline and collection eligibility follow fresh GPS | `exploration.test.ts`; phone PENDING |
| GPS-02 | TR-146 screen lock | Start quest, lock 2 minutes, reopen: same adventure, collection, gold and attempts; fresh GPS reconnects | Simulated recovery PASS subject to current run; iPhone PENDING |
| GPS-03 | TR-146 long suspension | Reopen after 1 hour: new route segment, no straight-line distance/reward through missing interval | `exploration.test.ts`; phone PENDING |
| GPS-04 | TR-153 stale watch | Stop delivering fixes: recovery retries with one watcher; old callbacks ignored | `exploration.test.ts` |
| GPS-05 | Permission / accuracy | Denied: actionable message, Me retries. Coarse/stale/jumping/fast fixes never enable collection/rewards | Location/session regression suites; phone PENDING |
| COL-01 | TR-154 own-tile collection | Artefact >70m away in own tile can be attempted; adjacent-tile artefact cannot | `exploration.test.ts` |
| COL-02 | Discovery mode | Without Start quest: current tile follows fresh GPS, own-tile collection works, no walking gold | `exploration.test.ts`; phone PENDING |
| COL-03 | Collection persistence | Captured item stays collected after save/reload; duplicate capture blocked | Landmarks/accounts/exploration suites |
| ADV-01 | Explicit stop | Only Stop quest ends recording; Relics/Profile navigation preserves active adventure | Automated state test; navigation/phone PENDING |
| GOLD-01 | All exploration mileage | 1 gold/250m including revisits, fractional distance survives quests; first personal tile +1 once | Claims/resources/exploration suites |
| CLAIM-01 | Ownership price | Visited tile costs previous price+1; atomic spending; no stale autosave refund | `claims.test.ts` |
| AUTH-01 | Login / signup | Login required; create account works; no shortcut buttons; profiles isolated | `accounts.test.ts`; UI smoke PENDING |
| MAP-01 | Zoom/navigation | Pinch/drag/zoom responsive, Me recentres; only Me button; map always visible | Map geometry/style suites; physical touch PENDING |
| MAP-02 | Overlay visibility | Own/other local visits, active tile and selected purchase tile distinguishable at useful zoom; overview bounded | Map tests; rendered/phone check PENDING |
| POI-01 | Haukkala/Sippulanniemi | Seven artefact types in each area, stable unique IDs and path-side coordinates | `landmarks.test.ts`; field access PENDING |
| ENV-01 | Dev/prod isolation | Dev storage cannot read/write production profile, session, claims or inventory; production keys retained | `environments.test.ts`; independent hosting origins required |
| REL-01 | Promotion | Failed tests stop build/promotion; successful main artifacts carry SHA/checksum; promotion reuses exact binary | Workflow review; first GitHub run PENDING |
| FUT-01 | Appearance / effort rewards | Spawn/detection/collection separate; higher effort/diversity improves configured reward opportunities | Backlog TR-002–025/070–091; NOT IMPLEMENTED |
| FUT-02 | Garmin / Strava | Offline retry, dedup phone/watch/imports, one inventory, normal activity integration | TR-155–164; NOT IMPLEMENTED |
| FUT-03 | Guilds / raids / bosses / NPC | Physical boss visits, asynchronous 24h window, one activity/player; no fake combat/effort bypass | TR-E04 and original idea memo; NOT IMPLEMENTED |
| COMPASS-01 | TR-165 actual heading | Rotate phone through north/east/south/west and portrait/landscape: arrow responds relative to facing, with no wraparound flip. Denied/unavailable/stale data falls back explicitly. | `compass.test.ts` simulated PASS; dev browser fallback/layout QA; physical iPhone Chrome and magnetic variation checks PENDING. See DEV-COMPASS.md. |
| SPAWN-01 | TR-002 contract | Stable spawn identity separate from tile; valid position, expiry and owner policy; legacy landmarks unchanged | `foundations.test.ts`; server generation NOT IMPLEMENTED |
| LIFE-01 | TR-078 evidence | Retain accepted GPS distance/time/tile/find history across quests/reloads; no duplicate timestamp/find, gap mileage/time or demo evidence | Foundation and account suites; phone PENDING |
| XP-01 | TR-051/087 | Six independent saved XP totals, exact quadratic boundaries and environment config isolation; no unapproved XP awards | Foundation/account suites; four experimental dev sources tested, Power/Fellowship pending |
| SAVE-01 | Legacy migration | Preserve old gold, visits, inventory and claim receipts; do not infer lifetime mileage from current quest; legacy evidence distinguished | `foundations.test.ts`; dev UI/phone retest PENDING |
| FIN-01 | National catalog | All seven types in 35 towns + rural finds; every coordinate is a sourced outdoor way node inside Finland; original 23 unchanged | `finland.test.ts`; physical access checks PENDING |
| FIN-02 | Country gameplay | GPS/visits/collection/gold/claims work nationally, including Åland/north/coastal cells; neighbouring countries rejected | Country tests; phone field checks PENDING |
| FIN-03 | Distance and scale | Ground metres/bearings/accuracy rings remain correct at northern latitudes; existing saved IDs and balances retained | Geodesy + GPS resource regressions |
| FIN-04 | National navigation | Search Helsinki/Oulu/Utsjoki/Mariehamn, page results, zoom out to country overview and return with Me; no huge tile grid | Browser check + bounded overlay tests; physical touch PENDING |
| HAU-01 | Rantalantie density | 28 sourced outdoor locations within 900m of exact Rantalantie, Haukivuori; four of each type, no duplicate cells or existing ID overwrite | `production-release.test.ts`; physical access PENDING |
| PROD-01 | Production promotion | Production bundle enables released national/journal features, uses original profile/session keys, keeps old progress, shows no DEV TEST badge and returns 28 Rantalantie results | Release/account suites + production browser smoke check; phone PENDING |

## iPhone Chrome field pass

SHARED-01: actual SQL migrations, platform-subject ownership, own-origin mutation enforcement, non-admin rejection, event replay/payload conflicts, stale revisions, lost-response recovery and account namespace isolation. Automated shared-world suite; hosted identity and phone pass remain distinct.

SHARED-02: Foot/Bicycle have full geographic credit, configured effort XP, no coarse/long-gap rewards, atomic shared tile prices/spending and immutable audited balance revisions. Simulated/SQLite tests plus local D1 browser profile/admin/config/start-stop pass; physical shared GPS PENDING.

GPS-MAP-01 (TR-167): alternate precise/coarse fixes during a walk; coarse fixes cannot move the validated marker or enable collection, short dips preserve the next valid route segment, and >30s gaps never bridge or pay distance. Automated coverage in exploration/vector-map suites; physical iPhone PENDING.

GPS-MAP-02 (TR-168): explored tiles show teal dashed boundaries, own claims gold solid cased borders, other claims violet, with readable legend/labels and a clearly visible route on streets/forest/water. Browser demo review plus physical phone PENDING. See GPS-MAP-STABILITY.md.

Use an outdoor public path in Jyväskylä with precise location enabled. Record browser/iOS versions and accuracy. Start quest, walk >500m across at least two tiles, attempt a relic, lock/reopen, open Relics and return, then explicitly stop/reload. Check adventure identity, live tile, inventory and gold. Repeat with permission denied then enabled. GPS during screen lock may be absent: expected browser limitation, not a failed promise of continuous recording. An ended adventure, stale current tile after fresh fixes, duplicate rewards or impossible collection is a release-blocking failure.

## GitHub evidence

`npm --prefix mobile run quality` writes actual exit codes, logs, JUnit XML and summary to ignored `test-results/`. CI uploads these under Actions for both environments and puts the summary on the run page. Use the issue template for field observations; include the tested commit. Keep automated PASS, manual PENDING, known browser limitation and planned feature separate.

Shared spawn evidence: DEV-SPAWNS.md. SQL covers two-player first visits, capture/replay, retirement, pages and zero-write simulation; physical return visits pending.

Shared admin/player evidence: DEV-PLAYER-TOOLS.md. Test authorization, invalid items/attributes, stale revision, snapshot restore, isolation, reset no-reroll and unsafe wallet recovery rejection. Local grant/restore and Character/Collection tabs checked; physical acceptance pending.

XP laboratory: DEV-PROGRESSION-LAB.md. Verify coefficient history authorization, old-config default, unchanged XP totals, active curve projection, estimate/reducer parity and history identity/coverage/fractional dedup. Browser draft chart/history and zero-write estimate passed locally; no physical pass inferred.

Regions/world map: DEV-WORLD-REGIONS.md. Test UTC context/weights/caps, active region boundaries, blocked placement/collection, concurrent config/capture rollback, index backfill and unique density. Local map loads and audited region save passed; no fake GPS/physical pass.

Boss foundations: DEV-BOSS-FOUNDATIONS.md. Test solo/party targets, monotonic scaling, caps/minimums, tile/window/duplicate rejection, immutable source placement, role/config CAS/audit and no-player-write simulation. Local synthetic combat/definition placement passed; real encounter and phone/watch acceptance pending.

## Shared dev encounter validation (TR-044–048, 060/065/068–077, 088, 124, 129–135, 144/145)

Automated: real migrations and transactional SQLite tests cover consent/activation, fresh own-tile GPS, one immutable accepted activity per member, activity/window/closure clipping, movement damage, individual minimums, shared HP, failed/expired slots, private XP, lost-response journals and conflict rollback. Qualified individual loot/gold/Fellowship is awarded once, with caps, immutable rule snapshots and admin-only simulation/configuration. See mobile/tests/encounters.test.ts and DEV-ENCOUNTERS.md.

Local browser: phone drawer retains map; solo draft shows no timer; Guide selects boss direction; loot simulation reports zero writes. These are local QA, not physical validation.

Pending phone field test: sign into shared dev; admin places a suitable sourced test boss; create/accept party; reach boss tile, activate, start/stop a recorded outing and preview its evidence. Submit qualifying activities before the winning contribution; verify each qualified player claims exactly one reward across reload/retry, while an unqualified member gets none. Recheck stale GPS, screen suspension/recovery and accurate tile entry. Do not expect unrecorded locked-screen mileage. Enduro/watch and external-provider activity tests remain pending.

TR-049 operations: automated real-SQL tests verify keyset pages, private-XP redaction, admin-only access, own-origin writes, audited idempotent cancellation, terminal-state rejection and complete rollback on revision races. Local UI inspected/cancelled only the Shared QA draft with reason and confirmation; original audit and player state were preserved. Hosted real-player cancellation is not part of QA.

Garmin normal-activity field TR-025/155/156/158/161: SDK 9.3.0 generic source/test compilation only. Target Enduro 3 build fails on missing official device profile. Monkey C runtime/simulator tests and physical layout/activity/GPS/lap/save-discard tests remain PENDING. Watch queue entries are untrusted local evidence and award nothing; no phone/watch synchronization test has passed. See DEV-GARMIN-FIELD.md.

TR-118 snapshots/offline recovery: tests/snapshots.test.ts applies real migrations, exports played synthetic wallets/claims/activities/boss rewards, recovers into a new SQLite file and checks all table counts/FKs/integrity. Invalid environment, checksum, schema/table coverage, oversize data and existing output paths fail without partial export/overwrite. Protected API role/origin tests pass. Local browser downloaded only isolated QA data, and the CLI recovered 52 rows offline. Hosted restore/retention/revision reconciliation and physical device tests remain PENDING. Never upload private snapshot contents with GitHub test reports.

TR-038/012 collection laboratory: tests/collection-lab.test.ts checks actual search probability parity, deterministic/non-mutating simulations, personal-drop limits, accuracy/wrong-tile/density/closure separation, no duplicate attempts, correct appearance versus claim denominators, configuration/reward revisions, unknown/future receipts, bounded aggregates and admin/origin access. Full before/after snapshots prove zero database writes. Local UI simulation and regional QA analytics passed. Simulator assumptions are not accepted GPS/activity evidence; no field-test status changes.

TR-030 ownership: tests/claim-queries.test.ts covers exact prices outside latest-1,000 results, complete cursor pages, unindexed legacy fallback, 1,600-claim grouped totals/negative coordinates, finite Finland/wrapped bounds, auth/input guards and request cancellation. Snapshot tests/actual offline CLI cover schema-5 recovery after schema-7 additions. Local UI loads map and disables the exact 1-gold unvisited purchase. Pending phone test: move/pan/zoom across visited and claimed tiles, confirm own/other distinction and exact concurrent price recovery without GPS flicker or duplicate charges. Group points must resolve to individual tiles on zoom, not coarse ownership polygons. National load and fallback/native visual tests remain pending.

TR-092/093/095/101/109/110 Ideas: recommendations.test.ts verifies conditional XP and current levels, fractional Foot/Bicycle parity, personal rewarded novelty, no default stale location, blocked/unknown terrain/access exclusions, owner/origin validation and zero database writes. Local UI selected Ideas and generated a configured 3 km Foot estimate with no GPS/start/rewards and the map visible. Pending field test: obtain accurate location with Me, compare suggested new tiles/regions to personal history, independently verify actual path/access, record a normal adventure and compare only fulfilled assumptions. This does not validate route distance, step-free access, elevation or hill-repeat XP.

TR-122 activity metadata: activity-category.test.ts checks exact provider namespaces and supported Foot/Bicycle mapping, no speed/name fallback, absent/incompatible subtypes, explicit trainer/manual flags and indoor/virtual/assisted distinctions. All classifications remain ineligible for rewards. CLI inspection performs zero writes. Watch source/test compilation covers raw start metadata; Enduro simulator execution, real provider imports, saved/discarded evidence, bridge authentication and cross-source identity remain PENDING.

TR-117 dev diagnostics: observability.test.ts injects synthetic secret/location-like data into query/header/body/exception fixtures and verifies the bounded application log excludes it. Actual API exception/reference correlation, expected-error status/noise, unknown operation redaction and failed-logger recovery pass. No hosted failure was injected. Production alerts, provider access-log/retention review and real support incident validation remain pending.

TR-118 maintenance: maintenance.test.ts covers guarded configuration/audit transitions and replay, API role/origin/input checks, blocked lazy GET/signup/admin writes, allowed private snapshots/status/identity, stale request epochs, transactional rollback and pause races, mutation-returning statements, no raw/session bypass, zero-write analytics and retained client pending-event replay after reopening. Local browser paused QA, prepared a complete private snapshot without download, then reopened at revision 2. Hosted pause/restore, old-worker drain, restored revision reconciliation and real-device interruption tests remain pending. Do not pause production or rewind player data for QA.

TR-082/052/091/110 diversity: diversity.test.ts covers one-time terrain and completed movement qualifications, exact locked rates, zero-rate/legacy compatibility, duplicate stops/outings, partial-outing limits, conservative unknown/conflicting/blocked/disjoint segment treatment, no GPS-gap credit, recovery anti-farming, transaction races/replay, role/origin/config validation and conditional zero-write planning. Local UI saved the experiment without player XP and Character showed empty genuine evidence. Pending phone test: start a new outing under enabled dev rules, record ≥250 classified metres within a reviewed region, stop after ≥1 km, verify one terrain/movement reward and no repeat award after reload/retry. Confirm accurate boundary/gap behaviour and unchanged production. No physical terrain, sport, ascent or provider test is claimed.

TR-094/101 routing foundations: tools/test_route_network.py runs ten offline
access/topology/reader/integrity cases; mapped-route.test.ts runs seven bounded
route-search cases. Compare actual ordered mapped bends, independent crossing
IDs, mode/oneway restrictions, barriers/closures, missing coordinates, chunk
deduplication, nearest mapped offsets, explicit unavailable/limit states and
shortest-path alternatives. Full-country extraction and source-geometry audit
are separate from synthetic cases. The completed full audit reconstructs all
1,565,822 accepted original ways and verifies 12,825 chunks / 2,958,005 edges;
actual stdout and eight fixed-public-catalog preview observations are retained
under docs/evidence/. Pending integration/field checks: authenticated
bounded loading, closure changes, map overlays retaining the real recorded track,
GPX 1.1 parsing/import, on-foot access/turn correctness, unmapped starts and no
rewards from preview/export. No physical or navigation-device pass is claimed.

TR-094/098/101 integration increment: route-api.test.ts adds six catalog/loader/
API cases with the exact canonical manifest and two real public Rantalantie
chunks. It verifies binary hashes/byte bounds, same-origin membership, own-only
fresh GPS, explicit public previews, zero-write snapshots, closures edited during
load and bounded concurrent/error recovery. route-gpx.test.ts independently
parses namespaced XML and tests unavailable/invalid/bounded exports; the actual
28-point Rantalantie file also passed the official XSD via .NET. The complete
national graph is separately staged, never replaced with that fixture. All 146
app regressions, mobile/server types/lint and a full dev build pass locally.
Local browser returned the 0.81 km public preview with gold 0/quest stopped;
responsive inspection used 390×844. The first transport check caught Vite's
automatic .gz decoding; opaque binary paths and an asset-binding restart fixed
the observed failure. Recheck actual deployed .bin byte counts and dense-city
routes at publication. Physical GPS navigation, locked-screen limitations,
native/fallback field checks and navigation-device GPX import remain pending.

## TR-169–171 — regular quest route and walking gold

See TRAIL-GOLD-FIXES.md for dev version 22 provenance and the physical checklist.
`trail-gold-regression.test.ts` verifies old/new quest separation, already-active
continuation, 120 short reconnects with 360m of motion, gold against actual
validated mileage plus tile awards, retained long-route starts/turns/breaks,
sub-threshold display points and fractional gold carry. A subsequent 31s gap
earns no invented distance. All 150 develop tests pass; the focused live-base
release passes 135 tests per environment plus lint/types/build. Local 390×844
demo and Start/Stop/map rendering are software smoke evidence only. iPhone
outdoor acceptance remains pending; no continuous locked-screen GPS is claimed.

## Dev 24 route and release-budget evidence

The compact loader's real fixtures preserve every canonical point, ID and
direction/mode flag and return identical Foot/Bicycle routes. Malformed records,
unsafe integers, coordinate overflow and size bounds are rejected. Two Python
packer tests verify source immutability, existing-output/alias refusal and
incomplete-output rejection. The full-country pack separately verified all
12,825 chunks / 21,647,462 point occurrences without geometry simplification.

Three asset-retention cases check current/cached/historical lazy dependencies,
hash-derived references, missing scripts, unsafe paths and generated-output
confinement. All 156 app cases, lint/types, packer tests, build and graph pass.
The archive preflight rejects the real oversized candidate and accepts the
released package under both compressed and expanded limits.

Actual private dev 24 returned Rantalantie Foot 0.81km, Helsinki Foot 0.64km /
Bicycle 1.22km, explicit unverified step-free access and a functioning GPX
control with no UI error. Profile gold/distance/finds/levels and stopped quest
were unchanged. Phone-sized map/endpoint proof was captured at 390×844. These
are hosted/public-preview checks, not physical GPS or navigation-device tests.

## TR-144/133/134 — boss field usability

`boss-field.test.ts` adds four read-only model/map regressions; all 188 application
tests pass. Arrival must preserve state and use fresh accepted own-tile GPS,
not a radius or an old saved tile. Forecasts use the placed rules and server
activity summary, preserve individual effort floors and never write HP or rewards.

| Test item | Expected result | Status |
| --- | --- | --- |
| Open shared dev with the drawer hidden | Available placed bosses have distinct tier-sized map badges; map and Me remain usable. | Hosted browser check recorded in DEV-BOSS-FIELD.md. |
| Tap a boss | Encounters opens with selected boss first; compass guides to it; no draft or timer starts. | Hosted browser check recorded in DEV-BOSS-FIELD.md. |
| Walk across a boss tile edge | Fresh own-tile GPS shows arrival; adjacent, inaccurate, stale or future fixes do not. | Automated boundary tests pass; physical phone pending. |
| Create a party before arrival | Activation stays disabled until consent and fresh boss-tile GPS; server rechecks closures/revision. | Existing server/model tests pass; physical/co-op pending. |
| Review a completed activity | Correct movement damage, projected HP, personal minimum/shortfall and immediate settlement warning. Missing visit or repeat submission cannot qualify. | Automated forecasts pass; completed physical activity UI pending. |
| Win with an under-minimum party member | Party may win through another qualifying member; unqualified player receives no personal loot. Zero HP without any qualifying member is not victory. | Model/server tests pass; physical co-op pending. |

## TR-137/138 — distance + exploration bosses

192 automated cases pass. Manual dev checklist (pending): place a sourced boss
with a positive distinct-tile minimum; verify legacy bosses remain distance-only;
record one real activity with repeats, GPS interruption and boss-tile arrival;
check observed distinct tiles against the preview; submit within the window and
verify distance alone cannot qualify loot. Check qualified/under-minimum co-op
members separately and retry the same contribution/loot claim after reconnect.
Synthetic admin simulations are zero-write and do not prove physical acceptance.
