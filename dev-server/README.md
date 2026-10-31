# Trail Relics shared development service

Official Sites Vinext starter adapted as the isolated dev Worker and separate admin client. Game UI remains the Expo application. See [shared dev architecture](../docs/SHARED-DEV.md) and [continuous execution](../docs/DEV-CONTINUATION.md).

Install with the Sites dependency helper (or `npm ci` here and in `../mobile`). Build from the repository root using `node tools/Build-SharedDev.cjs`; the script exports the dev game into ignored `game-export/` and builds this Worker. `npm run lint` and `node node_modules/typescript/bin/tsc --noEmit` check server source.

Runtime bindings: `DB`, `ASSETS`, `TRAIL_ENV=development`, and the platform owner's `TRAIL_ADMIN_EMAIL` configured through Sites. Never put runtime values or local databases into Git. Existing private dev project identity is retained in `.openai/hosting.json`; do not use this project/configuration for production.

`db/schema.ts` defines Drizzle schema. Generate append-only migrations with `npm run db:generate`; never rewrite applied SQL or metadata. Local Wrangler commands use `--local`, `dist/server/wrangler.json` and `.wrangler/state`. Hosted Sites deployment applies schema migrations separately.

For loopback browser QA, `npm run dev -- --port 5173` preserves the starter's development-only sign-in simulation. Untracked `.dev.vars` may set `TRAIL_ENV=development` and fake local admin identity `seedy@sites.test`. `/signin-with-chatgpt?return_to=/shared` signs in as the synthetic `local_seedy` in this local mode only. These fake identities never enter the hosted database or production build.

The maintained `scripts/vite/sites-vite-plugin.ts` and connector-context lifecycle from the starter are retained with their upstream licence. Unused starter UI examples/components were removed. No external integrations are enabled by retaining the host's connector lifecycle.
