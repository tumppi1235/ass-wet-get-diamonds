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

## Published version 10

Published successfully at the [existing public URL](https://trail-relics-jyvaskyla.tuomasl.chatgpt.site).
[Exact release, archive and GitHub CI evidence](evidence/production-v10-release.json)
records the application and hosting source commits, saved version and deployment.
Runtime revision 1 pins the production environment and Site. All six branch
workflow runs passed for the application and release-preparation commits; 184
regressions passed. The archive passed at 193,492,923 compressed / 248,212,480
expanded bytes, under both 268,435,456-byte limits.

Hosted release manifest and health returned 200 with production identity and
configured route assets; anonymous profile access returned 401. Native database
inspection confirmed a separate DB with all 17 tables and initially empty players,
events and configuration. The public audience was preserved. An existing local
Test Explorer journal survived reload unchanged: 0 gold, 0.00 km, 0 finds, tile
0,0, quest stopped. The map, Me, compass, shared-world entry and rarity clue render.

The shared profile entry and external sign-in redirect work. External account
selection returned a provider 400 error; retry reached a security challenge, so
authenticated production shared play still needs manual sign-in validation. This
is not recorded as a passing end-to-end authentication test. No shared profiles,
game rewards, claims, events, access edits or recovery operations were created
during hosted QA. Local play remains available; GPS/heading field tests remain
pending. The live dev version and its player data were not changed.
