# Trail Relics

Read `docs/README.md`, `docs/BACKLOG.md`, `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` before major changes. Read `mobile/AGENTS.md` for Expo work.

- Use the existing source layout. Extract packages incrementally; do not reorganize working applications just to match a proposed directory diagram.
- Link work to a story ID and acceptance criteria. Preserve IDs and explicitly mark superseded/deferred designs. Do not call a planned system implemented.
- Prioritize TR-153/TR-154 and browser recovery regressions. The user explicitly authorized continued dev work while physical validation waits (2026-10-31), including shared dev services and configurable experimental rewards. Keep physical tests pending; continuous iPhone browser background GPS is unsupported and missing distance/routes/rewards must never be fabricated.
- Preserve passwords, inventories, gold, claims and saved progress. Keep existing 250m tile IDs compatible until a tested geographic migration is approved.
- Keep gameplay rules in shared modules. Separate spawning, detection, collection, physical boss victory and loot. Record rule changes in DECISIONS.md.
- Treat local profiles and the public web playtest as the current implementation. Shared accounts/worlds, separate production services and Garmin sync are future work until built and tested.
- Verify current provider/API capabilities in official documentation before implementing integrations. Minimize location-history retention and exclude credentials and raw user discussions from Git.
- Run relevant regression tests plus lint/typecheck for code changes. Update backlog evidence and known limits. Documentation-only changes do not require deployment.
- Use the existing authorized hosting/release workflow. Preserve audience and player data; never silently create a new production environment or migrate real users into test data.

## graphify

Build the local structural graph with `python tools/graphify_project.py` using `.tools/graphify-venv/` (see `docs/GRAPHIFY.md`). Generated output is ignored and shared as a CI artifact; it may not exist in a fresh checkout.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- When a current graph exists, use scoped `graphify query`, `path` and `explain` for relationships and change impact, then verify relevant source lines. If missing, stale or incomplete, use source searches and rebuild; never let graph coverage block fixes.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run the project build/check command to refresh both graph and report. Code-only mode and `--no-label` avoid model calls even when API keys exist.
- Keep EXTRACTED evidence separate from INFERRED relationships. Connectivity is navigation evidence, not proof of correctness, completed stories or passing device tests. DECISIONS.md and BACKLOG.md remain authoritative; semantic document/media indexing and Monkey C are outside this index.
- Preserve tool pins, exclusions and CI provenance. Do not add Graphify to the phone bundle, upload source to a cloud graph service or enable global hooks/settings during routine development.
