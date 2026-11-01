# Dev backlog increment — 2026-11-01

Scope: TR-118 recovery, TR-094/101 routing, TR-022 clues and TR-041 tester administration.
Development only; production version 9, account roles, local saves and the private
hosting audience are preserved. No real player was suspended, invited, reset,
awarded progress or used for a synthetic GPS/restore test.

## Recovery checkpoint and reconciliation

`recovery-store.ts` compares every gameplay table with a complete authoritative
snapshot pinned by a checksum **outside D1**. Wallets/inventories, roles, visits,
claims, spawn/capture ledgers, encounters, contributions, activity/action receipts,
boss rewards, backups and game configuration must match exactly. Only operational
maintenance/recovery controls/audits and derived integrity-fence bookkeeping are
excluded. This does not merge missing rewards or approve data loss.

Normal operation uses the compatibility generation `dev-initial-1`. Before a
reviewed provider recovery, the operator must use the existing Sites runtime
settings to pin all three values outside the restored database:

- `TRAIL_RECOVERY_GENERATION`: a fresh unique generation, never a previously used value.
- `TRAIL_RECOVERY_BASELINE_SHA256`: digest of the complete private snapshot taken
  while paused **after provider-confirmed old-request drain**.
- `TRAIL_RECOVERY_DRAINED_GENERATION`: that same fresh generation, acknowledging
  independently obtained provider drain evidence. This is an operator attestation,
  not an automatic provider lock or a proof created by the app.

Configure the new generation before allowing any provider restore to run. A
restored old/absent checkpoint then fails closed even if progress counters match.
Identity/status, exact receipt inspection, protected snapshots and recovery review
remain available. Reopening maintenance is blocked until reconciliation is sealed.
Never remove/reset these external settings after a recovery to bypass quarantine.

Admin **Recovery checkpoint** accepts the private pinned baseline. It validates
environment/schema/checksum/size, compares complete current state, then checks all
protected table sets again in the **same transaction** that seals the checkpoint
and writes its audit. Concurrent ledger/role/control changes abort the transaction.
It requires a paused service, explicit review and the external drain acknowledgement;
it does not restore D1. Replays return the sealed outcome. Reusing a generation for
a different baseline is refused.

Every maintenance-aware game write now checks the generation alongside the pause
epoch in its transaction. World and encounter envelopes retain the generation in
which they were created. Old or generation-less envelopes cannot execute after a
reviewed generation change; recorded receipts can be checked, or an unknown action
can be explicitly cancelled without replaying it. Existing phone revision
checkpoints remain intact.

Five new real-SQL/client tests cover quarantine, all protected table differences,
external trust requirements, atomic reconciliation races, generation fencing with
unchanged counters, old pending envelopes and safe cancellation. Existing recovery
and maintenance regressions also pass. No hosted generation was rotated, service
paused, baseline uploaded or provider restore exercised during this increment.
Actual provider restore/retention/drain evidence remains an external TR-118 gate.
Unannounced provider rewinds without first advancing the external generation
cannot be detected reliably; the runbook and operator gate remain necessary.

## Incremental route search

The pure eager and asynchronous A* planners now share the same validation,
topology, distance, closure, direction and geometry code. The server loads endpoint
snap cells first, then every incident cell before expanding a mapped node.
Decoded cell arrays are consumed sequentially; no country graph/global cache or
phone-wide download is introduced. Chunk SHA-256, manifest identity and full
geometry checks remain mandatory.

Search retains the conservative endpoint envelope from the earlier release and
filters unrelated geometry before adding it to the graph. It fetches only touched
cells, rather than fetching the whole rectangle. Routes are valid mapped paths,
not a guarantee that no shorter path exists outside the bounded envelope.
Budgets are 80 touched cells, 32 MiB cumulative decoded source, 10 MiB per decoded
cell, 30,000 unique accepted edges, 100,000 geometry-point occurrences, 60,000
nodes, 100,000 A* expansions and 20,000 output points. An 8-second cooperative
search/loading deadline supplements those limits; it is not a provider timeout or
a guarantee that one synchronous decode/fetch can be interrupted instantly.
Oversized/dense/unsupported searches explicitly return unavailable.

Closures are re-read after asynchronous search; a newly blocked segment invalidates
the result. Fresh-GPS expiry is checked again too. Previews/GPX still award nothing.
Three new tests cover long incremental topology, mode/closure/disconnection and
real compact asset integrity/cache/cell limits. Existing route/GPX tests remain.

