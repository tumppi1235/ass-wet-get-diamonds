# Development boss definitions and combat policy

TR-043/049/050/060–070/124. This increment defines and simulates bosses; live player parties, activity submission, encounter resolution and loot are the next implementation stage. Production is unchanged.

Four briefs are recorded in `game/bosses.ts`: Metsänvartija (woodland guardian, Warden Rune), Hallahukka (frost/ridge wolf, Frost Crown), Syvänne (shoreline spirit, Depth Shard), Kivenkulkija (hill-path stone sentinel, Wayfarer Compass). Signatures are design metadata until the actual loot ledger is connected. Placements must select an existing sourced outdoor catalog path; arbitrary building/water positions and blocked regions are rejected. Migration 0004 persists the boss identity, tier, position/tile, availability window and immutable physical-rule snapshot. Retirement preserves the record.

Protected admin controls edit audited/versioned physical rules, place/inspect/retire definitions and run zero-write combat simulations. New placements snapshot the selected policy; later edits cannot rewrite old bosses. An arrival/placement does not activate an encounter or award anything.

## Initial dev policy

Default encounter window 24 hours, maximum five players. Foot 2 HP/km, Bicycle 0.8 HP/km. Character attributes do not appear in the damage calculation. Movement factors are combat settings, separate from XP balance.

| Tier | Solo km | Two, each | Three, each | Four, each | Five, each |
| --- | ---: | ---: | ---: | ---: | ---: |
| Lesser | 20 | 11 | 8 | 6.125 | 5 |
| Standard | 35 | 22 | 17 | 13.875 | 12 |
| Greater | 50 | 35 | 28 | 24.25 | 22 |
| Mythical | 75 | 65 | 58 | 53 | 50 |

Four-person values are explicitly experimental interpolation of **total** effort between the approved three-/five-person points. Total required effort cannot decrease when adding members. Greater remains the 50 equivalent-foot-km solo baseline; Lesser/Standard solo targets cannot exceed it. Mythical solo stays at least 75km and each party target at least 50km.

Experimental individual-minimum fractions: Lesser/Standard 25%, Greater 50%, Mythical 100%, configurable within guardrails. Mythical additionally retains an absolute 50 equivalent km individual floor. Bonuses default to zero at placement, are capped by policy (initial 10%, maximum editable 25%) and never increase the unmodified endurance evidence used for individual qualification. Reaching zero HP without any individually qualifying participant is not a victory. Physical activity, own boss-tile presence and exactly one contribution per person are required; actual server activity/window/party verification is not yet supplied by the synthetic simulator.

## Evidence and remaining work

82 regression cases pass, including exact solo/party baselines, monotonic total effort, caps, individual minimums, duplicate contributor rejection, tile/window rejection, policy-copy isolation, protected sourced placement, immutable placed policy, config CAS/audit and zero player writes in simulation. Local D1/browser simulation of a synthetic 20km Lesser outing showed 40/40 HP and zero writes; a local Metsänvartija definition was placed at Haukkala without activating an encounter. Local data is ignored and never uploaded. Real encounter flow, locked roster, server-recorded activity evidence, idempotent contributions/rewards, co-op/loot UI and physical validation remain open.

The world-region release at GitHub 283e665 deployed successfully: managed source 01bc79d775543fee12a7f45671e03ad5d9f4f9aa, saved version appgver_b64d8efc98c48191ba373a2dd7f4ac59. Hosted world/density query returned 7 artefacts/0 visited cells and verified the index migration path. GitHub runs 41222840952/41222840957/41222840948 succeeded. Production remains a5dc0cd4ea88f6acb5fcd324d5239e84e73109e3.

Subsequent implementation: DEV-ENCOUNTERS.md connects these definitions to accepted parties, explicit activation, browser-receipt activity contributions, settlement and individual loot. The preceding 82-case report describes the original definitions increment; it is not the current encounter coverage count. Physical/provider gates still apply.
