# Regression and phone test register

Every release records the source SHA, browser/device, date, expected/actual behavior and evidence. Automated GPS is simulated; it does not prove physical phone recording. Attach no passwords, raw private tracks or precise home coordinates to public GitHub results.

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
| XP-01 | TR-051/087 | Six independent saved XP totals, exact quadratic boundaries and environment config isolation; no unapproved XP awards | Foundation/account suites; XP earning NOT IMPLEMENTED |
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
