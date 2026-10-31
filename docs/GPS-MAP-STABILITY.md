# GPS map stability follow-up — TR-153 / TR-167 / TR-168

2026-10-31 field report: GPS caused screen/text flicker, adventure routes were missing, and explored/claimed tiles were hard to distinguish.

## Repair

- Keep the displayed map/compass at the last validated fix during coarse/jump/speed readings, while reporting the current accuracy and keeping collection disabled. A held display position is never a fresh gameplay fix.
- Keep the last accurate route anchor through a short accuracy dip. Only accurate fixes participate in distance; the existing 30-second gap and walking/jump checks still apply. Long gaps and background recovery start separate segments with no connecting line or invented mileage.
- Do not replace a healthy watcher for ordinary focus events. Replace it after an actual suspension or stale subscription.
- Deduplicate unchanged GeoJSON per source. Keep constantly changing popup distances out of the marker source. Follow the player after movement beyond an 8-pixel camera deadband instead of recentering for tiny GPS jitter.
- Keep GPS text in a fixed-height area, remove per-second age/debug counters and repeated live announcements. Accuracy remains visible; readiness still reflects the latest fix.
- Teal dashed explored boundaries, thick dark-cased gold personal claims, violet other claims, ownership labels, a compact legend and a wider rose route with a cream casing. Apply the same palette to the raster fallback.

No profile keys, tile IDs, saves, claim prices, gold rates, collection accuracy threshold (25m), permissions or background-tracking promises changed. Previously missing route points cannot be reconstructed from coarse fixes.

## Evidence and field gate

`exploration.test.ts` simulates short accuracy dips, stable map position, denied stale collection, preserved walking lines, no long-gap distance, and focus without watcher churn. `vector-map.test.ts` checks independent source deduplication, genuine collection updates and failed-write retry; existing tests cover discontinuity rendering, recovery, rewards and persistence. Run `npm run quality` for both client variants.

Browser visual QA passed at 390×844 using an isolated local profile and the built-in street-following demo, not injected GPS or real player data. The route, dashed explored areas, gold/violet claims, legend and start/stop controls were visible; old local saves and claims loaded. This cannot prove physical GPS quality. iPhone Chrome retest remains pending: walk 500m with alternating accuracy, confirm the marker does not jump on coarse fixes, verify route grows from accurate fixes, collect in the correct tile, lock/reopen, and ensure no line spans the missing-GPS interval.

The export also exposed TypeScript scanning generated minified bundles. `tsconfig.json` now limits checks to application/test/config sources and excludes build outputs; app type coverage is retained.
