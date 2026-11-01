# Production compass playtest — TR-165

The user requested a relevant production package on 2026-11-01. This release
promotes only the opt-in compass from development onto the existing static public
playtest, based on production a5dc0cd. Shared accounts, experimental XP, shared
world changes and the mapped route planner remain development-only.

Open Quest controls and choose Enable compass on a supported phone. Permission is
requested only from that action. The map stays north-up; the artefact arrow uses
fresh screen-top heading. Unsupported, denied, stale and poorly calibrated readings
show NORTH UP. Apple's magnetic reference is labeled M and is approximate.

No profile/session keys, gold, inventory, tile IDs or GPS reward/collection gates
change. No heading history is stored or sent. Existing adventure recovery and map
stability fixes remain included. Screen-locked continuous iPhone browser GPS remains
unsupported; physical compass calibration and orientation validation remain pending.

Automated compass tests cover permission, sensor cleanup, suspension/resumption,
freshness, wraparound, screen rotation and throttling. Required production regression,
type and lint checks run before publication. Rollback uses the prior public Sites
version 8 without changing browser storage.

## Published evidence

- Public Sites version **9**, deployment `appgdep_6ae6de29bda881919ee8f824bdac4add`,
  succeeded 2026-11-01T06:37:49Z; existing public audience and static hosting retained.
- GitHub main source `86231ba5b7c5f7a9e26c0a908113658545cca7ed`;
  hosting source `635ef1df772d04c0518bc2d7ea85964fa48a7b47`.
- All **56** production regression tests, lint and types passed; static Expo export
  passed. All 70 exported files were byte-verified before packaging. Local 390×844
  browser smoke check confirmed login, persistent map, compass opt-in controls,
  NORTH UP fallback and no DEV badge, with test gold/distance unchanged at zero.
- Archive SHA-256 `554745bad3b5d8a2b8c47909714f22e13feaf99ffe862fe5c2a27126e5a0706c`.
- Physical heading/GPS testing remains pending; this release does not claim a
  device pass. Refresh the public app and open quest controls → Enable compass.
