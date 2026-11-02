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

Privately published as **dev version 31**, runtime revision 2. App source
`cd8015eba1a1cb986fc09115f44090907b658638`; hosting source
`d1ad598f56866b190b995d106898c1adc6a62f84`. All 199 regressions, mobile/server
lint/typecheck, Worker build and four GitHub workflows pass. The refreshed local
structural graph has 3,313 nodes / 8,084 relationships / 286 indexed source files.

## Actual hosted measurements

One browser sample per pair/mode on 2026-11-02. Times include network/database
work and are not CPU timings or statistical performance guarantees. Distances
and MiB below are rounded UI values. Every check reported zero awards.

| Public pair | Foot result / round trip | Bicycle result / round trip |
| --- | --- | --- |
| Rantalantie baseline | 0.81 km / 547 ms | 0.81 km / 457 ms |
| Helsinki dense centre | 0.64 km / 699 ms | 1.22 km / 601 ms |
| Kirkkopuisto → Haukkala | 5.58 km / 951 ms | disconnected / 899 ms |
| Kirkkopuisto → Sippulanniemi | 4.09 km / 827 ms | 4.62 km / 1,911 ms |
| Haukkala → Sippulanniemi | 8.37 km / 768 ms | disconnected / 593 ms |

Eight ready plans and two explicit unavailable cases; maximum observed source
budget 3.53 MiB and four touched cells. Helsinki Bicycle's start offset is 51 m;
all other ready endpoint offsets round to 0 m. Offsets are not traversable
connector guarantees. The two disconnect causes are **not established**: inspect
source topology, mode access and bounded envelope before changing routing.

After reload the displayed profile remained 0 gold / 0.00 km / 0 finds, tile 0,0,
levels 1/1/1, quest stopped. Hosted maintenance remained OPEN revision 0 and
recovery dev-initial-1 ready. No private snapshot was downloaded. The admin tool
is restricted to the existing owner-private dev audience; production remains
public version 10. All 12,825 immutable Finland chunks and 93 retained frontend
files remain. Archive 198,489,854 bytes / expanded 265,960,448 bytes fits both
268,435,456-byte limits. See [release and raw public measurements](evidence/dev31-route-checks-release.json).

This is an increment of TR-094/TR-101, not completion of phone navigation,
10–30 km coverage, source-access investigation or provider CPU/heap profiling.
Physical tests remain pending. Next: investigate the two Haukkala Bicycle
disconnects with the original topology/access rules, then extend longer samples.

Follow-up **dev 32** completed the Haukkala source audit and explicit walking
draft choice, and measured four new longer cases. See [access follow-up](DEV-ROUTE-ACCESS.md)
for the verified source gap and still-open long-route limits; the historical
dev 31 observations above are unchanged.
