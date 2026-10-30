# Native phone alpha 0.2.0

Android and iOS use the shared offline screens and deterministic engine in android/assets. Both include real foreground GPS, guidance/capture, a full street map, manual weather, local collections and the same distance/odds rules. Phone progress remains separate from the browser and watch. The map bundles real OpenStreetMap streets, buildings, parks and water for central Jyväskylä. Panning reveals artefacts in the visible map without awarding visited tiles or distance. Garmin keeps its compact nine-tile view for battery and screen constraints.

## Android

Download dist/TrailRelics-android-v0.2.0.apk. See dist/INSTALL-ANDROID.txt. Android 8.0 or later is required. The signed APK has no Internet permission; GPS and saved progress stay on the phone. Build with android/build.ps1 using the official Android API 35/build-tools 35.0.0 and JDK 17 under .tools. Keys are local in .keys and excluded from Git.

The app was built, signature-checked, installed and launched in the local Pixel 6a / Android 15 emulator. The full-map screen was visually checked using a browser QA fixture excluded from the APK. Physical phone testing remains pending. GPS pauses when the app is not active. No FIT recording or background tracking is included.

## iOS

Open ios/TrailRelics.xcodeproj in Xcode on a Mac, or use the read-only Build iPhone alpha workflow in GitHub Actions. It builds for Simulator and unsigned physical-device targets, then uploads an IPA artifact. The workflow never writes to the repository and requires no Apple credentials. Installation on an iPhone still requires signing. See dist/INSTALL-IPHONE.md and ios/README.md. iPhone hardware testing and the third-party Windows signing workflow remain unverified.

The native UIKit host uses Core Location and a WKWebView restricted to the bundled game files. GPS starts only after the player taps Start GPS and grants precise location while using the app. It stops when inactive. The Simulator accepts simulated fixes; device builds reject locations marked as software-simulated. The shared eight-metre movement threshold and stale/poor/jump/vehicle filters apply to both phones.

## Garmin Enduro 3

The Monkey C app is unchanged by the phone-map expansion. It retains foreground GPS, north-up guidance, a three-by-three nearby grid and a local collection. START begins GPS or captures, UP/DOWN switches screens, MENU opens weather/collection/outing options and BACK exits. The alpha stores at most 180 revealed tiles.

Generic source and test-function compilation pass. An official Enduro 3 device profile is still required to create and validate a watch-specific PRG. Garmin SDK Manager is closing immediately on this development laptop. Do not sideload a generic compiler-check or unit-test PRG onto the watch. Use garmin/build.ps1 after the Enduro profile is installed; the local developer key stays in .keys.

## Verification

Run the four Node suites: tests/engine.test.cjs, tests/streets.test.cjs, tests/mobile.test.cjs and tests/phone-map.test.cjs. They cover game rules, street confinement in the desktop simulator, GPS filtering, native bridge actions, mobile capture/state, real-map features, full-map discovery, stable rarity and panning without distance credit.

The Xcode project and shared scheme XML are structurally parsed on Windows. Native iOS compilation status is reported by the GitHub Mac workflow; a source parse alone is not a native build or device test.
