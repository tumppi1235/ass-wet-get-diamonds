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
