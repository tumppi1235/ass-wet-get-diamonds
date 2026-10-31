# Source-specific activity classification — TR-122

The pure shared classifier in `mobile/src/integrations/activity-category.ts` and the offline inspection command normalize supported provider metadata without importing an activity or granting rewards. No provider account, OAuth token, network call, upload, new endpoint or cross-provider identity is created.

## Contract

- `source: garmin-connect-iq` accepts numeric **Toybox.Activity** sport/subSport codes. It does not interpret arbitrary FIT files or Garmin Health API codes as this namespace. Run/Walk/Hike map to Foot; Cycling and E-Biking map to Bicycle with assistance retained. Only explicit compatible subtypes are recognized. Missing subSport stays review/unknown setting, and incompatible/unknown combinations do not gain a movement category from their name or speed.
- `source: strava` accepts exact current `sport_type` values, not deprecated `type`, renamed activity titles or case-insensitive guesses. Supported Walk/Run/TrailRun/Hike and cycling variants map to the two categories. Trainer/manual booleans are honored; malformed flags fail, manual entries require review, virtual stays virtual, and e-bike variants retain assistance. A plain Ride label does not prove unassisted effort.
- Unrecognized providers, mixed/unsupported sports and invalid metadata do not silently default to Foot. Every result carries the mapping revision, reason, declared setting and `rewardEligible: false`. Declared outdoor metadata is not proof of current GPS, saved completion or physical effort.

```powershell
node mobile/node_modules/tsx/dist/cli.mjs tools/Inspect-ActivityCategory.mts --source garmin-connect-iq --sport 1 --sub-sport 3
node mobile/node_modules/tsx/dist/cli.mjs tools/Inspect-ActivityCategory.mts --source strava --sport EBikeRide
```

The command reads only these nonsensitive type arguments and prints classification plus zero writes. It never reads credentials, routes, user files or a database. Unsupported/invalid input exits unsuccessfully rather than becoming a supported import.

## Watch and evidence

The separate dev data-field source now retains initial raw sport/subSport metadata in its local activity/start event, with an explicit Connect IQ namespace. Null profile/start/identifier data suppresses sampling with `PROFILE UNAVAILABLE` instead of dereferencing an absent profile. Existing queue/storage identity remains compatible; older entries without metadata remain unknown, not retrospectively classified. Original watch releases are unchanged.

117 browser/shared regression cases pass, including source namespace distinctions, indoor/virtual/assisted handling, manual/trainer flags, malformed/unknown values and no reward eligibility. Actual CLI checks classify a trail run and an assisted ride with zero writes. Generic Garmin source and test compilation pass, including start metadata assertions; **Monkey C tests have not executed**, and the official Enduro 3 device profile, authenticated bridge, saved/discarded verification and provider imports remain pending. Classification is a foundation, not a completed import/reconciliation pipeline.

Official references checked 2026-11-01: [Toybox.Activity enums](https://developer.garmin.com/connect-iq/api-docs/Toybox/Activity.html), [nullable ProfileInfo](https://developer.garmin.com/connect-iq/api-docs/Toybox/Activity/ProfileInfo.html), [Strava sport types/activity metadata](https://developers.strava.com/docs/reference/#api-models-SportType). No provider terms acceptance or new integration authorization is implied by reading these public specifications.
