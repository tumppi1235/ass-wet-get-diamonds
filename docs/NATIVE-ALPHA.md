# Trail Relics 0.1.0 device alpha

## Android

`dist/TrailRelics-android-v0.1.0.apk` is a signed standalone Android package targeting API 35, with Android 8.0 / API 26 as its minimum. Send the APK as a file/document. The recipient opens it on their phone, installs it, opens Trail Relics and taps Start GPS. Choose precise location while using the app. Detailed instructions are in `dist/INSTALL-ANDROID.txt`.

The native Android host supplies foreground GPS to a bundled, offline game screen. It has no Internet permission and blocks navigation and network requests from the game view. The JavaScript bridge exposes only start and stop GPS. The two game screens are Guidance and Nearby map; the field collection appears below them. Weather is manual. Actual GPS replaces simulator movement. No street-routing service or GPS upload is used. This first alpha uses the existing Jyväskylä coordinate projection, and is intended for field testing there.

`android/assets/engine.js` is copied from `public/engine.js` during the build, preserving deterministic placement, visit-weighted rarity and capture odds. Phone progress is separate from browser and watch progress. Data is saved locally; uninstalling or clearing data removes it. Background GPS and FIT activity recording are not implemented.

Build from the repository root with `./android/build.ps1`. The current build expects the official platform 35, build-tools 35.0.0 and Temurin JDK 17 in `.tools`, downloaded under their respective agreements. Obtain Android tools from https://developer.android.com/studio and Java from https://adoptium.net/. The build verifies APK signatures and inspects the package manifest after packaging.

The development signing key stays in `.keys/android-alpha.keystore`. Retain it to sign later updates with the same identity. It has a development-only password recorded in the build script; create a protected release key before a wider release. Never include `.keys` or `.tools` in shared source packages.

## Garmin Enduro 3

`garmin` is a native Monkey C standalone watch app. It uses real foreground GPS, a north-up artefact direction/capture screen, and a three-by-three nearby tile screen. START starts GPS or attempts collection; UP/DOWN switches screens. Hold MENU for GPS pause, collection, manual weather and a new outing. BACK exits and saves. GPS does not start until the player presses START.

The gameplay engine ports the same unsigned 32-bit hash, 250 m grid, neighbouring-visit rarity calculation, nine-tile visibility, distance energy and one-attempt collection rules. Weather forms and collected finds are saved on the watch. This alpha stores at most 180 revealed tiles to bound the first storage implementation; it reports when that limit is reached. There is no phone sync, Garmin basemap, route planning or activity recording in this first build.

Build with `./garmin/build.ps1`, after installing the official Connect IQ SDK and Enduro 3 device profile with https://developer.garmin.com/connect-iq/sdk/. The script expects the SDK in `.tools/garmin-sdk`; its compiler reads device profiles from Garmin's normal ConnectIQ configuration. A local signing key is created in `.keys/garmin-developer.der` and is never included in shared artifacts.

When built successfully for Enduro 3, the output is `dist/TrailRelics-enduro3-v0.1.0.prg`. Connect the watch by USB, locate its GARMIN/APPS folder using a device transfer tool, and copy the model-specific PRG there. Disconnect/eject safely and open Trail Relics from the watch's apps list. Sideloading reference: https://developer.garmin.com/connect-iq/connect-iq-basics/your-first-app/ . Do not copy a generic compiler-check PRG or the unit-test build to a physical watch.

At preparation time, Garmin's SDK Manager closes immediately on this laptop, and the Enduro 3 device profile is not yet installed. Generic source compilation succeeds; this does not validate the target device, simulator rendering or hardware behaviour. The Enduro-specific install file remains pending the device profile.

## Validation

- `node tests/engine.test.cjs`: existing gameplay rules.
- `node tests/streets.test.cjs`: desktop street-route confinement and adjacent visibility.
- `node tests/mobile.test.cjs`: GPS freshness/accuracy, jitter, vehicle/jump rejection, resume without counting paused travel, mobile screen switching, duplicate collection and saved state.
- Android Java compilation, DEX generation, APK signature verification and manifest inspection complete successfully.
- Browser QA of the phone screens uses a separate `.tools/mobile-preview` fixture. That fixture is excluded from the APK.
- Garmin generic compilation includes test functions using `-t`. Device-specific tests can be built with `./garmin/build.ps1 -Tests` after installing the device profile, and run in Garmin's simulator. Generic compilation is not a test run.

Neither native build has been tested on physical hardware yet. Compare GPS tile changes and distance with a short outdoor walk before relying on saved progress.
