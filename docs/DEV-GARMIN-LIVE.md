# Live Garmin collection and boss notification foundation

2026-11-02 — TR-021/025/136/155/157/158. The user selected **live collection and
notifications**, including boss tile visited / boss fightable, rather than saved
activity imports. This is development source, not a working paired watch release.
The hosted dev game remains v32; production remains v10. No account, game data,
audience, provider registration, public ingress or native phone installation changed.

## Implemented

The normal-activity data field registers Garmin phone-message callbacks and has
a bounded BLE sender. It starts **UNLINKED DEV**; there is deliberately no raw
incoming message that can authorize its own account link. The authorization seam
is only for a future authenticated companion with explicit local consent. No
cookie, password, Sites bypass token or HTTP endpoint is placed on the watch.
Wire protocol 1 is development-only. Its times are Unix **seconds**, matching
Toybox.Time, and not JavaScript millisecond timestamps. Each link has its own
monotonic event sequence; the app ID is the separate dev data-field manifest ID.

Four queued observations are sent per stable batch. The pending batch is saved
before sending and reused on retries. Success of Communications.transmit is only
delivery status: it never deletes records. Only an exact link/batch/sequence
prefix receipt with status `stored-unverified` removes that prefix. Newer events
stay queued, duplicate/foreign receipts fail, failed storage preserves the prefix,
and missing/failed callbacks retry with a 30–300 second capped delay. The existing
64-record saturation guard and manual-LAP-only collection intents remain.
Same-activity intent history is stored separately from the delivery queue, so
acknowledging and revisiting a tile cannot re-queue its manual capture intent.
History is bounded to 64 distinct intent tiles per activity; reaching it shows
INTENT HISTORY FULL and refuses additional manual intents without forgetting old
ones. It does not stop Garmin's activity recording or generate collection success.
Unacknowledged records are bound to their link; switching accounts cannot send
that queue to a new link. Account switching/reconciliation remains future work.

The watch receives at most eight boss summaries, bound to a link, current SDK
activity ID and increasing feed revision. Feeds expire within 120 seconds.
Nearby/current-tile observations show **BOSS TILE / SYNC NEEDED**; a separate
server-confirmation receipt is required for **BOSS FIGHTABLE**. Short layouts use
BOSS TILE / BOSS READY. Text is recomputed from current validity, so it disappears
on pause, poor/stale observations, activity mismatch or lease/feed expiry.
Optional short vibration uses Garmin capability checks. Per-activity/boss/status
deduplication is bounded to 16 entries and persists across field reloads; a full
history does not reset itself and repeatedly notify. Local boss-tile intents
are observations, not arrival acceptance, encounter activation or rewards.

`mobile/src/integrations/garmin-live.ts` supplies the matching 4 KiB dev wire
validator and companion adapter seam. It binds device/app/link, rejects unknown
fields, sequences and cross-environment packets, waits for a durable storage
receipt before acknowledging, and suppresses late receipts after revocation.
It sends leased ordered boss feeds but implements neither server readiness nor
credential authentication itself. A native SDK adapter and durable/idempotent
server sink must be plugged in; no production caller or browser Bluetooth exists.
An already dispatched packet cannot be recalled; short receiver leases remain
necessary. A receipt ID is a correlation field, not a cryptographic attestation.

## Important boundaries

Garmin QUALITY_GOOD is not the browser's metre-accuracy gate or proof of fresh
hardware GPS. No watch observation enters browser activity receipts, grants XP,
gold/artefacts, satisfies boss effort/arrival or settles victory in this increment.
Manual collection remains an intent pending authoritative eligibility/loot checks.
Server-confirmed readiness must come from the future authenticated backend after
those checks; do not synthesize it from a tile or a storage acknowledgement.

The private dev Site still uses platform browser identity. Direct watch requests
cannot use that browser session. The next milestone must choose a supported
authenticated native companion or HTTP ingress without making the dev world
public or embedding platform credentials. The existing source has **no live
authorization caller**, so observations remain on the watch until this is built.
Only foreground data-field communications are targeted; hidden/background field
delivery and haptics need actual device validation.

## Verification

Six executed TypeScript tests cover bounded messages, foreign devices/apps/links,
exact receipts, durable-storage failure, in-flight revocation, feed revision/
expiry, and provisional tile versus confirmed readiness. The application suite
now has 207 passing regressions, plus mobile lint/typecheck. No private activity
or real device data was used. Structural Graphify coverage excludes Monkey C;
its relationships are not watch execution evidence.

Both generic release-mode and test-source Monkey C builds succeed using the
installed official SDK 9.3.0, with only the missing Enduro 3 profile warning.
Four Monkey C test functions cover lifecycle, prefix receipts, notification
deduplication/expiry and transport callbacks/backoff. **They compile but have not
executed.** The actual target build still reports `Invalid device id specified:
enduro3`. Generic outputs are explicitly named GENERIC-NOT-INSTALLABLE and must
not be installed on a watch.
The [recorded local evidence](evidence/garmin-live-foundation.json) includes exact
generic artifact hashes, check outcomes and the outstanding target-build failure.

```powershell
./garmin-datafield/build.ps1 -SourceOnly -Tests
./garmin-datafield/build.ps1 -SourceOnly
```

Next: authenticated account/device pairing and revocation, durable unverified
observation storage, real native SDK or HTTP transport, then server reconciliation
and deduplication with phone adventures. Obtain the Enduro 3 device profile, run
the Monkey C tests in its supported simulator, inspect small/round layouts, and
perform real normal-activity/pause/lap/reconnect/expiry tests before enabling
collection or boss-ready assertions. The iPhone installation/transport path is
being clarified with the user; saved FIT imports are not this selected path.

## Official documentation checked

- [Communications](https://developer.garmin.com/connect-iq/api-docs/Toybox/Communications.html):
  foreground data fields from API 5.0; phone messages and BLE transmit callbacks.
- [ConnectionListener](https://developer.garmin.com/connect-iq/api-docs/Toybox/Communications/ConnectionListener.html):
  delivery completion/error are transport callbacks, not game acceptance.
- [Attention](https://developer.garmin.com/connect-iq/api-docs/Toybox/Attention.html):
  data-field vibration and device capability checks.
- [Connect IQ SDK / native companion SDKs](https://developer.garmin.com/connect-iq/sdk/):
  Android and iOS integrations require their supported native environments.
