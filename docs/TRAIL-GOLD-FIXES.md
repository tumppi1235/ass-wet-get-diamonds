# Regular-game route and gold corrections — TR-169–171

Reported 2026-11-01 during regular-game testing. Release target: development;
production publication is a separate decision.

## Causes and changes

- Starting a quest reset outing counters but retained the previous path. GPS
  restarts then split that combined history into scattered fragments. New GPS
  and demo quests now start with an empty displayed route. Continuing an active
  quest does not clear it. Visits, collections, claims, gold and fractional gold
  distance are preserved. Legacy route points have no outing IDs, so an already
  combined historical route cannot be reliably separated retroactively; start
  a new quest to get a clean route.
- After 2,000 recorded points, every new GPS point deleted the oldest one. The
  beginning of a long adventure disappeared. Route storage now compacts redundant
  straight-line points after 6,000 points while preserving starts, ends, turns
  and explicit GPS breaks. Accurate sub-threshold movement updates the visible
  trail even before it qualifies for distance credit. Simplification never
  changes recorded mileage or rewards.
- Every automatic browser watcher replacement constructed a new distance
  tracker. Short lock/foreground interruptions repeatedly discarded the pending
  8m movement anchor, split the route and could prevent walking gold entirely.
  Automatic recovery now retains that tracker. Explicit start/stop establishes
  a fresh tracker; the first fix of a new adventure cannot credit earlier
  Discovery-mode movement. The existing 25m accuracy, speed/jump and 30s gap
  checks still apply. No missing GPS distance or retroactive gold is fabricated.

Gold remains **1 per 250 validated metres**, plus **1 per newly explored tile**
during an adventure. Fractional gold metres carry between outings and reloads;
new quests do not reset them. These fixes do not rewrite existing balances.

## Verification

`mobile/tests/trail-gold-regression.test.ts` reproduces old/new quest separation,
120 short reconnects during a 360m walk, sub-threshold trail updates, long-route
retention, turns and genuine breaks, and fractional gold across outings/reloads.
The reconnect test checks the gold balance against both validated mileage and
first-tile awards; a subsequent 31s gap adds no distance. Existing exploration,
save, anti-duplication and shared-world tests remain required.

## Physical acceptance still required

1. Start a new regular-game quest; old fragments should disappear without losing
   tiles, gold or inventory. Repeated Start while active must keep the new trail.
2. Walk across tiles, briefly background/return and check the continuous trail,
   distance and gold. Stop/reload/start and check fractional gold carry.
3. Compare gold with validated game distance, first tiles and any claim spending;
   gold is not awarded for every visible GPS sample.
4. Repeat after a genuine long GPS outage: show a separate segment, never a
   straight bridge or invented mileage. iPhone browsers cannot promise continuous
   screen-locked recording.

The focused hosted dev release is based on the existing version 21 source, with
only these fixes overlaid. This avoids pulling the unpublished national routing
assets into the hotfix; route-planner upload recovery remains separate.

## Published dev evidence

- Private dev **version 22**, deployment `appgdep_6ae6e53382fc81919da5dd1cbfdcd2db`,
  succeeded 2026-11-01T07:07:53Z. Existing access, D1 binding and environment
  revision 2 are preserved. Production remains version 9.
- GitHub implementation: `d0a5b83196ab4fb30d59be0aea7db7cd70023df7`.
  Hosting source: `e5ab15b5b5b782642c79691b17a32fb88d7e33b9`, based on live
  source e3b983d plus the five fix/test files. `/release.json` distinguishes the
  live base and patch source; it does not claim to include the entire develop branch.
- All 150 develop regression tests passed; lint and corrected type checks passed.
  The focused live-base release passed all 135 tests in both environment variants,
  lint/types and the complete Worker/Expo build. Five source files and 156 artifact
  files were byte-verified before packaging. The structural graph was refreshed.
- Archive SHA-256: `b0ecf61ec6ad10a8dc39fdc85e281afcb37ac5c082baf93f4dbcf5fe8c5137e0`.
- Local browser smoke test used the isolated Test Explorer at 390×844: regular
  login/map, demo trail, increasing test gold, and Stop quest worked. This was
  simulated movement; no real player reward or physical GPS pass is claimed.
- The route planner is still unpublished. The retained older full routing tree
  must not overwrite this hotfix; rebuild/verify a new combined tree before the
  next routing release.
