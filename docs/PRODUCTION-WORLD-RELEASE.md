# Production world promotion — 2026-11-01

User authorization: “List me now what has been developed and then push those to
prod.” This supersedes the earlier dev-only restriction for completed web features.

The package includes route/GPS recovery and gold accounting fixes, clearer visited
and claimed tiles, Finland relics, tile purchasing, opt-in live compass, shared
profiles/world state, progression and inventory, encounters, mapped Foot/Bike
planning and GPX export, revealed rarity clues, and role-protected administration,
maintenance, pending-action and scoped recovery controls.

The existing public production Site is retained. Existing phone-local profiles and
progress use their original keys. Shared play is opt-in and begins in a separate
production database; no development players, journals, test grants, configuration
or snapshots are migrated. Finland routing inputs are public immutable OSM-derived
data, checked by checksum. Production rejects dev service identity and recovery
snapshots. New shared players receive ordinary player permissions.

Verification before publication: 184 application regressions, mobile types/lint,
server types/lint. Four new production tests cover pinned environment, isolation,
idempotency, scoped backup rejection and required recovery generation. Worker
build, graph and hosted verification will be recorded with the deployment evidence.

Continuous screen-locked iPhone browser GPS, physical compass/navigation checks,
large/dense hosted performance, watch GPX import, hosted provider restore/drain,
named invitations and Garmin/Strava connectivity remain pending. Unknown distance
and routes are never reconstructed for rewards. No new watch/mobile build is
included. Experimental reward values remain labeled in shared play.

Production tooling: `Build-SharedDev.cjs --production` builds the complete Worker
and game; `Prepare-ProductionHost.cjs` targets only the existing production Site.
The official Sites source/save/deploy workflow publishes the complete Worker
artifact. This replaces the older static-only compass promotion procedure for
this package. Runtime scope and administrator configuration stay in native Sites
settings, never in source or the archive. Roll back with care after shared-world
writes: preserve the database and journals; prefer a forward fix over an older
server that lacks the current generation protocol.
