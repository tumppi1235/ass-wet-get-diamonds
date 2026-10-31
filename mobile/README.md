# Trail Relics — React Native app

The active app is React Native + Expo SDK 58, currently tested in the browser. Android/iOS packaging is paused. Native UI components, Expo Router and react-native-svg replace the old WebView host; the tested deterministic engine remains shared with the prototype.

The game interface uses an original retro RPG theme: pixel typography/icons, dark green felt, gold frames, and bevelled controls. Terrain imagery remains unfiltered for navigation. Pixelify Sans is bundled for offline use under the SIL Open Font License; its licence is in `assets/fonts/OFL-PixelifySans.txt`. Icons and the patterned background are original SVG artwork.

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
| tumppi | Delivered privately in chat | Explorer |
| tuomas.jokela | Delivered privately in chat | Explorer |

Profiles are created on first launch of each browser/device installation. Missing provisioned explorers are added on upgrade. Starter passwords are development defaults and can be changed on the Profile screen. Existing users, password changes and saved games are never overwritten by seeding. Manual sign-in is required; the admin/test shortcuts have been removed.

The admin screen lists local profiles with collection counts and distance, and can create more test players. All new profiles have explorer access. Normal users cannot load admin user-management data, even if they enter the admin route manually. Profile display names and passwords can be changed by their signed-in owners.

## Data and sign-in

Accounts and progress stay on this installation in AsyncStorage (browser local storage on web). Each profile has its own game state, discoveries, visits, path, distance, energy, weather and collection. The browser prototype's old saves are kept separately and are not automatically assigned to a new user. Clearing browser/app storage removes local profiles and progress.

Passwords are salted individually and stored as PBKDF2-HMAC-SHA256 verifiers (600,000 iterations), never plaintext. Sessions expire after eight hours; changing a password invalidates the active session. Every profile read/write checks the current session, user ownership and token. Saves capture immutable snapshots, preventing a queued save from one user being written into another user's profile after switching accounts.

These are local device profiles, not a hosted authentication system. Roles protect normal app flows; they are not a security boundary against someone who controls the device or edits its local storage. There is no online password recovery or cross-device sync.

## Game and Garmin direction

The game opens with a full-screen map. Street, Terrain and Me are the only map selections; a small compass overlays the top-left corner. Quest actions and account links stay in a collapsible bottom drawer. The Relics tab lists landmark destinations, separate from the map. Pinch, drag, double click and mouse wheel control zoom. The grid is visible at useful scales and fades out at city scale without an extra button. Thirteen landmark relics include Haukkala and Sippulanniemi; ordinary hidden artefacts still use current/adjacent tiles. See [phone playtest instructions](../docs/WEB-PLAYTEST.md).

Walking earns **1 gold per 100 metres**. Gold and partial progress toward the next coin stay in the local profile across sessions. Only accepted GPS distance earns gold: coarse fixes, stale positions, GPS jumps and pauses add none. The labelled demo also earns gold for testing, just as it already updates demo distance and collection progress. Existing profiles start at zero gold; historical distance is not converted. Gold is currently a saved resource with no spending feature.

Visited areas remain visible: green for your visits, purple for other local profiles, teal for both. Other-player data contains anonymous visited-cell presence only, not names, precise paths or account information. It loads when signing in; there is no cross-phone community service yet. At distant zooms, visited cells are grouped into larger areas; zooming in restores individual 250 m tiles. Map imagery automatically selects more detailed terrain/road tiles as you zoom, and offline centre detail omits buildings and minor paths at wide scales.

Outdoor mode uses OpenTopoMap terrain, contours and trails, with OpenStreetMap street tiles as a fallback. Both load only the viewed area, use normal HTTP caching and require internet. The providers receive the requested map area, which can reveal approximate location when following the player. Attribution remains visible. Offline centre mode retains the bundled downtown roads, buildings, parks and water; it does not include municipality-wide offline terrain. These are OpenTopoMap/OSM maps with an outdoor appearance, not Trailmap's proprietary layers.

Choose **Me** to locate without quest rewards, or open the bottom drawer and choose **Start quest** and allow location in the browser/device prompt. The first fix centres the map and subsequent fixes follow you. Approximate fixes show an amber marker and accuracy circle; collection and distance require a fresh fix within 25 m, inside the municipality, at walking speed. GPS gaps, jumps and switching sessions do not award teleport distance. Pausing or backgrounding the app stops tracking. Browser location requires localhost or HTTPS; a laptop may only provide a coarse fix. The separately labelled city demo follows the bundled downtown street graph.

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
