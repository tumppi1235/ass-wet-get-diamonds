# Offline route network (TR-094/101)

Development only. This document covers the routing-data foundation. The new
owner-scoped planner/API/map/GPX implementation is in DEV-ROUTE-PLANNER.md; its
publication/field gates remain distinct. This is not a validated Garmin course or
continuous browser activity recorder. Production/player records are unchanged.

## Input and reproduction

`tools/Build-RouteNetwork.py` reads an existing local OSM PBF with pinned
`osmium==4.3.2` under Python 3.12. It verifies the supplied MD5 before creating
output and records the source header, checksum, bytes and extraction policy.
The retained official Geofabrik Finland extract is 774,297,008 bytes, checksum
`5b113c7a2c31d8465eead4a958eab97b`, replication time
2026-10-30T21:24:51Z, sequence 4956. Source data remains ignored, not in Git.

Example from the project root, with a new output name:

```powershell
python tools/Build-RouteNetwork.py --source .tools/finland-source/finland.osm.pbf --expected-md5 5b113c7a2c31d8465eead4a958eab97b --output .tools/finland-routing-dev-1
python tools/Inspect-RouteNetwork.py .tools/finland-routing-dev-1 --database .tools/finland-routing-dev-1.sqlite
python tools/test_route_network.py
node --import ./mobile/node_modules/tsx/dist/loader.mjs tools/Check-MappedRoute.mts .tools/finland-routing-dev-1
```

The Windows bundled Python 3.12 is at
`C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`.
The builder also finds the existing `.tools/osm-python` installation. Graphify's
Python 3.13 cannot load these cp312 native reader extensions. No provider account,
new map service, player coordinates or online routing request is involved.

## Conservative policy `finland-paths-dev-1`

- Foot paths and a restricted subset of quiet roads; bicycle defaults only on
  cycleways/quiet roads, with explicit bicycle permission required on other paths.
  Major roads, construction, private/customer/destination access, driveways,
  indoor/covered/tunnel/area/informal paths, fords and advanced hiking are excluded.
- Mode-specific permission takes precedence over generic access, including node
  restrictions. Unknown barriers require explicit permission. A blocked node
  excludes that entire way for the affected mode; this intentionally loses some
  usable approaches rather than routing through the barrier.
- Conditional/time/seasonal restrictions are not interpreted. Such ways/nodes
  are excluded. Bicycle pushing/stairs are unsupported. Explicit mode direction
  and directional access are retained. Road oneway does not restrict Foot;
  ambiguous oneway on paths/steps is conservatively honoured.
- All member ways of turn-restriction relations are excluded for both modes.
  This is intentionally broader than a full turn-aware router, including cases
  where a restriction only affects motor traffic. Do not remove this exclusion
  until restriction relations are represented and tested in route search.
- No inferred step-free access, difficulty, current access, winter suitability,
  elevation or safety certification. Surface/incline/accessibility evidence is
  retained where mapped, not filled with assumed values.

