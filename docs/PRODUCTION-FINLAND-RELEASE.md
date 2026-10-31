# Public Finland playtest promotion — 2026-10-31

The user explicitly requested promotion of the Finland development version to production, plus a dense relic cluster near Rantalantie in Haukivuori. This supersedes the earlier dev-only publication restriction for these features. Physical iPhone/coast/border checks remain pending; this is a public playtest release, not completion of the M5 shared-service/device gates.

## Released content

- **501 destinations:** 23 original Jyväskylä, 450 national additions, 28 new Haukivuori/Rantalantie finds.
- Rantalantie is OSM way **1156889836**, resolved under Mikkeli/Haukivuori (about 62.11665, 27.08126). The retained Geofabrik extract confirms its name and geometry. Five finds use its own way nodes; 23 use nearby eligible mapped outdoor roads/paths. Every selected point is at most 806m from a retained Rantalantie node and occupies a distinct existing game cell. There are four of each of the seven artefact types.
- Original catalog files/collected IDs remain unchanged. The cluster has its own catalog and provenance: `mobile/assets/haukivuori-relics*.json`. `tools/Extract-HaukivuoriPaths.py` and `tools/Build-HaukivuoriRelics.cjs` reproduce selection offline from the existing extract. Road candidates exclude tagged private/no/permit/customer/destination access, driveways, motorroads, indoor/tunnel/covered ways. Source-map screening is not a physical access inspection.
- The released Finland world, country GPS/gold/claims, city search, geodesic ranges and journal/attribute preview are enabled in **both** environment builds through `config/features.ts`. XP earning remains inactive; compass device-heading work remains TR-165 backlog.

## Save compatibility and isolation

Production retains `trail-relics.profiles.v1` and `trail-relics.session.v1`; development keeps its separate `trail-relics.dev.*` keys and private origin. Never publish a development-mode bundle over production or copy its local profiles/data. New optional journal fields initialize from existing history with explicit legacy provenance and zero unknown lifetime distance/XP; existing gold, fractional metres, inventory, visits, claim receipts, searched flags, active adventure and last GPS timestamp remain intact. Existing profile/password bootstrap behavior stays unchanged.

The `restoreDevelopmentState` helper retains its old internal name for compatibility but its released feature now applies to both variants. Environment still selects storage namespace, curve config and the DEV TEST badge. Do not confuse environment selection with feature rollout.

## Checks and publication

`production-release.test.ts` verifies exact road provenance, 28 distinct cells, seven types, distance bounds, capture/reload behavior and legacy production data/key preservation. Existing country, account, gold, claim, GPS recovery and progression tests remain required in both variants. Browser smoke-check the **production build**: no DEV TEST badge, old local progress retained, Rantalantie search returns 28.

Publish the validated production export through the existing public Sites project `appgprj_6ae4783f8fcc8191a8e97464e8375938`; refresh the private dev project separately using the development export. Record exact GitHub source SHA in `/release.json`, environment, catalog counts and outstanding physical checks. GitHub Actions independently retains reports for the source revision. The user-authorized public playtest uses the connected Sites workflow; do not invent a passing phone-test issue to satisfy the optional prerelease-promotion workflow.

Rollback is the previous public saved Site version, number 6, source GitHub SHA `3faba7e41ffdd6aa6f8bd2584087e87635f27ad1`; keep player storage untouched. New optional fields must be retained by older clients' ordinary save behavior. Previously collected IDs, gold and claim spending receipts are not reset by a Site version rollback.
