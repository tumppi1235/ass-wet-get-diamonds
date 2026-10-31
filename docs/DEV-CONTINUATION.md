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
