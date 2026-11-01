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
| D-023 | Continue independent backlog work in dev only, starting with TR-165 live browser compass | No production promotion, reward-rule changes, background GPS promise or completed physical-sensor claim. Opt-in permission; magnetic readings explicitly approximate; stale/relative-only data cannot masquerade as north. |
| D-024 | User explicitly authorizes continuous dev-only backlog work, a shared dev backend and configurable experimental reward values | Supersedes the earlier phone-local-only/no-new-rates limit for dev. Production stays unchanged; preserve legacy local saves/passwords and separate shared identity. Use platform auth, atomic event receipts and auditable balance revisions; keep physical validation pending. |

Open decisions: final spawn/rarity formulas, national tile projection/migration, production shared identity/backend migration, supported Garmin bridge, Strava permissions, final boss minimums/balance, final XP earning rates, amulet thresholds, long-term location-data retention, native distribution route.

D-025 (dev experiment under D-024): the active shared curve is a versioned coefficient over unchanged earned XP. Balance recovery copies values into a new revision. Simulations reuse earning arithmetic and never write rewards; unsupported elevation/cooperation remain zero. Experimental values are not final fairness approval.

D-026 (dev experiment under D-024): admin-classified regions supply explicit test terrain/weather and active windows; no live-weather claim. Blocked areas invalidate placement/collection, with transactional region-revision checks. Recorded appearances/ownership stay immutable; new contexts receive new identities.

D-027 (dev experiment under D-024): four-person boss targets interpolate total required effort, preserving monotonic party scaling. Initial individual fractions 25/25/50/100 percent are experiments; Mythical retains an absolute 50 equivalent km individual floor. Boss placements snapshot policy; character stats never supply physical damage. These defaults do not finalize provider/party/loot rules.

D-028 (dev experiment under D-024): accepted drafts lock at explicit own-tile activation. One completed server-recorded browser activity per member contributes only post-activation segments; personal boss-tile visit and timely submission are required. Victory settles immediately for already-submitted qualified members; all contributions exhausted without victory fails. Deadlines resolve lazily on read/action. Loot rules lock at activation, private XP at contribution, individual gold/item/Fellowship settlement is idempotent. Group loot requires two qualified submissions; only browser consistency evidence is currently supported. See DEV-ENCOUNTERS.md for the reviewable policy and experimental values.

D-029: shared dev ownership map queries use bounded view pages and count points at wide zoom. Exact tile prices use an independent lookup and remain server-validated at purchase. Derived coordinate indexes may be backfilled in bounded batches without changing economy, ownership or revisions; legacy claims remain visible during indexing. Schema-5/6 snapshots retain matching offline recovery support. No tile-ID migration or production deployment is implied.

D-030: shared dev Ideas are conditional ordinary progress plans, not formal quests or routes. Current earning rules, saved fractional credit and personal novelty inform estimates; no plan start/acceptance/completion reward is introduced. Public catalog points are not hidden artefacts or verified accessible routes. Unknown step-free access yields no destinations; Power/hill rewards await supported elevation evidence. This implements independent non-route guidance while real routing/provider work remains separate.

D-031: dev maintenance is an explicit audited service pause with transactional write/epoch checks, including lazy GET mutations. Identity/status, maintenance and private snapshots stay available; pending journals remain recoverable. It changes neither adventure state nor encounter deadlines and does not perform hosted restore/revision reconciliation. Only maintenance-aware code is fenced, so old-worker drain/rollback compatibility remain operational requirements. Production and audience are unchanged.

D-032 (dev experiment under D-024): first terrain class earns experimental 3 Agility XP after 250 conservatively classified metres in one outing; first Foot/Bicycle category earns 5 after an explicitly completed 1 km accepted outing. Independent admin rates default to zero until an audited revision enables them. Outing policy locks at start; permanent experience, including zero-rate qualification, survives resets/restores and prevents repayment. No historical terrain/sport/elevation is inferred. Finer sports, automatic classifications, access and physical validation remain separate; see DEV-DIVERSITY.md.

D-033: dev route foundations use the retained checksum-verified Finland OSM PBF,
original node topology and full mapped geometry. The first conservative policy
excludes unresolved conditional access, unknown barriers and whole member ways
of turn-restriction relations rather than ignoring restrictions. Bounded search
returns unavailable on disconnection/access/resource limits; start/end offsets
are not route connectors. No route plan is activity evidence or a reward. Asset
hosting, live-region checks, UI, GPX/device access remain explicit implementation
and validation gates; see DEV-ROUTING.md.

D-034: dev navigation plans use only fresh owner GPS or an explicitly chosen
public catalog preview. Existing Site ASSETS serves the complete immutable
checksummed graph as opaque binary files; no extra provider/account is added.
Plans and GPX remain separate from recorded paths, source effort, reward ledgers
and encounter evidence. Closure context is re-read before search; bounded area,
memory and search limits yield explicit unavailable/busy states. Unknown access
and difficulty are not invented. Software/local tests do not replace hosted,
physical navigation, large-area performance or watch-import gates.

## D-035 — selective production promotion (2026-11-01)

The user explicitly requested a relevant production package during backlog work. Promote only the opt-in TR-165 browser compass onto the current production code. Shared accounts/backend, experimental progression and route planning remain dev-only. Preserve the public audience and local profile/session keys; physical iPhone heading and GPS validation remain pending. Version 9 and exact provenance are recorded in PRODUCTION-COMPASS-RELEASE.md.

D-036: shared dev pending recovery checks the exact owner's receipt before clearing
an uncertain action. Explicit cancellation reserves its original identity with a
no-award receipt, fencing late originals atomically. Observed world revision rewinds
preserve journals and block retries. This changes no earning, ownership, activity
or encounter-deadline rules. Client checkpoints are insufficient for arbitrary
hosted restore; server recovery generations, full-ledger reconciliation and
provider drain/restore evidence remain gates under TR-118.
