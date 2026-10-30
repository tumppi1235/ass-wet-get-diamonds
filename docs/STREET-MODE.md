# Street mode

Run `node run_local.cjs` and open http://127.0.0.1:8000/, or use START-WINDOWS.bat. The Python server remains supported.

Movement follows the bundled connected OpenStreetMap street and walking-path network in central Jyväskylä. Map clicks snap to a nearby street node and find the shortest connected route. Keyboard directions choose street branches at junctions. There is no straight-line fallback when data or a route is missing. Existing positions are placed on their closest street when loading; this relocation earns no distance or energy.

The bundled data covers roughly 62.229–62.253 N, 25.720–25.768 E. Routes outside this area are rejected. Streets and paths exclude explicit private/no access, foot=no, indoor paths and area polygons. Map completeness and access tags may vary.

Watch screen 1 gives a north-up compass bearing and approximate straight-line distance to the nearest visible artefact tile centre. On entering a collectible tile it shows Ready to capture and collection odds. Screen 2 shows the player's tile and eight adjacent tiles, with the player marked by a dot. Switch using the two buttons below the watch. Collection remains available through the side key, collection button or E/Enter; tapping the guidance screen collects when ready.

Artefacts are revealed in adjacent tiles and their rarity remains fixed. Map markers outside current vision are hidden. Common, Rare and Legendary finds have increasing size; Rare uses blue detailing, Legendary gold ornament and glow.

Validation: `node tests/engine.test.cjs` and `node tests/streets.test.cjs`.

Street geometry downloaded on 2026-10-30 from the OpenStreetMap map API. © OpenStreetMap contributors, licensed under ODbL: https://www.openstreetmap.org/copyright . The attribution remains visible on the map. `public/streets-osm.json` is a derived street-only extract; `public/streets.js` builds its connected graph locally, without a remote routing service.
