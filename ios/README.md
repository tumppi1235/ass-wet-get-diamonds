# iOS alpha project

Open `TrailRelics.xcodeproj` on a Mac with Xcode. Select the shared **TrailRelics** scheme, choose an iPhone Simulator, and Run. The project targets iOS 15 or later and includes iPhone/iPad support. No external packages are required.

This is a native UIKit/Core Location host for the shared offline game in `../android/assets`. Keep the repository folders together: Xcode copies that assets folder into the app bundle. The same deterministic gameplay engine, full offline Jyväskylä street map, guidance, manual weather and local collection run on both phone platforms.

Tap **Start GPS** and allow precise location while using the app. GPS pauses while the app is not active. Phone and watch progress remain separate. No account, location upload, fitness recording or background-location capability is included.

For simulator testing, use Simulator's location controls or an Xcode GPX walking route in Jyväskylä. Simulated locations are accepted only in simulator builds; physical iPhones require a real GPS fix. Locations must be recent and accurate to 25 m or better. The gameplay filter rejects large jumps and vehicle speeds.

For a physical iPhone, select your Apple development team under Signing & Capabilities, connect the iPhone, select it as the run destination and Run. Sharing installable iPhone builds requires Apple's signing/distribution process; use TestFlight when ready for friend testing. An Android APK cannot be installed on iOS.

The Xcode project is prepared on Windows. A read-only GitHub Mac workflow builds the simulator target and an unsigned iPhone IPA; see ../dist/INSTALL-IPHONE.md for the latest build and signing instructions. No physical iPhone test has been completed yet. Apple's iOS SDK, signing and Simulator require macOS/Xcode. A phone-sized browser preview on Windows can check shared screen layouts, but does not validate this native iOS host.

Command-line simulator build on a Mac:

```sh
xcodebuild -project ios/TrailRelics.xcodeproj -scheme TrailRelics -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath ios/build CODE_SIGNING_ALLOWED=NO build
```
