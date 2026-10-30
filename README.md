# Trail Relics

An exploration game set in Jyväskylä. Walk farther, discover artefacts in 250 m tiles, and build a field collection.

## Android alpha

[Download Android APK](https://github.com/tumppi1235/ass-wet-get-diamonds/raw/refs/heads/main/dist/TrailRelics-android-v0.1.0.apk) · [Install guide](dist/INSTALL-ANDROID.txt)

Share the APK link with your friend. On an Android phone, download and open the APK, install Trail Relics, tap Start GPS, and allow precise location while using the app. Requires Android 8.0 or newer. Keep the app open while playing. Physical-phone testing is still pending.

Includes real GPS, two game screens, manual weather and saved collections. The tile map works offline. No account, Internet permission, GPS upload, background tracking, activity recording or phone/watch sync in this first version.

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
2. Nearby map: your tile and eight neighbouring tiles. Artefacts outside that vision are hidden.

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
```

All three suites pass. Android Java compilation, APK signature verification and manifest checks pass. Phone screens were checked in a browser preview. Neither native app has been tested on physical hardware yet.

Private signing keys and downloaded SDKs are excluded. See [native alpha notes](docs/NATIVE-ALPHA.md) and [third-party data](THIRD_PARTY.md).
