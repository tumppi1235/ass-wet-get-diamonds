# Shared dev adventure ideas — TR-092/093/095/101/109/110

The shared map's existing controls drawer has an **Ideas** tab. The map remains visible. Players choose an attribute goal, Foot/Bicycle, planned recorded distance, terrain preference and access constraint, then explicitly request ideas. Planning never starts a quest, requests GPS permission, changes the selected movement for an active adventure, reserves a destination or grants bonus XP.

## Estimates and personalization

The authenticated same-origin planning endpoint reads only the requesting player's saved state and current balance/region rules. It does not use the world loader that materializes spawns or creates player state. The response contains no route history or other player's state. No preferences/history table or external routing provider is introduced.

Ordinary Endurance estimates include the current movement factor and the player's saved fractional credit, using the same reward arithmetic as accepted movement. Exploration, Agility and Perception additionally show the conditional XP from one new rewarded tile, one new regional block, or one successful collection respectively. Each assumption is visible; distance alone does not guarantee novelty or a find. Current XP and the configured curve produce before/after levels. A later balance revision, missing recorded distance or unmet assumptions changes actual rewards. There is no completion reward or acceptance/settlement action for a plan.

Power explicitly awaits supported elevation evidence. Fellowship points the player to the existing qualified shared-boss process; party membership alone is not an estimate of earned XP. Neither goal fabricates an unsupported XP award or promises a hill-repeat reward.

With a fresh accurate accepted location, Exploration and Agility can list up to three nearby sourced catalog destinations not already rewarded in the relevant personal history. Cleared exploration-map history cannot bypass the permanent paid-tile record. These are public catalog destinations, not hidden-spawn disclosures or promises of an artefact. No default city-centre position is substituted when location is absent/stale.

## Routing and access limits

Catalog distances are explicitly **straight-line minimum return distances**, not walking distances or route budgets. The selected distance excludes candidates whose minimum already exceeds it, but cannot prove a usable path fits. No line, route graph, turn-by-turn guidance or GPX is generated. No claim of cycling permission/current public access is made.

Active blocked regions exclude destinations. Terrain filtering uses explicit active admin classifications; unknown/conflicting terrain is excluded under a specific filter. Urban terrain is not assumed to mean paved or step-free. Required step-free access returns no destinations because the catalog cannot verify it. The non-route guidance asks the player to choose independently checked paths. Verified accessibility, difficulty, real route generation, hill/elevation estimation and sports/terrain-diversity earning remain separate work.

## Evidence

Four focused regression cases verify estimates/current levels/configuration and fractional Foot/Bicycle earning parity; no state mutation or activity creation; personal paid-tile/region exclusion; fresh location, known terrain, closures and access constraints; and owner/origin/input isolation. Complete before/after database snapshots demonstrate that requesting ideas creates no player, appearance, reward, audit or reservation rows. These software cases are not a physical path/access or phone GPS test.

The complete 114-case suite, mobile/server typecheck and lint, full Expo/Worker build and code-only graph pass. Local browser QA selected Ideas and generated a 3 km Foot plan with the configured +12 ordinary Endurance XP estimate, no assumed location, zero rewards granted and the map still visible.
