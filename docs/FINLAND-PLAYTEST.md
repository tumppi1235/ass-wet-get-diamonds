# Finland relics — development only

TR-026/027/028/030 now have a browser playtest implementation on `develop`. Publish only to the private development Site. Production retains its previous source SHA/catalog and player storage.

- **473 landmark destinations total:** original 23 preserved, plus 450 sourced additions. Seven relic types in each of 35 towns from Helsinki/Turku to Utsjoki/Enontekiö and Mariehamn; 205 additional rural trail locations.
- All new positions come from actual outdoor walking-way nodes in the Geofabrik Finland OSM extract. Stable node/way provenance, source checksum, licensing and reproducible selection are in [FINLAND-DATA.md](../mobile/assets/FINLAND-DATA.md). Catalog construction does not send player GPS to a path-query provider.
- Accurate GPS, first-tile gold, collection, visits and tile claims work inside the Finland gameplay boundary. Border-neighbour countries remain ineligible. Coastal cells can be claimed if they intersect the country and were visited; eligibility is not based solely on a cell's centre being land.
- Existing `xy/cell/key` IDs, inventories, claims and gold remain compatible. Legacy cells have 250 map-coordinate units, not equal ground width at every latitude. A future uniform metric grid needs an explicit migration; this iteration keeps IDs and instead computes new GPS distance, bearing, displayed range and accuracy rings geographically. Previously awarded gold and saved mileage are not rewritten. Distance rewards remain 1 gold/250 accepted ground metres plus 1 first personal tile.
- To avoid introducing arbitrary building/sea-centre targets, uncatalogued random discoveries outside the original Jyväskylä area are disabled in dev. National relics have actual path coordinates. The original local generator stays compatible; nationwide dynamic spawns/global visit-density rules remain backlog work.
- Relics supports city/trail/type search, nearest-first distance and batches of 48 rows. Map overview can zoom out to level 4, clusters relics and retains only Me as a map control. Close tile work remains capped at 400 cells.

## Checks

`finland.test.ts` covers all 450 sourced positions, seven types per town, original catalog hash, country/Åland/Lapland and neighbouring-country gates, own-tile captures + save/reload/duplicate prevention, tile eligibility and bounded overlays, metric movement/accuracy geometry and walking gold at different latitudes. Existing GPS recovery/account/claims/progression/map suites remain required for both build variants.

Physical phone checks remain pending: precise GPS across a tile edge in Helsinki, a coast/island tile, and a northern town; collect/reload; earn the first distance coin; claim the visited tile. The existing iPhone screen-lock limitation remains. Source-map tags/boundary simplification cannot guarantee present-day path access or survey accuracy.

No cloud accounts/worlds, global visit sharing, live Garmin sync, new XP earning formula or production promotion is introduced.
