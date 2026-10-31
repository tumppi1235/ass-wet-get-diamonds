# Third-party components and data

Graphify developer tooling and the project-local skill originate from [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify), revision `a0946f962af31b19bff941b453f6dae9a7077c7a`. Apache-2.0 applies with retained earlier MIT portions; see `docs/licenses/graphify/`. Integration-specific guidance is in `docs/GRAPHIFY.md`. Graphify is not shipped in the game bundle.

`public/streets-osm.json` is a derived street/footpath extract downloaded on 2026-10-30 through the OpenStreetMap 0.6 map API for central Jyväskylä (25.720–25.768 E, 62.229–62.253 N). This repository provides its editable JSON form.

© OpenStreetMap contributors. Street data is available under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). See [OpenStreetMap copyright](https://www.openstreetmap.org/copyright). The data licence is distinct from the application source.

The browser loads OpenLayers 10.6.1 and ol-mapbox-style 12.6.0 from jsDelivr, the Liberty map from OpenFreeMap, and DM Sans / Space Grotesk from Google Fonts. These services are not bundled in the offline Android or Garmin app. Attribution remains visible on the browser map.

See [OpenLayers](https://github.com/openlayers/openlayers), [ol-mapbox-style](https://github.com/openlayers/ol-mapbox-style), [OpenFreeMap](https://openfreemap.org/) and [Google Fonts](https://fonts.google.com/) for their code, data and licences.

Garmin Connect IQ, Android SDK and Java SDK files are not redistributed. Obtain build tools from their official vendors and accept their applicable agreements before building.

The phone map in android/assets/city-map-data.js is another derived ODbL extract from the same four city sections, plus complete OpenStreetMap lake relation 1302994 for Jyväsjärvi. It contains editable geometry and labels, with attribution visible on the phone map. tools/Build-OfflineMap.cjs documents its conversion. The data is bundled on both Android and iOS; neither phone downloads map tiles or uploads GPS.

The React Native map uses the same derived data in `mobile/assets/city-map.json`, with OpenStreetMap attribution visible in its native SVG view. The Expo starter files retain their upstream MIT licence in `mobile/LICENSE`.
