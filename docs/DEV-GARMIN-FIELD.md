# Enduro 3 normal-activity data-field foundation

`garmin-datafield/` is a separate development-only Connect IQ **data field**, with its own application ID/storage key. The released standalone `garmin/` watch app and production download files are untouched.

The prototype reads the GPS/activity information supplied by a normal Garmin activity. It does not start another recording, request its own continuous GPS listener, award anything or send private data to a new service. Its display shows the current compatible tile ID, observation quality and queue capacity. Small layouts fall back to a compact tile/GPS display; actual round-screen layout tests remain pending.

## Implemented source

- Activity identity uses the SDK's start time, activity-profile identity and a device-local monotonic counter. Stop/auto-pause are pause states; resume/reload of the same SDK activity preserves its ID. Unloading a field is not activity completion.
- A timer reset records **ended-unverified**. This callback does not establish whether the user saved or discarded the Garmin activity. Nothing is imported or rewarded until that distinction and provider identity can be verified.
- SDK good-quality location observations compute the original compatible tile projection. This is **not** a conversion of Garmin quality into the phone's 25m accuracy gate, nor a hardware proof of fresh GPS. The server does not accept these events as qualifying browser evidence.
- Up to 64 start/pause/tile/collection-intent events persist locally. Entries have activity/sequence identity and observation time. Only tile-entry events retain coordinates, not a continuous second-by-second trace. SDK distance/timer/ascent metadata stays explicitly separate from game-validated distance.
- Manual LAP can queue one collection **intent** per activity/tile with a recent good observation; automatic/workout laps do not queue intents. Garmin's normal lap is still recorded. This is not a successful artefact capture, and there is no synced target list yet.
- A full queue refuses new entries, preserves existing events and shows **QUEUE FULL**. Storage exceptions are shown. No unacknowledged event is silently deleted. No sender, acknowledgement, retry transport or account-link claim is made.

## Build evidence and outstanding device profile

The installed official SDK is 9.3.0. Generic source and Monkey C test compilation pass with gradual type checking enabled; only the missing Enduro 3 manifest-profile warning remains. The test source covers grid signs, stable pause/resume identity, no duplicate same-tile intentions after revisits, stale/poor observations, ended-unverified state and queue saturation. **Those Monkey C tests have compiled but have not executed.**

```powershell
./garmin-datafield/build.ps1 -SourceOnly -Tests
./garmin-datafield/build.ps1 -SourceOnly
```

Both outputs are clearly named `GENERIC-NOT-INSTALLABLE` beneath ignored `.tools/dev-releases/`. Do not install them on a watch. The target build was also attempted with `-d enduro3` and failed with **Invalid device id specified: enduro3**. The official Enduro 3 device profile is not present in this environment. After it becomes available:

```powershell
./garmin-datafield/build.ps1 -Tests
./garmin-datafield/build.ps1
```

Only a successful target build can create `TrailRelics-Enduro3-field-dev.prg`. Then run the compiled tests in Garmin's supported Enduro 3 simulator and inspect full/partial field layouts before a physical test. A physical test must add the dev field to a normal Walk/Hike/Bike activity, check start/pause/resume/reload/tile changes and manual-versus-auto laps, and distinguish saved versus discarded activities. No watch installation, real recording or device test was performed by this source increment.

## Connectivity boundary

The current shared dev Site is owner-private and its API relies on platform-injected browser identity. It has no watch credential verifier or paired-device endpoint. Do not put a Sites bypass token, browser cookie or local password into watch properties, and do not mark the Site public to work around this. A supported authenticated bridge/ingress and revocable environment-specific device link are still required before transport can be connected. The user chose browser testing for now; a native phone companion has not been delivered.

Garmin's current documentation confirms foreground data-field communications support from API 5.0.0, but that capability alone does not provide account authentication, background delivery or access to this private Site. Garmin/Strava imports, cross-provider deduplication and server-trusted completion are separate backlog items.

## Official references checked 2026-10-31

- [DataField lifecycle, compute and manual lap trigger](https://developer.garmin.com/connect-iq/api-docs/Toybox/WatchUi/DataField.html)
- [Activity.Info, nullable GPS, start time and summary metadata](https://developer.garmin.com/connect-iq/api-docs/Toybox/Activity/Info.html)
- [Activity.ProfileInfo](https://developer.garmin.com/connect-iq/api-docs/Toybox/Activity/ProfileInfo.html)
- [Garmin GPS quality categories](https://developer.garmin.com/connect-iq/api-docs/Toybox/Position.html)
- [Persistent storage and value limits](https://developer.garmin.com/connect-iq/api-docs/Toybox/Application/Storage.html)
- [Communications capability boundaries](https://developer.garmin.com/connect-iq/api-docs/Toybox/Communications.html)
- [Compatible devices, including Enduro 3](https://developer.garmin.com/connect-iq/compatible-devices/)
