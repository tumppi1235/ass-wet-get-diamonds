# Development progression laboratory

TR-058/081/085/086/089/090/091/095/127. Dev only; final balance and unsupported evidence sources remain open.

The protected balance editor now controls the shared quadratic coefficient, initially 25, with the existing immutable configuration revisions and before/after audit. Changing the curve changes displayed levels from unchanged earned XP; it never converts old gold/distance into XP. Older configurations without the new field read as coefficient 25. Character, quest summaries, descriptive archetypes and player inspection use the active dev coefficient. Production/local curve configuration is untouched.

The admin laboratory plots levels 1–20 and shows exact thresholds. Draft edits preview immediately. Protected balance history can copy previous values into the draft; saving creates a new audited revision rather than rewriting history. Existing wallets, inventory and earned XP are preserved.

Accepted server events and estimates share `reward-rates.ts`. Estimates accept assumed physical metres, unique tiles, regional blocks, finds and explicit Foot/Bicycle; they display all six XP totals, leaving Power/Fellowship zero until those sources are supported. Geographic XP is full for both modes; equivalent Endurance effort follows the configured factor. No recommendation completion bonus is added.

The four-week comparison replays 12 casual, 20 regular and 32 highly active synthetic activities for each movement category. Inputs are displayed, not inferred from a real person. Replay preserves fractional effort, unique tile/region/find identity and event idempotency; changed duplicate payloads are rejected. Both aggregate estimates and chronological histories make zero database writes. These are balancing tools, not physical activity verification or final fairness approval.

Evidence: local browser draft coefficient 25→100 updated chart thresholds and six scenarios; copying historical revision 1 restored the draft without saving; 2km/8 tiles/1 block/2 finds estimated 48/0/3/8/20/0 XP under the local test balance (tile XP 6). SQL/API tests verify curve history authorization, old config defaults, immutable edits, unchanged earned XP and production defaults. Pure tests compare actual accepted Foot/Bicycle reducer evidence with estimates and prove history dedup/fractional carry. Full quality currently has 75 regressions; physical GPS/compass acceptance remains pending.

Player tools/journal at GitHub 66e91ad deployed successfully to the same private dev Site, managed source 9225efbe6f1ec8d6c4374cba078a2811c8e10cc5, saved version appgver_2e0ccc3c9f788191bea12df6e6a16ab6. GitHub runs 41219787278/41219787369/41219787270 succeeded. No production deployment or audience change.
