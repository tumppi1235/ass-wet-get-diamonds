# Project knowledge graph — TR-166

Graphify is development tooling for understanding relationships before changing Trail Relics, outside the game bundle. Upstream: [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify), pinned at `a0946f962af31b19bff941b453f6dae9a7077c7a` (0.9.99). Its official package is `graphifyy`; our requirements install the reviewed Git source with pinned runtime dependencies. The official Codex skill is in `.codex/skills/graphify/`, with notices in `docs/licenses/graphify/`. The generated no-op hook is omitted because we use an isolated executable without global agent changes.

## Setup and use

From the repository root, with Python 3.13 and uv:

```powershell
uv venv .tools/graphify-venv --python 3.13
uv pip install --python .tools/graphify-venv/Scripts/python.exe -r tools/graphify-requirements.txt
.tools/graphify-venv/Scripts/python.exe tools/graphify_project.py
.tools/graphify-venv/Scripts/graphify.exe query "tracker tile collection" --budget 1500
.tools/graphify-venv/Scripts/graphify.exe explain GOLD_PER_NEW_TILE
```

On Linux/macOS use `.tools/graphify-venv/bin/python` and `bin/graphify`. Alternatively activate the environment before using `python` / `graphify`. Check existing outputs without rebuilding using `python tools/graphify_project.py --check-only`.

Open `graphify-out/graph.html` for the interactive map. `GRAPH_REPORT.md` describes connected subsystems; `graph.json` supports queries. `release.json` records the source commit, dirty working-tree flag, tool revision, counts and scope. The HTML uses upstream visualization assets and is for developer inspection, outside public game hosting.

The `Project knowledge graph` GitHub workflow builds on pull requests, develop/main pushes and manual runs. It checks integrity and uploads these five files as `trail-relics-knowledge-graph` for 30 days. Download that workflow artifact and open the HTML locally. Game tests and web promotion remain separate workflows; graph generation never deploys the app.

## Principles applied

1. Query relevant relationships before cross-file changes, follow source references and verify the actual code before editing.
2. Distinguish direct `EXTRACTED` evidence from `INFERRED` resolutions. Neither proves correctness. A path in the default undirected graph shows connection, not execution order.
3. Keep canonical backlog/decisions and link stories to source and regression evidence. Planned backend/Garmin/Strava features remain planned.
4. Analyze locally: `extract --code-only --no-dedup` and `cluster-only --no-label` avoid model/cloud graph calls. Exclude tools, secrets, exports, binaries and large map data with `.graphifyignore`. Keep outputs out of Git; share via CI artifacts.
5. Rebuild after code changes; check nonempty output, unique IDs, endpoints, core subsystem coverage, existing sources and excluded paths. Graph checks supplement gameplay and physical-device tests.

## Coverage and limits

Supported source/config languages include TypeScript/TSX, JavaScript, Python, Java and Swift. This index does not semantically index Markdown/media or parse Garmin Monkey C. Some files yield no symbols, including data-only code or anonymous test callbacks. Consult actual files and test reports for these gaps. Highly connected code is a review clue, not an automatic reason to refactor.

The shared dev service adds declared external package nodes and TypeScript `.mjs` import specifiers backed by `.mts` source. Integrity checks distinguish declared dependencies from repository paths and record actual source aliases in release.json. Raw SQL parsing is optional and currently absent; the Drizzle TypeScript schema is indexed, while SQL migrations are verified by real database tests.

Use these explicit document entry points alongside graph queries:

| Area | Source entry point | Rules and evidence |
| --- | --- | --- |
| GPS and recovery | `mobile/src/location/tracker.ts`, `mobile/src/game/adventure.ts` | [P0 report](P0-EXPLORATION-REPORT.md), [tests](TEST-PLAN.md); TR-146/153 |
| Gold, collection, claims | `mobile/src/game/engine.ts`, `resources.ts`, `claims.ts` | [Design](GAME_DESIGN.md), [decisions](DECISIONS.md); TR-019/024/154 |
| Profiles/persistence | `mobile/src/accounts/local-accounts.ts`, `session.tsx` | [Architecture](ARCHITECTURE.md), [compatibility](PRODUCTION-FINLAND-RELEASE.md) |
| National map/relics | `mobile/src/map/region.ts`, `vector-data.ts`, `mobile/src/game/landmarks.ts` | [Finland playtest](FINLAND-PLAYTEST.md); TR-026–030 |
| Delivery/integrations | `.github/workflows/`, `garmin/source/` | [Deployment](DEPLOYMENT.md), [backlog](BACKLOG.md); Garmin prototype is not connected |

Initial verified scan on 2026-10-31: 120 candidate code files, 109 files with indexed symbols, 2,045 nodes, 4,442 relationships (4,190 EXTRACTED / 252 INFERRED). No missing/dangling endpoints. Counts precede integration scripts and change on rebuild. Physical phone tests remain pending independently.
