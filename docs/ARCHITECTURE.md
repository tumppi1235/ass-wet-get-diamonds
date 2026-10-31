# Architecture: actual implementation and target

## Current system

`mobile/` is the Expo 58 / React Native app and Expo Router web export. The public playtest is static hosting. `src/accounts/` implements installation-local PBKDF2 profiles, session checks and per-profile saved games. `src/game/` wraps the shared prototype engine in `public/engine.js`; gold, claims, landmarks and persistence live here. `src/location/` validates GPS fixes, while `src/map/` converts the same geographic coordinates/tile IDs into map overlays. Web uses MapLibre with OSM Shortbread vectors and approved Mapzen terrain; native/fallback uses the existing lightweight renderer. `garmin/source/` contains a standalone Connect IQ prototype, not an authenticated link to the phone account.

There is no production game API or cloud inventory. Local ownership and visit sharing operate only between profiles in one installation. Development now uses Finland geographic eligibility and a finite 473-destination catalog; production retains Jyväskylä and its original 23 finds until promoted. See FINLAND-PLAYTEST.md for stable saved IDs versus geographic movement calculations and remaining national service/migration work.

## P0 browser exploration pipeline

Location adapter → recoverable location session → validated position → current tile → discovery eligibility → collection attempt → persisted inventory. Save adventure identity independently from whether a GPS listener is delivering fixes. Store active adventure metadata with game progress; backgrounding, navigation and network loss must not mean an explicit end. Reconnect on foreground and stale-watcher recovery without creating duplicate listeners or rewards. A long GPS gap begins a new route segment with no invented straight-line mileage.

The user's current device is Chrome on iPhone. Browser suspension cannot be treated as uninterrupted tracking. Browser persistence/recovery and continuous background recording are separate acceptance gates. Native iPhone tracking or independently recorded Garmin activities remain future integration work; the user chose browser testing for now and has no Apple Developer account.

## Incremental shared-world target

Phone Discovery Mode and Garmin Adventure Mode should feed validated exploration events to one authenticated game account/inventory. Separate spawn/world storage, geographic validation, discovery, claim/loot evaluation and activity reconciliation. Use stable event/activity IDs, idempotent writes, offline queues and explicit conflict/retry handling. Preserve raw achievement evidence separately from configurable XP/loot projections.

Prototype Garmin Enduro 3 data-field GPS/events first; verify supported communication, activity lifecycle and button/UI constraints against current Garmin documentation before choosing the bridge. Completed-activity reconciliation is a separate path requiring provider feasibility/approval. Strava is optional; Suunto, Apple Watch and Polar are later investigations, not assumed working connectors.

Only extract `packages/game-engine`, `geo-engine`, `shared-types` and UI packages when integration introduces real consumers. Add separate `apps/admin`, API/workers and dev/prod infrastructure with actual authenticated services, isolation tests and migrations. Do not create empty applications or move current working code as a cosmetic refactor.