`tools/Check-LazyRoute.mts` reproduces ten public-catalog Foot/Bicycle checks from
the unchanged complete compact Finland dataset. See
[offline results](evidence/lazy-route-check-2026-11-01.json). Local observations:
Rantalantie 0.808 km; Helsinki Foot 0.638 km/Bicycle 1.220 km; Kirkkopuisto–Haukkala
Foot 5.585 km; Kirkkopuisto–Sippulanniemi Foot 4.088 km/Bicycle 4.625 km. The
Haukkala bicycle and selected Rovaniemi connections remain explicitly unavailable.
These are source/software checks, not public-access surveys, hosted peak-memory
benchmarks, continuous phone GPS or navigation-device import evidence.

## Rarity clues

Shared Quest shows a pixel-art clue card for an artefact already present in the
player's detected, unsearched and uncollected set. Common/Rare/Legendary clues
use 36/48/64 px icons and subdued/cyan/gold signals. `CLUE_RULES` documents the
configurable cosmetic near bands (100/250/500 m). Inaccurate/stale GPS shows a
last-seen signal rather than readiness. The existing authoritative own-tile/GPS
collection button decides whether an attempt is possible.

Two new tests prove that unknown/collected/searched items produce no clue, no
catalog is seeded, rarity grows the presentation, and stale GPS changes no state
or reward. These cosmetic thresholds do not extend detection range, disclose
hidden spawns, enable Auto-Collect or change collection probability.

## Existing tester administration

Admin **Test-player access** lists/searches at most 100 existing shared profiles.
Confirmed, revision-checked, idempotent and audited changes can pause or enable
ordinary players. They cannot alter roles, pause an administrator or the acting
administrator, invite a new platform user, send a message or expand Site access.
The bounded 500-entry access configuration defaults to the previous enabled state
for existing profiles; introducing a public signup/strict invitation allowlist is
not implied.

Paused testers retain identity, progress and pending journals, but gameplay and
lazy world mutations are blocked. The same-transaction game fence checks tester
access, preventing a request already in flight from committing after suspension
wins. Re-enabling permits the same saved envelope to retry normally. Four new SQL/
client tests cover role/origin/confirmation/revision guards, protected admin access,
no self-promotion, preserved journals, idempotency and suspension/role-change races.

Actual hosting invitations still require named recipients and explicit authorization.
No invitations or live access edits were performed. TR-041 remains In Progress for
that real invitation/access acceptance, separately from the implemented controls.

## Verification and remaining gates

All **180** application regressions and mobile typecheck/lint pass. Server typecheck,
lint, Worker build and refreshed structural graph accompany the release. Keep
physical iPhone exploration/heading, navigation-device GPX import and provider
restore/drain checks pending. The release section will record exact GitHub/Sites
source, saved-version and hosted read-only checks in the release record below.

## Released dev version 27

The completed software increment is live at
[Shared dev](https://trail-relics-dev.tuomasl.chatgpt.site/shared).
[Exact release and CI evidence](evidence/dev27-release.json) records application
source `72d20967c5de20c36ea2d72733ea411ae9f73bae`, hosting source
`d00db4d7fb8ad44f98b7ee89ee21413c82490b9e`, saved version, deployment, archive
hash/size, and all four successful GitHub workflows. Runtime revision **2**,
private audience and existing database bindings were preserved. All **180**
regressions pass, with mobile/server quality, builds and structural graph checks.

Dev 26 first delivered the four features. Actual hosted reads verified the
**5.58 km** Kirkkopuisto → Haukkala Foot preview, separate gold-dashed mapped line
and endpoints (displayed offsets 1m/0m, excluded from route distance). Test-player
access showed Tumppi as admin/enabled; maintenance stayed OPEN/revision 0 and
recovery stayed `dev-initial-1 · ready`. No access action or recovery operation
was performed.

Dev 27 adds the final UI correction: hide the artefact clue while the compass
guides to a boss. Mobile types/lint, focused clue tests and all four GitHub
workflows passed again. Its native deployment returned **succeeded**. Archive
preflight passed at **195,398,963 input / 254,627,328 expanded bytes**, below both
268,435,456-byte limits. The normalized saved tar has **13,066 files / 254,638,080
bytes**. Current assets and 19 supported earlier shared frontend generations are
retained, along with the unchanged compact Finland dataset.

The final hosted `/release.json` matches the application source and development
save namespace. Reloaded Quest shows Tumppi at **0 gold, 0.00 km, 0 finds, tile
0,0, levels 1/1/1**, Foot, quest stopped. Health reports configured route assets
and maintenance/pending/recovery-generation protocol **1**. No GPS, quest start,
capture/claim/grant, suspension, invitation, baseline upload, generation rotation,
maintenance pause or hosted restore was used for this verification. Rarity and
recovery/suspension races are software evidence, not physical/device validation.

Production remains **version 9**. Hosted long/dense performance, actual provider
restore/drain/retention, named invitations and physical navigation remain pending.
