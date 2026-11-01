# Architecture: actual implementation and target

## Current system

`mobile/` is the Expo 58 / React Native app and Expo Router web export. The public playtest is static hosting. `src/accounts/` implements installation-local PBKDF2 profiles, session checks and per-profile saved games. `src/game/` wraps the shared prototype engine in `public/engine.js`; gold, claims, landmarks and persistence live here. `src/location/` validates GPS fixes, while `src/map/` converts the same geographic coordinates/tile IDs into map overlays. Web uses MapLibre with OSM Shortbread vectors and approved Mapzen terrain; native/fallback uses the existing lightweight renderer. `garmin/source/` contains a standalone Connect IQ prototype, not an authenticated link to the phone account.

There is no production game API or cloud inventory. Local ownership and visit sharing operate only between profiles in one installation. The user-authorized release enables Finland eligibility and a finite 501-destination catalog in both builds, including 28 Rantalantie/Haukivuori additions. Production and development retain separate origins and storage keys. See FINLAND-PLAYTEST.md and PRODUCTION-FINLAND-RELEASE.md for geographic compatibility and remaining national service/device work.

Offline dev routing foundations: `tools/route_network.py` and `Build-RouteNetwork.py`
extract conservative mode/direction-aware OSM node topology into checksummed
geographic chunks; `Inspect-RouteNetwork.py` audits complete geometry preservation.
`mobile/src/game/mapped-route.ts` is bounded pure A* with explicit unavailable
states and no activity/reward writes. Dev route-assets/route-store connect
checksummed binary static assets, owner-scoped GPS/public preview inputs and
current region masks to a zero-write API. Shared Ideas shows a separate planned
map overlay and GPX navigation export; see DEV-ROUTE-PLANNER.md for publication
and physical gates. No full-country graph is imported into a client/Worker bundle.

## P0 browser exploration pipeline

Development-only shared service increment (D-024): `dev-server/` hosts an isolated Sites Worker/D1 API and a separate Vinext admin client; Expo `/shared` is the opt-in game client. Platform identity replaces local passwords in shared mode. Versioned, idempotent server events calculate dev state/XP/claims. Original phone-local mode and production remain separate. See SHARED-DEV.md for implemented scope, experimental balance and pending hosted/device gates.

Location adapter → recoverable location session → validated position → current tile → discovery eligibility → collection attempt → persisted inventory. Save adventure identity independently from whether a GPS listener is delivering fixes. Store active adventure metadata with game progress; backgrounding, navigation and network loss must not mean an explicit end. Reconnect on foreground and stale-watcher recovery without creating duplicate listeners or rewards. A long GPS gap begins a new route segment with no invented straight-line mileage.

The user's current device is Chrome on iPhone. Browser suspension cannot be treated as uninterrupted tracking. Browser persistence/recovery and continuous background recording are separate acceptance gates. Native iPhone tracking or independently recorded Garmin activities remain future integration work; the user chose browser testing for now and has no Apple Developer account.

## Incremental shared-world target

Phone Discovery Mode and Garmin Adventure Mode should feed validated exploration events to one authenticated game account/inventory. Separate spawn/world storage, geographic validation, discovery, claim/loot evaluation and activity reconciliation. Use stable event/activity IDs, idempotent writes, offline queues and explicit conflict/retry handling. Preserve raw achievement evidence separately from configurable XP/loot projections.

Prototype Garmin Enduro 3 data-field GPS/events first; verify supported communication, activity lifecycle and button/UI constraints against current Garmin documentation before choosing the bridge. Completed-activity reconciliation is a separate path requiring provider feasibility/approval. Strava is optional; Suunto, Apple Watch and Polar are later investigations, not assumed working connectors.

Only extract `packages/game-engine`, `geo-engine`, `shared-types` and UI packages when integration introduces real consumers. Add separate `apps/admin`, API/workers and dev/prod infrastructure with actual authenticated services, isolation tests and migrations. Do not create empty applications or move current working code as a cosmetic refactor.
