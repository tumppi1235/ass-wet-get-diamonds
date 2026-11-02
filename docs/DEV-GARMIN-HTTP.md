# Garmin Connect HTTPS relay and automatic training quests

2026-11-02 — dev-only TR-025/136/156/157/158. User setup: **iPhone and Windows**.
The user also requires starting a training to start its quest automatically.

## Implemented software

The data field uses Garmin Communications.makeWebRequest through Garmin Connect
or supported Wi-Fi. No custom iPhone companion is required for this transport.
The URL is pinned to the existing dev origin. Its dedicated 96-character watch
key is never a browser cookie, password or Sites bypass credential. Settings
explain queued-location sharing. Blank/invalid settings send nothing. Settings
changes revoke the receive lease and reload the key.

A key is probed without observations before an unbound queue is associated with
it; a mistyped/rejected key cannot strand that queue. A valid versioned response
from the pinned HTTPS endpoint grants a ten-minute receive lease. Four-event
pending batches, exact stored-unverified receipts, queue ownership, manual-intent
history and retry/backoff protections remain. Rejected authentication holds the
queue until settings/reload; network or disabled-service errors retry without
dropping observations.

The dev server implements browser/platform-authenticated admin issue/list/revoke
for **own** watch keys. Issuance requires queued-location consent and a request
ID; at most two active keys per owner expire after 30 days. The secret is returned
once; only its hash is stored. Lists/audits exclude secrets and locations.

Token-only POST `/api/trail/garmin/sync` never accepts browser identity as a watch
credential. Production rejects it. Watch keys cannot access ordinary game/admin
APIs. Atomic storage uses canonical batch hashes, exact retries, strict sequence
continuity, revocation CAS and maintenance/tester/recovery fences. Keys are bound
to the recovery generation and need re-pairing after recovery. At 128 unverified
batches per link, new observations are refused without acknowledgement or silent
deletion. Nearby unblocked public boss feeds have at most eight entries and emit
only `nearby`: unverified samples never produce `fightable`, captures or rewards.

Namespaced `trail_configs` documents store links/quest state; `trail_events` kind
`garmin-observations` stores unverified batches/receipts without browser activity
ID/time columns. Accepted browser receipts stay separate. Complete protected
snapshots already include these tables; no schema/table migration or player-state
rewrite occurs. Raw routes remain private backup data, not GitHub evidence.

## Automatic training → quest

A new SDK training queues its start once, with SDK start time. Pause/resume retain
the activity identity and emit explicit events. Successful sync automatically
creates an owner/link/activity-bound **Garmin quest shell**. Repeated deliveries
or starts do not duplicate it; pause/resume keep its ID. A new training creates
a new ID. Timer reset marks it ended-unverified, awaiting saved/discarded proof.

The shared dev app reads owned watch quest status, labels active/paused Garmin
quests, explains watch recording controls and preserves the shell on sync delay.
It starts no phone GPS watcher and preserves an existing phone recording. Phone
Start quest is disabled while an observed watch quest is active/paused. Displayed
status is scoped to the current account. Effort, captures and rewards still await
validation; cross-source reward reconciliation is not completed here.

## Private hosting boundary — deliberately not enabled

The dev runtime has no `TRAIL_GARMIN_HTTP_ENABLED=1`; sync and key issuance remain
disabled. Setup UI is available for review. No real key, pairing or observation
was created during QA. No audience change is part of this increment.

An anonymous check of the existing dev endpoint returned **401 HTML without a
redirect**, confirming that the private platform gate blocks watch access before
application authentication. A flag change alone cannot fix that gate. Before
enabling traffic, select/review a supported publicly reachable authenticated
ingress while preserving the dev browser access policy. Do not simply make the
whole dev world public, use provider-direct URLs to bypass the gate or put a
platform bypass credential on the watch. No public access change is requested or
applied here.

Training appears as a quest **after its first successful sync** once transport is
enabled. Foreground/hidden-field/Garmin Connect background delivery needs real
iPhone/Enduro tests; browser screen-lock GPS is not part of this path. The Enduro
3 device profile is still a target-build prerequisite. Generic builds are NOT
INSTALLABLE; compiled Monkey C tests have not executed on simulator/device.

## Verification and next work

Eight new real-SQLite/API tests cover private admin scope, hash-only keys, disabled
defaults, token auth/expiry/revocation/production rejection, durable exact replay,
altered payload and skipped sequence rejection, failed storage, capacity, automatic
quest lifecycle, recovery re-pairing and maintenance racing the write. Accepted
game tables and reward receipts remain unchanged. Total: **215** application
regressions. One additional Monkey C test checks that failed/authenticated probes
never bind/remove the queue: five watch functions compile; execution is pending.

Next: resolve approved ingress access, validate Enduro 3/Garmin Connect transport,
then implement authoritative observation/collection/effort reconciliation before
enabling fightable notifications or rewards.

## Private dev release 33

Published on 2026-11-02 with service disabled and owner-only audience preserved.
The hosted setup explains the private access gate and automatic training quest
behavior; Create watch key is disabled. No real key or watch observation was
created. Tumppi's existing quest stayed stopped with 0 gold, 0.00 km, 0 finds,
tile 0,0 and levels 1/1/1. All four exact-source GitHub workflows passed.
Production remains public version 10. See [release evidence](evidence/dev33-garmin-http-release.json).

Watch ingress is still blocked. Making the whole dev Site publicly reachable
would change its audience and requires the user's explicit approval; a separate
supported ingress could preserve private browser access. Do not enable the flag
or export platform credentials to bypass this gate. Hardware tests remain pending.

Official reference: [Garmin Communications.makeWebRequest](https://developer.garmin.com/connect-iq/api-docs/Toybox/Communications.html)
supports mobile Bluetooth/supported Wi-Fi requests, JSON headers/parameters and
asynchronous callbacks, avoiding a custom iPhone companion's Mac/Xcode requirement.
