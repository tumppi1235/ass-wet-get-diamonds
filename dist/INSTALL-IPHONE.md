# Test Trail Relics on iPhone

Open the latest successful [iPhone build](https://github.com/tumppi1235/ass-wet-get-diamonds/actions/workflows/ios-build.yml). Under **Artifacts**, download **TrailRelics-ios-v0.2.0-unsigned**, unzip it on your laptop and locate **TrailRelics-ios-v0.2.0-unsigned.ipa**. GitHub may require you to sign in to download the artifact.

The workflow compiles the shared-map iOS project on a GitHub Mac runner. It has read-only repository permission and never pushes code or binaries. No Apple account or signing keys are sent to GitHub.

**This IPA is unsigned. Opening it directly on an iPhone will not install it.** It needs signing for your iPhone first.

## From a Windows laptop

One option is [Sideloadly](https://sideloadly.io/), a third-party Windows/macOS tool that signs and installs IPA files using your own Apple ID. Follow its official installation and prerequisite instructions, connect the iPhone by USB, select this IPA, and complete the signing/install steps yourself. Do not send your Apple ID password in chat or put it in this repository. If iOS asks, follow Apple's developer-app trust / Developer Mode instructions on the phone.

Sideloadly supports free Apple IDs; free-account installs normally need refreshing after seven days. See its official site for current requirements and limits. This project has not been tested with that signing workflow yet.

## From a Mac

Open `ios/TrailRelics.xcodeproj` in Xcode, select your development team and connected iPhone, then Run. This signs and installs the app through Apple's development tools. Select an iPhone Simulator to test without a physical phone.

For simpler distribution to friends later, use Apple's [TestFlight](https://developer.apple.com/testflight/) process with an appropriate Apple Developer account. No TestFlight build is configured in this alpha.

After installation, open Trail Relics, tap **Start GPS**, allow precise location while using the app, and go outdoors. Screen 2 is the full offline Jyväskylä street map with game tiles. Garmin retains its compact nearby view.
