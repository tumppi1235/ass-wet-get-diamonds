# Bounded ownership queries — TR-030

Shared development now requests ownership for the visible Finland map window rather than the latest 1,000 claims nationwide. Existing local profiles, stable tile IDs, wallets and the previous-price-plus-one economy are unchanged.

## Behaviour

- The selected/current tile has its own exact primary-key price lookup, independent of map pagination and zoom. A missing or failed price response disables purchase until a successful retry. Server purchase validation remains authoritative under concurrent changes.
- Close views load all claims in the bounded window using stable 100-row cursor pages. Windows contain at most 400 potential tiles at this detail level.
- Wider views return bounded count markers, distinguishing your claims and other claims. These are points, not ownership polygons: an entire coarse block is never painted as one claimed tile. Tapping a group in the web vector map zooms in.
- View requests debounce for 300ms, refresh every 30 seconds while visible and on foreground recovery, and cancel obsolete requests. Quantized window identity avoids new reads for each GPS frame. Price/map refresh does not restart the GPS sender or change its persisted pending-event journal.
- The old unbounded endpoint remains a clearly truncated latest-1,000 compatibility response for older open clients; the new UI does not use it.

## Data and compatibility

Append-only migrations 0006/0007 add nullable derived grid coordinates, a spatial lookup index and a partial pending-coordinate index. Each map request fills at most 500 valid older rows without changing price, owner, timestamp, player revision or gold. An indexed-plus-legacy fallback query keeps unindexed claims visible while that bounded backfill progresses. Newly purchased claims write the derived coordinates atomically with the existing economy transaction.

Snapshot schema 7 covers these fields. Offline recovery still accepts known schemas 5 and 6 and applies only the matching migration prefix; unknown schemas and incomplete column coverage are rejected. Applied SQL migrations are never edited or replayed.

## Verification and limits

The full suite passes 110 cases, including exact lookup outside a 1,000-row subset, 700-row unfinished legacy indexing, multi-page client/server completeness, 1,600 grouped claims with negative coordinates and independent owner totals, wrapped map views, abort/authentication/input guards and schema-5 recovery. Mobile/server typecheck and lint, full Expo/Worker builds and the local structural graph pass. The actual previously downloaded 52-row QA snapshot also restores to a new ignored offline file with integrity checks and no hosted write.

Local browser QA loads the map and shows the correct exact 1-gold unclaimed price, disabled for an unvisited tile. No GPS permission, real purchase or player-state rewrite was used in this check. Synthetic SQL fixtures cover positive ownership cases; national production-scale performance, physical iPhone movement and fallback/native visual validation remain pending. At broad zoom the database still aggregates matching claims; a bounded output is not proof of constant database work or a national load-test pass.
