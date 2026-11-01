# Development mapped routes and GPX (TR-094/098/101)

Implementation adds owner-authenticated, same-origin `POST /api/trail/route`,
binary asset loading and a Mapped route section in shared dev Ideas. The current
build uses the complete audited Finland network in DEV-ROUTING.md, not the small
Rantalantie test fixture. Production/local accounts and all player data remain
unchanged. Publication and physical acceptance have separate evidence below.

## Player workflow

Open shared dev → controls → Ideas → Mapped route. Use Me for a fresh accurate
accepted GPS fix, or explicitly choose **Public preview** and a catalog origin.
Search for a public destination, choose Foot/Bicycle, a maximum mapped distance
and access preference, then Plan mapped route. Show route on map collapses the
drawer. The map stays visible; Me remains available.

Gold dashed geometry and start/end markers are a plan. The ordinary recorded
trail remains a separate source above the preview layer. No offsets are drawn as
connector legs: the reported start/end gaps are excluded from route geometry and
distance. Preview never moves the player, starts/stops an adventure, reveals a
hidden appearance, reserves a destination or grants distance/gold/XP/loot. Search
unavailability never falls back to a straight line.

Download planned GPX exports a GPX 1.1 navigation track containing every mapped
route point in order, provenance and OSM/ODbL attribution. XML labels are escaped,
invalid XML control characters removed, WGS84/schema bounds checked and oversized
or unavailable routes rejected. There are no time/elevation/activity/reward
extensions. This is a navigation file, not a provider-importable completed outing.
Native export/distribution and actual watch/course import are not implied.

## Backend and limits

The server reads only the caller's stored state. GPS starts require accepted
accuracy ≤25 m and age <15 s; stale starts are also rejected after loading.
Public previews use only whitelisted catalog IDs. Arbitrary client coordinates,
other owner IDs, URLs, manifests and hidden-spawn IDs are not route inputs.
Current blocked-region configuration is re-read after asset loading, and an
active blocked rectangle touching a segment bounding box excludes that segment.
It is deliberately conservative; the route has a generated timestamp/revision,
not a guarantee that future/real conditions will match it.

Assets use the existing Site ASSETS binding; no new provider, R2 bucket or GPS
disclosure is introduced. The origin is adapted from the incoming request for
Vite compatibility; only generated asset pathnames are fetched. Manifest and each
compressed body must match pinned SHA-256/byte counts. Opaque `.bin` transport
avoids preview servers automatically decoding `.gz` before verification.

Limits: a ±~1 km envelope around endpoints, at most 40 cells, 2 MiB manifest,
4 MiB compressed / 10 MiB decoded per chunk, 16 MiB cumulative decoded data,
30,000 supplied edges / 100,000 point occurrences / 60,000 graph nodes,
100,000 search expansions and 20,000 output points. There is one graph allocation
at a time per isolate; concurrent requests return an explicit retryable busy
result and the slot releases on failure. No country/route/player cache is global.
Input budgets are 0.25–50 km, but dense/long searches can hit resource or envelope
limits. These are reported explicitly; larger-area lazy/compact routing remains
actionable rather than claiming all 50 km routes work. Unknown step-free access
is unavailable; route difficulty, live access and seasonal suitability are not
inferred from a place's terrain label.

## Build and source

Stage-RouteAssets.cjs accepts the complete pinned offline graph from
`.tools/finland-routing-dev-1` or the managed source repository's `route-network`.
It verifies every compressed chunk before staging into generated dev client
assets, preserving exact checksums and attribution. Known superseded gzip-named
outputs are removed only inside that generated target, with a path-bound check.
Unchanged binaries are not rewritten. Prepare-SharedDevHost retains the same full
derived input in managed dev source so provider rebuilds can reproduce coverage.
Neither raw Finland PBF nor the 272 MB derived graph is added to the GitHub
application repo. Without the offline dataset, CI still tests decoding/API using
the exact small fixture and builds an explicitly data-unavailable route service;
that is not evidence of hosted national coverage.

## Verification and remaining acceptance

Automated coverage: real immutable manifest/gzip checks, missing/corrupt/oversize
data, fresh owner GPS and same-origin membership, zero-write snapshots, closure
edits during load, exact closure windows/interior crossings, concurrent busy/error
recovery, independent XML parsing, export bounds, map endpoints and recorded-track
independence. CI explicitly installs Python 3.12 for the XML parser; it uses only
the standard library. `TRAIL_TEST_PYTHON` can select a local Python command.

