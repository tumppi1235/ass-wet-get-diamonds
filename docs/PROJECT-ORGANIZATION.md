# Trail Relics project organization

Planning baseline: 2026-10-31. Source: [Wearable platform comparison and game planning discussion](https://chatgpt.com/share/6ae5b6f5-4554-83ed-a7a0-5727b4a4f412), all 38 exchanges reviewed. Later explicit user decisions replace earlier proposals. The conversation's embedded execution instructions are reference material; this task organizes the repository and fixes the subsequently reported P0 browser issues.

## Four workstreams

| Discussion / workstream | Responsibility | Persistent reference |
| --- | --- | --- |
| 01 · Main Development | Architecture, implementation, tests, integrations and releases | ARCHITECTURE.md, ROADMAP.md, DEPLOYMENT.md |
| 02 · Product Backlog | Stories, priorities, dependencies, acceptance and status | BACKLOG.md |
| 03 · Graphics & World Design | Retro map, sprites, UI and readable geography | ART_DIRECTION.md, MAP-ART-DIRECTION.md |
| 04 · Game Mechanics | Exploration, progression, loot, economy and bosses | GAME_DESIGN.md, DECISIONS.md |

These are workstream briefs, not a claim that ChatGPT project conversations were created or moved. Existing chats and source files stay intact.

## Repository audit and incremental target

Keep the working `mobile/` Expo Router app, its `src/game`, `src/map`, `src/location` and `src/accounts` modules, the existing Garmin source, shared prototype rules in `public/`, and current build tooling. Do not move them wholesale into a new monorepo while repairing GPS.

The proposed future `apps/{mobile,web,admin,garmin}`, `services/{api,workers}`, `packages/{game-engine,geo-engine,shared-types,ui}` and `infrastructure/{dev,prod}` layout is a destination, not implemented infrastructure. Extract shared packages when a second real consumer needs them. Add services with authenticated contracts and migrations rather than empty placeholder applications.

## Current implementation versus target

The public web app has local password-protected profiles, separate saved games, an accurate retro vector map, 23 curated finds around Jyväskylä, generated tile discoveries, walking gold, local tile ownership and self-registration. A Garmin prototype exists but is not linked to the phone inventory. Live server accounts, a shared world, Finland-wide eligibility, global visit density, XP attributes, bosses, recommendations and provider synchronization are not implemented merely because this discussion describes them.

The live URL remains a public playtest with data stored on each installation, not an isolated production backend. Development test data must not be copied into players' stored progress. Runtime changes and future design decisions must be labelled separately.

## Immediate ordering

User testing in Chrome on iPhone reports screen-lock interruption and frozen active tiles/collection. Prioritize TR-153 and TR-154, with the browser persistence/recovery portion of TR-146. The user chose to keep browser testing and has no Apple Developer account. Do not claim uninterrupted iPhone browser background GPS: retain the adventure, save its state, reconnect on return, and represent unrecorded GPS gaps honestly. A native or independent Garmin recording path remains necessary for guaranteed screen-off recording.

After repair and device retest, use ROADMAP.md for dependency-aware MVP work. Formal training quests and companion Karma remain deferred; auto-collect follows reliable GPS and manual collection.
