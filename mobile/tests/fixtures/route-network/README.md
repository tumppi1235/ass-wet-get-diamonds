# Canonical public map fixtures

The exact audited Finland manifest and two Rantalantie chunks from the
2026-10-30T21:24:51Z Geofabrik/OpenStreetMap extract. © OpenStreetMap contributors,
ODbL-1.0; provenance/license/checksums are in manifest.json. These are public map
coordinates, not player GPS or recorded activities.

Fixtures only exercise decoder/API contracts. They are never staged as runtime
coverage. Stage-RouteAssets.cjs accepts the complete pinned national network or
leaves the route service explicitly unavailable. Hosted files use opaque .bin
names with these exact gzip bytes to avoid HTTP automatic .gz decoding.
