# Development world regions and inspection map

TR-006/007/029/030/042. Existing dev Site only; no production or audience changes.

The protected admin map uses the same MapLibre 6.16.0 and approved OSM retro style as the game. It loads at most 100 artefacts per page and 500 density cells inside a Finland viewport up to 1° high × 2° wide. Circle colour/size shows rarity; polygons show unique visitor density. Admin queries retain world records collected by that account; player availability excludes its claims. No new map provider was introduced.

Admins draft named regions from visible bounds, choose local start/end, classify terrain/test weather, set a rarity factor or block placement/collection. Saving validates up to 30 regions, checks the expected revision and persists immutable configuration/audit. Terrain/weather are manual test inputs, not live observations.

Winter/night/rain/woodland factors initially equal 1. Winter/night use UTC at spawn-window birth (December–February; 20:00–06:00); rain/woodland use configured region inputs. Combined rarity multiplier is capped at 10, with individual weight bounds. Context IDs include configuration and event phase, preventing time-boundary inputs from assigning different weights to the same identity. Recorded spawns and prior inventory stay immutable; new context identities can coexist with older records until expiry.

Active blocked regions prevent generation/manual placement and hide existing/personal records from collection. A capture transaction checks the region revision again before awarding; a racing edit rolls back inventory, receipt and claim together. Existing inventory remains intact.

Migration 0003 adds indexed grid coordinates and backfills compatible visit IDs without dropping history. Admin density and player community queries use these bounds. Community overlays refresh on tile changes; pending start/stop recovery resumes/stops the correct GPS transport and claim recovery refreshes prices. Own-tile spawns take priority under the bounded nearby cap. Hosting retains previous lazy assets from static and Worker layouts for open tabs.

Evidence: actual migrations, index query plans, unique counts, modifier caps/phase IDs, permissions, blocked generation/placement/collection and a concurrent capture/config race are tested. Local D1/browser map showed 7 artefacts and zero visited cells (no fake GPS); “Local QA event” saved with audit. A later load showed immutable old/new context records. Local QA data is ignored and never uploaded. Full suite has 79 regressions; physical access/GPS/compass and national load checks remain pending.

The prior XP lab at GitHub d4c55d0 deployed successfully: managed source afc1720dc6a4d5b3532059e3eeda6ba1c807a07a, saved version appgver_ee50e634424481918c109cbf3e6dc18e. GitHub runs 41220726806/41220726800/41220726811 succeeded. Production remains a5dc0cd4ea88f6acb5fcd324d5239e84e73109e3.