An actual 28-point / 807.7546 m public Rantalantie GPX passed the official GPX 1.1
XSD using .NET XmlSchemaSet with external resolution disabled. The schema was
downloaded directly from https://www.topografix.com/GPX/1/1/gpx.xsd; its SHA-256 is
9e4d1988b862edbe556305b130f8f6f1b29864fefd0dc02d5dab04ccdd1f34d6.
See the retained planned file and report under docs/evidence/.

Node smoke measurements with a 96 MiB old-space cap returned real Foot routes in
Helsinki and Jyväskylä (about 0.27/0.14 s, 56/47 MB heap after planning). Node RSS
included runtime overhead and is not a Cloudflare isolate-memory proof. Local
Worker/browser Rantalantie preview succeeds with the full staged asset set and
no GPS/adventure/reward changes. Phone-size UI was inspected at 390×844; this is
responsive testing, not a physical iPhone test.

Pending: hosted release/asset verification, fresh physical GPS route navigation,
closure refresh during a real outing, native/fallback full field checks, actual
Garmin/other navigation import, verified difficulty/access, broader routing load
and long/dense-area optimisation. TR-094/098/101 remain In Progress at their full
acceptance scope. This does not solve browser screen-lock GPS or provider sync.

## Publication constraints and current attempt — 2026-11-01

The compiled map paths were synchronized in nine bounded source pushes, retaining
the regular-game route/gold hotfix and the earlier backup trees. The combined
hosting source is `2501521de114994c9c81b27c32eb3f7f27e3f5c7`, built from GitHub
`3bce564` code. All 150 regressions, lint/types and the complete local build pass;
13,737 prepared artifact files were byte-verified, including the hotfix sources.

There are two different hosting limits: **64 MiB per Git push**, and **256 MiB
per uploaded deployment archive**. Splitting source pushes resolves only the
first. The final complete local archive is 315,588,049 bytes; route chunks alone
are 272,221,317 compressed bytes, so deleting unused application files cannot
make that representation fit the input limit. The rejected archive call returned
no saved version or deployment. Do not retry the same oversized upload or remove
country coverage to make it fit.

The supported source-build fallback was accepted for **dev version 23** from the
exact pushed hosting source above. Deployment
`appgdep_6ae6eeb309a08191874127d8dc31d569` is building at this checkpoint; this is
not yet a publication success. Its saved version is
`appgprj_6ae5c02d5c008191b51fda4f4f39c7a5~appgver_1fab1d357dc481918a100c62bb1509a9`.
Continue that deployment, rather than saving another version. Wait for a terminal
result and then test actual hosted binary loading, a public Rantalantie preview,
map overlay and GPX control. Dev version 22 remains the last confirmed live
release; production is version 9. All audience/runtime/database settings must
remain intact. Update: that source-build deployment reached **failed** with the
same 256 MiB archive limit. Version 23 never went live; do not redeploy its
oversized v1 representation unchanged.

## Compact runtime representation

The complete canonical source remains unchanged and audited. Runtime format 2
stores each edge as `[id, way, forwardModes, backwardModes, pointDeltas]`, with
signed integer deltas for node ID and E7 coordinates. Decoding restores the exact
integers; no point or geometry is simplified. The unused cached edge length and
tags are omitted only from the runtime copy: routing recomputes length from the
same coordinates and uses the unchanged mode/direction flags derived from the
full source tags. This does not infer step-free access or relax closure checks.

`Pack-RouteNetwork.py` verifies every source checksum and independently restores
every packed point before completing a manifest. It produced all **12,825**
chunks, covering **3,078,228 edge occurrences / 21,647,462 point occurrences**,
at **176,084,633** compressed bytes instead of 272,221,317. Occurrences include
cell/edge boundary duplication; this is not a new unique-node count. The runtime
manifest is pinned to SHA-256
`74e4c9affb0d880868fb2cfe9f57bf87029c4e1cf7c60ca87ced3201831f9951`
and references the original source-manifest hash. The original database and
source manifests are retained for provenance and reproduction.

Staging verifies both complete datasets and removes only known generated files
under the never-published v1 runtime prefix. It never removes canonical inputs,
Git history, player data or other map files. Managed-source rebuilds can reuse
the checked immutable runtime assets already retained under dist/client/routing;
CI without national inputs continues to report data-unavailable instead of
shipping a partial fixture. Runtime decoding remains subject to the existing
compressed/decoded/point/edge/search bounds. Tests compare real packed fixtures
with canonical geometry and identical Foot/Bicycle results, plus malformed and
overflow rejection. Larger-area lazy routing and physical navigation remain
separate acceptance work.
