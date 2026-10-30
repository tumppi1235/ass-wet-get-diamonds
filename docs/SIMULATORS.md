# Local device testing

VS Code does not bundle Android or iOS simulators. It can launch separately installed device tools, including this project's VS Code task.

## Android on this Windows laptop

The local Google Android Emulator, Android 15 x86_64 system image, platform-tools and command-line tools are installed under `.tools/android-sdk`. A Pixel 6a virtual phone named `TrailRelics_API35` is stored under `.tools/android-avd`. These downloads and virtual-device files are ignored by Git. Windows Hypervisor Platform is already installed and usable; no system feature change is needed.

Launch the virtual phone and install/open the current APK:

```powershell
./tools/Start-AndroidSimulator.ps1
```

In VS Code, open the project folder, choose **Terminal > Run Task**, then **Trail Relics: Android simulator**. The second task rebuilds the APK before launching. The launcher uses the project's `.tools` paths and does not require an extension.

Tap Start GPS in the app and allow precise location. Use the Android emulator's extended controls > Location to set a point or replay a walking route in Jyväskylä. Coordinates near 62.2415 N, 25.7472 E are in the trial area. Stay below walking/jogging speed; GPS jumps and vehicle speeds do not award distance. The app expects fresh fixes, so repeated route points are needed to keep the signal active.

On a fresh clone, install the official Android SDK emulator, platform-tools and `system-images;android-35;default;x86_64` under `.tools/android-sdk`, and create a Pixel 6a AVD with the name and AVD home above. Accept Google's applicable agreements. Downloads are deliberately not included in Git.

## iOS

Apple's native iOS Simulator requires macOS and Xcode. It does not run locally on Windows, and VS Code extensions do not change that requirement.

The native iOS project is [ios/TrailRelics.xcodeproj](../ios/TrailRelics.xcodeproj). On a Mac, open it with Xcode, select the TrailRelics scheme and an iPhone Simulator, then Run. See [iOS instructions](../ios/README.md). The project is prepared but has not yet been compiled or run on a Mac.

A narrow browser window on Windows can check the shared phone screen layout; it is not an iOS simulator and cannot verify Core Location, WebKit storage, signing or native lifecycle behaviour.

Official references: [Android Emulator](https://developer.android.com/studio/run/emulator), [Apple Simulator](https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices).
