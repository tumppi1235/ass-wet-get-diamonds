# garmin-game development plan

## Current environment: local dev only

The source in this project is canonical for the gameplay prototype. No deployment is configured. A private empty Site was registered during the initial approach, but no code/version was pushed or deployed; this local project has no Site project ID or remote Git connection.

`public/engine.js` contains deterministic world generation, visits, rarity and capture calculations. `public/app.js` handles simulation, watch input, map rendering and browser storage. `public/style.css` handles visual presentation. `tests/engine.test.cjs` checks game rules independently of the UI. `run_local.py` serves only public/ on the loopback interface with caching disabled.

Progress uses the `garmin-game-local-dev-v1` browser-storage key. Its separation from later environments must be retained. Do not use local player state in test/prod automatically.

## Current controls

One tap/click on the watch face, one click on the watch side key, or Enter/E triggers exactly one collection attempt. If moving, simulation stops as part of that action. No countdown, hold, confirmation, or minigame. Odds still apply; a miss uses the outing's attempt for this tile but preserves energy. Holding E does not repeat attempts.

## Later (not provisioned)

1. Define the Garmin implementation: data field within a native activity versus dedicated watch app. Physical key availability depends on this choice; the simulator is not proof that a data field can intercept any chosen watch key.
2. Introduce a test environment with separate state, reproducible seeds, scripted GPS tracks and simulated weather fixtures.
3. Validate the Monkey C implementation in Garmin's official simulator and on Enduro 3: GPS noise, activity pause/resume, input, battery, save/reload, memory constraints.
4. Create production only after those gates, with a deliberate distribution strategy and versioned state migration.

The prototype currently uses personal exploration history, not town-wide visit statistics. Weather is a manual developer control. Location-based collectibles use fixed local-grid coordinates; navigable paths and land access are not modelled. Route clicks use the bundled OpenStreetMap walking graph. See STREET-MODE.md for the two watch screens, vision and routing details.

