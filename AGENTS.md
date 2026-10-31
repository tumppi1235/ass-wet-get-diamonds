# Trail Relics

Read `docs/README.md`, `docs/BACKLOG.md`, `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` before major changes. Read `mobile/AGENTS.md` for Expo work.

- Use the existing source layout. Extract packages incrementally; do not reorganize working applications just to match a proposed directory diagram.
- Link work to a story ID and acceptance criteria. Preserve IDs and explicitly mark superseded/deferred designs. Do not call a planned system implemented.
- Fix TR-153/TR-154 and the browser persistence/recovery portion of TR-146 before adding collection features. Continuous iPhone browser background GPS is unsupported; do not fabricate missing distance, routes or rewards.
- Preserve passwords, inventories, gold, claims and saved progress. Keep existing 250m tile IDs compatible until a tested geographic migration is approved.
- Keep gameplay rules in shared modules. Separate spawning, detection, collection, physical boss victory and loot. Record rule changes in DECISIONS.md.
- Treat local profiles and the public web playtest as the current implementation. Shared accounts/worlds, separate production services and Garmin sync are future work until built and tested.
- Verify current provider/API capabilities in official documentation before implementing integrations. Minimize location-history retention and exclude credentials and raw user discussions from Git.
- Run relevant regression tests plus lint/typecheck for code changes. Update backlog evidence and known limits. Documentation-only changes do not require deployment.
- Use the existing authorized hosting/release workflow. Preserve audience and player data; never silently create a new production environment or migrate real users into test data.
