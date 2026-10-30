# Trail Relics — React Native app

The active app is React Native + Expo SDK 58, currently tested in the browser. Android/iOS packaging is paused. Native UI components, Expo Router and react-native-svg replace the old WebView host; the tested deterministic engine remains shared with the prototype.

## Run

```text
cd mobile
npm ci
npm run web -- --host localhost
```

Open http://localhost:8081/. Keep this origin and port to reopen the same local profiles. The repository's START-WINDOWS.bat starts this version. The earlier browser simulator remains available through `node run_local.cjs` on port 8000.

## Starter profiles

| Username | Initial password | Role |
| --- | --- | --- |
| admin | Admin123! | Administrator |
| test | Test123! | Explorer |

Profiles are created on first launch of each browser/device installation. Starter passwords are development defaults and can be changed on the Profile screen. Existing users, password changes and saved games are never overwritten by seeding.

The admin screen lists local profiles with collection counts and distance, and can create more test players. All new profiles have explorer access. Normal users cannot load admin user-management data, even if they enter the admin route manually. Profile display names and passwords can be changed by their signed-in owners.

## Data and sign-in

Accounts and progress stay on this installation in AsyncStorage (browser local storage on web). Each profile has its own game state, discoveries, visits, path, distance, energy, weather and collection. The browser prototype's old saves are kept separately and are not automatically assigned to a new user. Clearing browser/app storage removes local profiles and progress.

Passwords are salted individually and stored as PBKDF2-HMAC-SHA256 verifiers (600,000 iterations), never plaintext. Sessions expire after eight hours; changing a password invalidates the active session. Every profile read/write checks the current session, user ownership and token. Saves capture immutable snapshots, preventing a queued save from one user being written into another user's profile after switching accounts.

These are local device profiles, not a hosted authentication system. Roles protect normal app flows; they are not a security boundary against someone who controls the device or edits its local storage. There is no online password recovery or cross-device sync.

## Game and Garmin direction

The app is the main game: a city-wide outdoor map, artefact collection, exploration history and player profiles. The initial overview fits the actual Jyväskylä municipality boundary, from Korpilahti to Tikkakoski. Zoom in for 250 m game tiles. New artefacts are revealed in the player's current and eight adjacent tiles; panning does not reveal remote finds.

Outdoor mode uses OpenTopoMap terrain, contours and trails, with OpenStreetMap street tiles as a fallback. Both load only the viewed area, use normal HTTP caching and require internet. The providers receive the requested map area, which can reveal approximate location when following the player. Attribution remains visible. Offline centre mode retains the bundled downtown roads, buildings, parks and water; it does not include municipality-wide offline terrain. These are OpenTopoMap/OSM maps with an outdoor appearance, not Trailmap's proprietary layers.

Choose **Find my location** and allow location in the browser/device prompt. The first fix centres the map and subsequent fixes follow you. Approximate fixes show an amber marker and accuracy circle; collection and distance require a fresh fix within 25 m, inside the municipality, at walking speed. GPS gaps, jumps and switching sessions do not award teleport distance. Pausing or backgrounding the app stops tracking. Browser location requires localhost or HTTPS; a laptop may only provide a coarse fix. The separately labelled city demo follows the bundled downtown street graph.

The municipality boundary is derived from [OpenStreetMap relation 569407](https://www.openstreetmap.org/relation/569407) (ODbL), generated with `tools/Build-JyvaskylaBoundary.cjs`. Outdoor tiles: © OpenStreetMap contributors, SRTM · OpenTopoMap (CC-BY-SA). Optional public environment settings `EXPO_PUBLIC_OUTDOOR_TILE_URL` and `EXPO_PUBLIC_STREET_TILE_URL` accept tile URLs containing `{z}`, `{x}` and `{y}`; only configure services you have permission to use.

The compact Garmin navigation/collection prototype is kept as the companion concept. Garmin Connect pairing and profile/event synchronization are still pending and are labelled accordingly in the app; no live watch connection is claimed.

## Checks

```text
npm run typecheck
npm run lint
npm test
npx expo export --platform web
```

The account suite verifies idempotent seeding, salted non-plaintext credentials, wrong-password rejection, separate profiles, session restoration/expiry, password changes and admin access checks. Map/location tests verify outer district coverage, bounded tile rendering and projection, approximate/accurate GPS eligibility, stale/jump rejection, browser high-accuracy settings, permission errors and watch cleanup. The parent repository still contains its existing game, street and map tests.

Dependency audit currently reports eight upstream Expo/tooling advisories (including Zod 3). The proposed automated fix downgrades Expo by seven major versions; it has not been applied. The development server is bound to localhost. This app does not accept remotely submitted validation payloads or host a public login API.
