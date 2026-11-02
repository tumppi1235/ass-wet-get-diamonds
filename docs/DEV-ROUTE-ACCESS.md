# TR-094 / TR-101: route access follow-up

2026-11-02, development only. Production remains version 10.

The Haukkala failures are reproducible in the pinned canonical source, before
any lazy-loading envelope or hosted timer is involved. Nearest Bicycle node
2372433774 is 5.968 m from haukkala-gate. Its entire directed Bicycle component
has five nodes on Varpushaukka (way 24331253); the incident connections to the
wider network have Foot-only flags in policy finland-paths-dev-1. In particular,
footway 228572859 links toward cycleway 57870082. Source manifest SHA
e16d062504f74c74585ac1538654daedac7cb74add4015f4d217bb6c8104e295 and chunk
1245_256 SHA 94374aceb6521ef56a32dc5fa561ebbbf5cf2fa96268f9c741380007c0d80d71
are verified by `tools/Inspect-HaukkalaAccess.py`. The component is entirely
inside the audited cell, so no unexamined boundary connection is assumed.

This is a property of the retained conservative routing graph, **not a claim of
real-world legal access**. The policy excludes footways/paths from cycling unless
their source permits it. No policy, geometry, nearest-node snap, topology,
closures, source assets or allocation limits have been changed to force a plan.

Players with a disconnected/unmapped Bicycle plan can explicitly choose Foot
for that route draft. It preserves origin/destination/budget and clears the old
plan. A separate press of Plan mapped route is required. The activity's selected
travel mode, accepted GPS history, rewards and progress remain unchanged.
Step-free, budget, data and busy failures do not offer this mode change.

Two new fixed admin cases cover a public trail about 19 km from Kirkkopuisto and
Helsinki → Espoo. Tests include unchanged real Haukkala source geometry in both
eager/lazy solvers and the explicit draft-only retry.

## Release and actual hosted checks

Privately released as **dev version 32**, runtime revision 2. App source
`0fac9a11e2a95327b80847b3d3d3bc98063ab214`; hosting source
`cc558520dcb2f793849db223bea2aa1b8372e56a`. All **201** regressions, mobile/server
lint/typecheck, Worker build and four GitHub workflows pass. Structural graph:
3,322 nodes, 8,115 relationships and 288 indexed source files.

Actual player UI: Kirkkopuisto → Haukkala / Bicycle / 50 km budget returned
disconnected and showed the walking choice. Choosing it cleared the old result,
preserved the public origin/destination and awaited a separate planning press.
That press returned a **5.58 km Foot plan**, with displayed ceil offsets 1/0 m.
The mode choice, clearing and second request were all observed in the hosted UI.

| New fixed pair | Mode | Hosted outcome | Browser round trip | Cells | Source budget |
| --- | --- | --- | --- | --- | --- |
| Kirkkopuisto → long public trail | Foot | disconnected | 2,224 ms | 7 | 3.51 MiB |
| Kirkkopuisto → long public trail | Bicycle | end-unmapped | 562 ms | 2 | 1.56 MiB |
| Helsinki → Espoo | Foot | graph-limit | 1,455 ms | 2 | 4.76 MiB |
| Helsinki → Espoo | Bicycle | graph-limit | 4,152 ms | 6 | 12.95 MiB |

These are **unavailable coverage cases**, not successful long routes. All four
returned zero awards; counters/time remain source-budget/browser observations,
not peak heap/Worker CPU evidence. The urban cases establish the next profiling
target; the individual graph guard causing their limit has not been measured.
The long trail's disconnect cause has not been audited. No access or resource
limit was relaxed. A delayed browser-automation wait on the urban Bicycle case
was followed by a fresh read of its completed graph-limit result; it was not rerun.

After reload the displayed profile stayed 0 gold / 0.00 km / 0 finds, tile 0,0,
levels 1/1/1, quest stopped with Foot selected. Hosted maintenance remains OPEN
revision 0, recovery dev-initial-1 ready, dev audience owner-private. No private
snapshot was downloaded. Production remains public version 10.

All 12,825 immutable Finland chunks and 95 supported frontend files remain.
Archive 198,802,322 bytes / expanded 267,146,240 bytes fits both 268,435,456-byte
limits. See [raw public evidence and canonical audit](evidence/dev32-route-access-release.json).
Physical navigation, source updates, long-route coverage and provider CPU/heap
validation remain open. Next: identify the constrained graph guard and improve
bounded long-route planning, preserving current permissions and retained assets.
