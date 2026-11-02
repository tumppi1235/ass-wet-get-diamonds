# TR-094 / TR-101: bounded public route checks

2026-11-02. Development only; production stays at version 10.

The dev admin page has a manual public-route diagnostic. Five fixed catalog pairs
cover a Rantalantie baseline, dense Helsinki and cross-city Jyväskylä paths.
Foot and Bicycle use the same authenticated planner, current closure rereads,
immutable Finland source, geometry and allocation limits as ordinary planning.
One request runs at a time per Worker isolate. There is no benchmark batch loop,
arbitrary-coordinate input, GPS lookup, activity submission or reward write.

Each result reports browser round-trip time, touched cells (including empty
probes), cumulative decoded-source budget considered (including the first chunk rejected
at that budget limit), asset request count, route
distance/point count/endpoint offsets or an explicit unavailable reason. Results
live only in admin page memory (latest 20); they are not stored against players.
Do not interpret source bytes as peak heap or browser time as Worker CPU time.
Cloudflare limits timer advancement during computation; see its official
[timer documentation](https://developers.cloudflare.com/workers/runtime-apis/performance/).

Unchanged bounds: 80 touched cells, 32 MiB cumulative decoded source, 30,000
edges, 100,000 point occurrences, 60,000 nodes, 100,000 search expansions and
20,000 returned points. No inferred shortcuts, access permissions or difficulty.
The endpoint is unavailable in production and requires an admin plus same origin
in dev. Full SQLite snapshot comparisons cover success/failure and denied access.

Hosted measurement evidence will be appended after publishing and actual checks.
This is an increment of TR-094/TR-101, not completion of phone navigation,
long-route coverage or provider CPU/heap profiling. Physical tests remain pending.