These are application choices over the documented OSM
[access hierarchy](https://wiki.openstreetmap.org/wiki/Key:access) and
[direction rules](https://wiki.openstreetmap.org/wiki/Key:oneway), not a complete
implementation of all OSM routing semantics or a legal-access guarantee.

## Graph and storage contract

Topology joins only identical original OSM node IDs, never nearby coordinates or
geometric crossings. Missing coordinates reject the way instead of joining the
remaining points. Implausible >20 km coordinate gaps are rejected. Degree-two
compression retains every original ordered geometry point, with cuts at shared
nodes, repeated nodes, way ends, geographic cell transitions and bounded chain
length. Bridges crossing at the same coordinates remain separate without a
shared node ID. Direction masks are Foot=1/Bicycle=2, separately forward/backward.

Intermediates are fresh offline SQLite/node-cache files. Export consists of
0.05° latitude × 0.1° longitude gzip JSON chunks, a SHA-256/size/count manifest,
source provenance and OpenStreetMap/ODbL attribution. Edges crossing chunk bounds
are repeated with the same immutable identity and geometry; duplicates never
create a new connection. Both sizes and coverage must be checked before hosting.
The full graph is not imported into a phone bundle or a Worker module.

The independent read-only auditor checks every chunk checksum/size/identity and
edge coverage, optionally compares every exported edge against the source
database, then reconstructs **every original accepted way** from compressed
chains. A matching endpoint/count alone is insufficient. Malformed, changed,
missing and oversize artifacts fail. No output or source database is overwritten.
The CLI reports progress counts to stderr and uses a bounded 64 MiB offline
SQLite read cache; its final stdout is a separate JSON report. This cache is not
a phone/Worker allocation or new database setting.

## Evidence and remaining scope

Ten tests cover actual pyosmium XML reading, access precedence, node gates,
one-way/roundabout direction, missing nodes, relation exclusions, bends,
disconnected crossings, loops/cell seams, deterministic export, integrity
corruption, rehashed geometry changes and output/checksum guards.
`.github/workflows/route-network.yml` runs them with the pinned reader and publishes
the actual log to a GitHub artifact. Synthetic fixtures are distinct from field
validation and the full country extraction.

`mobile/src/game/mapped-route.ts` adds bounded pure A* over original adjacent
node pairs. It respects separate mode/direction masks, never merges coordinates,
deduplicates chunk edges and rejects conflicting identities/geometry. Start/end
snap to mapped vertices within 100 m; offsets are separate measurements, never
drawn connector legs. Unsupported step-free access, disconnected data, out-of-range
paths and graph/search/geometry caps return unavailable. Segment-level closures
are a required caller responsibility before API use. Search itself makes no
reward/activity/database writes. Six more app tests cover this contract and a
shortest-path detour, including closure intersections with endpoints outside an
area. `routeClosureCheck` validates and snapshots active blocked rectangles and
conservatively rejects any segment bounding box touching one, including exact
boundary contact; start/end windows are tested. The API must supply current
server regions and time, not client-supplied closures. All 137 app regressions,
TypeScript and lint pass locally.

The actual retained-PBF build completed: 2,238,332 highway ways examined,
1,565,822 accepted ways, 19,157,565 geometry-point occurrences, 2,958,005
compressed edges, 12,825 chunks and 272,221,317 compressed bytes. The largest
decoded chunk is 9,213,340 bytes. Its manifest SHA-256 is
`e16d062504f74c74585ac1538654daedac7cb74add4015f4d217bb6c8104e295`.
The generated network/intermediates stay ignored; hosting/reproducible artifact
distribution must be resolved before enabling an API. This cannot be a full
country payload in a phone/Worker request.

The completed independent full audit passes: all 12,825 chunks / 2,958,005 edges
match the source database, SQLite integrity passes and all 1,565,822 original
accepted ways reconstruct exactly. The actual stdout is retained in
[the full-country audit report](evidence/finland-route-audit-2026-11-01.json).
This checks extraction/compression integrity, not whether every mapped access
permission is physically current. The first restricted-access attempt was
interrupted for slow file I/O; only the completed normal-file-access run is
reported as a pass.

Hosting investigation: Cloudflare's documented baseline of 20,000 static files
and 25 MiB per file accommodates this chunk count/size in principle
([official limits](https://developers.cloudflare.com/changelog/post/2025-09-02-increased-static-asset-limits/)).
This does not establish the Sites package/upload allowance, actual account plan,
combined existing-asset count or bounded request CPU/memory. Inspect the existing
ASSETS path and verified package limits before adding another service/binding.

`Check-MappedRoute.mts` independently loads/checks bounded chunks around fixed
public catalog points and exercises the same pure route core. Observed results:

| Public preview | Foot | Bicycle |
| --- | --- | --- |
| Jyväskylä Kirkkopuisto–Harju | 590.43 m / 47 mapped points | 1,194.25 m / 84 points |
| Haukivuori Rantalantie | 807.75 m / 28 points | 807.75 m / 28 points |
| Helsinki first two catalog points | 638.08 m / 55 points | 1,219.89 m / 104 points |
| Rovaniemi first two catalog points | Unavailable in bounded graph | Start not mapped within 100 m |

Helsinki Bicycle starts 51.28 m from the selected Foot-oriented catalog point;
that offset is explicitly separate and no access connector is fabricated.
Rovaniemi's outcome is not proof that no physical route exists outside the loaded
area. These are offline observations, not live-region, GPS, route-access, device
or field validation. They do not start or reward an adventure.
The actual eight observations are retained as
[public preview output](evidence/finland-route-previews-2026-11-01.jsonl).

Follow-up source now includes bounded binary asset loading, an authenticated
zero-write dev API, refreshed region checks, phone route previews, separate
offsets and planned GPX export. See DEV-ROUTE-PLANNER.md for implemented limits,
actual local browser/XSD evidence and remaining hosted/device/field acceptance.
No straight-line fallback is acceptable when the graph is disconnected, and a
planned navigation track is never completed/reward-eligible activity evidence.
