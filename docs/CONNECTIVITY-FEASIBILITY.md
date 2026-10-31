# Completed-activity connectivity investigation — TR-163/164/097

Official public documentation checked 2026-11-01. This is a feasibility result, not a connected account/import. No registration, terms acceptance, secret, authenticated provider call, webhook subscription or message to a provider was created. Production and audiences are unchanged.

## Garmin

Garmin now documents Personal pull access to the owner's activity JSON/FIT. Business Starter is a separate limited-user push path without history; Enterprise offers further capabilities under commercial terms. Personal access is not the multi-player integration. [Program overview](https://developer.garmin.com/gc-developer-program/overview/).

The Personal FAQ describes separate terms and an expiring key created in Connect Web, exchanged for a 24-hour access token without refresh tokens. Key lifetimes are 30/90/180 days or one year; revocation invalidates tokens. SDK agreement acceptance does not cover this separate registration. [Personal API FAQ](https://developer.garmin.com/gc-developer-program/personal/personal-faq).

Project conclusion: an owner-only experiment and the friends/guild service need separate program choices. Before live access, prepare server-only secrets, revocable account linking, supported endpoint schemas and retention/deletion. Business push needs a provider-reachable callback; the current private Site relies on browser identity. Do not weaken it to accept anonymous pushes. Device-field communication and completed Connect imports are different transports. The Toybox classifier must not interpret Connect JSON/FIT codes without a verified adapter. Summaries without timed points cannot prove post-activation distance or personal boss-tile arrival.

## Optional Strava

Strava requires application registration and OAuth consent. Plan minimum read scopes, one-time state checking, server-only rotating refresh tokens and explicit revocation. Do not request profile/activity writes for a read-only importer. The current documentation recommends a new revoke endpoint. [OAuth documentation](https://developers.strava.com/docs/authentication/).

Default capacity starts at one athlete, can increase to ten in the dashboard, then requires review. Check actual app limits before promising friends access. [Capacity/rate limits](https://developers.strava.com/docs/rate-limits/).

Webhook notifications are not complete activity evidence. Acknowledge within two seconds, deduplicate and fetch current data under the linked athlete's scope. No undocumented signature header should be assumed. [Webhook specification](https://developers.strava.com/docs/webhooks/).

The June 2026 agreement limits athlete-data display to that athlete. The policy restricts derived-data aggregation and persistent indexes, limits transient caching to seven days and requires deletion handling. A capacity-related policy exception is not a safe basis for shared disclosure: the policy says the agreement controls conflicts. [Agreement](https://www.strava.com/legal/api), [Policy §§2.3, 5.3–5.5, 6–7](https://www.strava.com/legal/api_policy).

Project conclusion, **not provider approval**: do not connect Strava to permanent XP/gold, shared boss contributions, community visits, Graphify, analytics or long-lived backups without written confirmation of those uses. Removing raw routes would not resolve retained derived rewards. No Strava account data is in the current game, graph or snapshots. The classifier uses public type names only. The game remains playable without Strava.

TR-097 outcome: do not build a permanent Strava-segment recommendation cache under assumed entitlement. Existing map/catalog ideas stay independent. An approved future feature must handle restricted endpoints, deletion and expiry. Public visibility is not blanket reuse permission; no segment connector was implemented.

## Project requirements before imported rewards

These are future engineering requirements, not completed features or provider guarantees:

1. Link a verified provider subject to one dev owner. Never use submitted athlete IDs, profile titles or speed as identity/type proof.
2. Keep source namespace and immutable IDs as aliases of one canonical outing. Phone, Garmin and Strava copies cannot earn separate reward sets.
3. Known aliases replay. Similar times/distances/routes are duplicate candidates for review, not sufficient to merge or award. A hash is not hardware attestation.
4. Verify saved completion and actual timed evidence. Keep raw/verified/derived quantities separate. Missing locked-screen points stay missing. Unsupported/manual/virtual/indoor/assisted/mixed evidence needs explicit rules; classification alone grants nothing.
5. Settle canonical identity, receipts and rewards atomically. Handle lost responses and concurrent/out-of-order submissions. Resolve derived-data retention/deletion policy before collecting data, rather than erasing audit or rewinding wallets later.
6. Test consent/revocation/deletion, refresh races, callback/fetch verification, rate limits and duplicate review with synthetic data before a consented real activity/watch test. None of those live provider tests has passed.

Current browser hashes and encounter receipts handle tested web replay only. TR-160 cross-provider aliases/reconciliation remain unfinished. Live work needs the selected program/account credentials, separate terms/approvals and supported ingress/authentication. Continue independent dev work while these gates wait.
