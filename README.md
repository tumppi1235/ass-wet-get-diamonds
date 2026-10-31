# Trail Relics
## Current app: React Native, browser first

[Play Trail Relics on your phone](https://trail-relics-jyvaskyla.tuomasl.chatgpt.site) · [Phone playtest guide](docs/WEB-PLAYTEST.md)

The main game is now in [mobile](mobile): React Native + Expo, with local login, separate saved profiles, a municipality-wide Jyväskylä outdoor map and a collection. Street and terrain maps load online; bundled offline detail covers downtown only. Me shows actual position and accuracy, with game progress enabled for accurate fixes inside the city. Android/iOS packaging is paused. Garmin remains the planned compact collector/navigation companion; real watch pairing and sync are not connected yet.

Start **START-WINDOWS.bat**, or run `cd mobile`, `npm ci`, then `npm run web -- --host localhost`. Open http://localhost:8081/.

| Username | Initial password | Access |
| --- | --- | --- |
| admin | Admin123! | Local user administration and game |
| test | Test123! | Normal explorer game |
| tumppi | Delivered privately in chat | Tumppi's separate explorer profile |
| tuomas.jokela | Delivered privately in chat | Tuomas Jokela's separate explorer profile |

Manual sign-in is required; admin/test shortcuts have been removed. Profiles and progress stay on this device. Missing provisioned players are added on upgrade without replacing existing passwords or progress. Change passwords in Profile. [Full account and storage details](mobile/README.md).

The game UI uses an original pixel RPG theme while keeping the terrain map readable. The full-screen map has only Me, a small compass, and a collapsible quest drawer. It automatically locates/follows the player without starting a quest. Relic destinations have their own tab. A visible 250 m grid, mouse wheel, double click and pinch support exploration. Green/purple/teal overlays distinguish visits, with simplified groups at city scale. Walking earns 1 gold per 250 m + 1 for each newly explored tile. Tap an explored tile to claim it using gold: the first purchase costs 1 gold, then that tile's previous price + 1. Gold/purple borders show local ownership. Claims, prices and other-player visits are local-device data only; cross-phone sharing is not connected.

Phone playtest instructions: [WEB-PLAYTEST](docs/WEB-PLAYTEST.md). Saved guild, raid, tile-ownership and NPC ideas: [GAME-ROADMAP](docs/GAME-ROADMAP.md).

The earlier v0.2 native packages and simulator described below are retained as legacy snapshots.

An exploration game set in Jyväskylä. Walk farther, discover artefacts in 250 m tiles, and build a field collection.

## Legacy Android alpha (0.2)

[Download Android APK](https://github.com/tumppi1235/ass-wet-get-diamonds/raw/refs/heads/main/dist/TrailRelics-android-v0.2.0.apk) · [Install guide](dist/INSTALL-ANDROID.txt)

Share the APK link with your friend. On an Android phone, download and open the APK, install Trail Relics, tap Start GPS, and allow precise location while using the app. Requires Android 8.0 or newer. Keep the app open while playing. Physical-phone testing is still pending.

Includes real GPS, two game screens, manual weather and saved collections. The full street map works offline and includes real roads, buildings, parks and water in central Jyväskylä. No account, Internet permission, GPS upload, background tracking, activity recording or phone/watch sync in this first version.

## Garmin Enduro 3

The native Monkey C watch project is in [garmin](garmin). It has GPS, guidance, a nearby tile map, one-action capture, rarity visuals and local progress.

**The Enduro 3 install file is pending the official device profile.** Garmin SDK Manager is not opening on the development laptop. The source and test functions compile generically, which does not validate the target watch or simulator. See [native build notes](docs/NATIVE-ALPHA.md). The alpha stores at most 180 revealed tiles.

## Browser simulator

Double-click START-WINDOWS.bat, or run:

```text
node run_local.cjs
```

Python 3 is also supported: `python run_local.py`. Open http://127.0.0.1:8000/. No dependency installation or API key is required. Map imagery needs internet access.

Click near a street to plan a route, or load the city demo. Keyboard movement follows street branches. Space stops; E / Enter, the watch side key or the guidance watch face attempts collection. The bundled street graph covers central Jyväskylä. Unsupported destinations are rejected rather than connected by straight lines. [Street mode details](docs/STREET-MODE.md).

## Two game screens

1. Guidance: north-up direction and approximate distance to the nearest visible artefact tile centre, or Ready to capture with collection odds.
2. Phone street map: pan and zoom across real geography, with game tiles, visible-map artefacts, your position and your walking trail. Garmin retains the compact current-tile-plus-eight-neighbours view.

Common, Rare and Legendary finds have increasing size, with blue detailing for Rare and gold ornament for Legendary. About 64% of tiles contain a find. Placement is deterministic; rarity is fixed on first reveal and weighted by personal neighbouring visits, not public traffic. World coordinates are designed for the Jyväskylä field trial.

Distance energy tiers at 0/1/3/5/8 km give 20/35/50/65/75% base odds. Common adds 25 percentage points, Rare 10, Legendary 0. Cold/rain/snow adds 5/8/10. Outing distance adds 0.05 percentage points per km up to 5. Final odds cap at 90%. Success spends 2 km of energy; misses retain energy. One attempt per tile per outing. New outings reset distance, energy and attempts, preserving discoveries and collection. Weather is manual.

Phone, browser and watch progress are separate. Uninstalling or clearing app data removes local progress.

## Source and validation

- `public`: browser simulator, shared JavaScript rules and bundled streets.
- `android`: Android GPS host, offline screens and build script.
- `garmin`: Connect IQ watch app and build script.
- `dist`: Android APK and installation guide.
- `docs`: implementation, limitations and native build notes.

Run:

```text
node tests/engine.test.cjs
node tests/streets.test.cjs
node tests/mobile.test.cjs
node tests/phone-map.test.cjs
```

All four JavaScript suites pass. Android Java compilation, APK signature verification and manifest checks pass. Phone screens were checked in a browser preview. The Android app has also been installed and launched in a local Android 15 emulator. Physical-device testing is still pending.

Private signing keys and downloaded SDKs are excluded. See [native alpha notes](docs/NATIVE-ALPHA.md) and [third-party data](THIRD_PARTY.md).

## iPhone and desktop simulators

The [iOS project](ios) uses the same full street map and gameplay screens as Android. [Download and installation instructions for iPhone](dist/INSTALL-IPHONE.md). A GitHub Mac build compiles the app and produces an unsigned IPA artifact, which must be signed before installation. No Apple credentials or signing keys are stored in GitHub.

Android is installed locally as a Pixel 6a / Android 15 emulator. In VS Code choose Terminal > Run Task > Trail Relics: Android simulator. [Simulator setup](docs/SIMULATORS.md). Apple's native iOS Simulator runs on a Mac with Xcode; VS Code does not include it and cannot run it on Windows.
