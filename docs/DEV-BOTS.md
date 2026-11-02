# Five simulated test players — TR-172

The dev admin panel at `/admin-world` contains **Five test players · dev bot lab**.
Five persistent isolated profiles cover Haukkala, Sippulanniemi, Rantalantie,
Helsinki and a Haukkala–Sippulanniemi crossing. Each uses Foot mode with varied
weather. They are not sign-in accounts, human activity or live shared-world members.

Run all five executes one journey per bot sequentially. Run an individual bot
for a repeat. Stop prevents subsequent journeys; an already submitted request can
finish. Closing/unmounting stops future requests. There is no unattended service,
timer, perpetual workload or simulated browser/Garmin identity. Reports persist
in the isolated `bot-lab-v1` configuration document, included in existing protected
snapshots. Download bot report exports only labelled synthetic data.

## What is measured

Public fixed catalog pairs use the ordinary bounded, closure-aware mapped-route
planner. Samples interpolate along retained consecutive route geometry, at most
12 m apart. The ordinary authoritative reducer receives synthetic fixes with 5 m
accuracy, 1.4 m/s and a virtual clock. It calculates accepted distance, new-tile
and 250 m gold, exploration/Endurance/Agility/Perception XP and collection results.
Each bot preserves its own visits, inventory and fractional gold across rounds.
Seeded rolls make an unchanged scenario reproducible. Inaccurate physical GPS,
provider delays and screen-lock suspension are not modelled or proven.

Local appearances use current spawn/region rules and at most 100 catalog candidates
near the sampled route. Captures require their own tile and the ordinary target/
energy/chance checks. These do not read or change the live appearance/claim ledger;
they are balancing samples, not a complete national appearance population.

Each successful journey benchmarks Lesser, Standard, Greater and Mythical bosses
with current boss rules, zero weakness bonus and no unique-tile objective. Arena
arrival/party consent are explicit assumptions; no live encounter is activated.
Damage, qualification, victory and conditional loot chances use existing functions.
No boss reward is added to even the bot's exploration-gold total. Once all five
have accepted route samples, a hypothetical five-person comparison uses their
latest journey distances. These separate routes do not establish a real shared
boss visit or physical eligibility.

## Bounds and separation

600 fixes per journey; 20 rounds/reports per bot; at most 1,000 retained visited
tiles/finds before starting another journey; 200,000-character lab storage cap.
Sample limits and unavailable routes are explicit outcomes, never completed
distance or victories. Paused maintenance, recovery and tester-access fences
apply atomically. Revisions prevent concurrent runs overwriting one another;
action IDs remain replayable for all 20 rounds. Failed storage grants no receipt.

Only dev administrators on the app's own origin can run bots. Production rejects
the endpoint and hides the panel. No real player, visit, claim, activity, encounter,
reward or Garmin table is written. No schema migration or production release.

Seven focused tests cover route geometry/bounds, deterministic actual-rule
results, revisits, boss tier/party floors, durable replay, snapshot isolation,
unavailable routes, storage failure, authorization and maintenance. Hosted results
and full checks are recorded in the release evidence after publication.
