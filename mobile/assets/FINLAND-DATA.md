# Finland playtest data

The development catalog adds **450** path-side relics: 245 in 35 towns (seven types each) and 205 rural trail finds. The original `landmarks.json` remains byte-for-byte unchanged (23 Jyväskylä finds). Production keeps that original catalog until explicitly promoted.

Sources: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [Geofabrik Finland extract](https://download.geofabrik.de/europe/finland.html), ODbL 1.0. Exact extract MD5, way/node IDs, coordinates, selection version and relevant tags are in `finland-relics-provenance.json`. Contributor identities and player locations are not included. The approximately 738 MB source PBF and node cache stay in ignored `.tools/`, outside app/Git/hosting archives.

Country gate: [geoBoundaries FIN ADM0](https://www.geoboundaries.org/api/current/gbOpen/FIN/ADM0/), boundary FIN-ADM0-59408979, represented year 2017, upstream commit `9469f09`, OSM/Wambacher source licensed ODbL 1.0. Credits: OpenStreetMap contributors; geoBoundaries / William & Mary geoLab. The bundled simplified geometry includes Åland. It is a gameplay boundary, not a legal/survey boundary; coast/border accuracy and access still need field checks.

Rebuild offline: download Geofabrik's PBF + MD5 into `.tools/finland-source/`, verify the checksum; install `osmium` into `.tools/osm-python`; run `tools/Extract-FinlandPaths.py`, then `node tools/Build-FinlandRelics.cjs`. Country metadata/simplified GeoJSON feed `node tools/Build-FinlandBoundary.cjs`. No provider calls occur during these build steps or normal play. Original failed Overpass probes are not part of the build. Do not bulk-fetch OSM map tiles for catalog preparation.

Selection uses actual nodes of footway/path/pedestrian/steps ways, plus cycleways explicitly permitting pedestrians; excludes tagged private/no/customers/permit/destination/delivery/agricultural/forestry access, indoor/tunnel/covered/area/informal paths and higher climbing grades. Towns get distinct existing-grid cells; rural candidates use sparse geographic buckets and the prototype's deterministic rarity/presence roll. Existing gold rates, capture probabilities and old collection IDs are preserved. Metadata screening is not a physical access inspection: follow public paths and current posted closures/access rules.

The catalog is a finite local playtest world. It is not a server-generated live spawn system, global visitation service or cross-phone inventory.
