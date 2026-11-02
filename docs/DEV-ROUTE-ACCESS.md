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
eager/lazy solvers and the explicit draft-only retry. Hosted measurements and
release evidence will follow after publication. Physical navigation, source
updates, long-route coverage and provider CPU/heap validation remain open.
