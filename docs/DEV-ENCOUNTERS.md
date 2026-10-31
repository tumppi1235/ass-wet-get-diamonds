# Shared dev encounters and individual loot

This increment connects the boss definitions to the shared browser game. It is development only; production, local profiles and old passwords are unchanged. Rates and lifecycle choices below are experimental under D-024/D-028.

## Playing

Open `/shared`, then **Controls → Encounters**. The map stays visible. Nearby active bosses appear around the player's current location; **Guide me** selects the boss for the compass overlay. An admin places bosses at sourced paths in `/admin-world`.

Create a solo draft or search shared players by display name and invite up to four others. Every invitee explicitly accepts effort sharing. Invitees can decline/leave a draft; creators cancel drafts. No timer begins on arrival or draft creation. After everyone accepts, the creator reaches the boss tile with accurate GPS and presses **Activate here**. Activation locks the roster, physical rules, target HP, loot rules and deadline (24 hours initially).

Use **Quest → Start quest**, visit the boss tile during that activity, and finish with **Stop quest**. Return to Encounters, choose the completed activity, review recorded distance, equivalent effort, damage and personal minimum, then submit once. The server derives this summary from its accepted GPS receipts, rather than client-supplied totals. Foot and Bicycle use the placed boss's factors. Character levels do not deal damage.

An activity already running at activation can qualify, but only complete recorded distance segments after activation count. Stop and submission must both be within the window. Exactly one submitted activity counts per participant, and the same player's activity cannot be reused for another encounter with that boss. A boss-tile visit inside a configured closure interval does not qualify. Browser suspension, inaccurate fixes, discovery-only movement and unobserved gaps cannot provide fabricated mileage.

Victory settles immediately when HP is exhausted and at least one submitted participant meets their individual minimum. **Only players who already submitted qualifying contributions at settlement receive loot.** Submit before a teammate's winning contribution to participate in that settlement. Late submissions are rejected; accepted roster membership alone earns nothing. If all members submit but the target/minimum is not met, the encounter fails. Expiry resolves once when read or acted on; reserved slots also check expiry before the next party is accepted. There is no separate scheduled background job.

Each qualified winner presses **Claim your victory loot**. Guaranteed experimental gold is Lesser 20 / Standard 35 / Greater 50 / Mythical 100, plus one item. Boss-specific signature outcomes are Legendary items with their own titles. Qualified cooperation by at least two submitted participants grants 25 Fellowship XP by default. A solo player or carried, unqualified roster slot cannot create that bonus.

## Loot policy

Rules snapshot at activation; each contributor's private XP and level coefficient snapshot at submission. Exploration increases gold, Agility Rare opportunity, Power Legendary opportunity, Perception signature opportunity, Endurance the extra-effort bonus, and Fellowship the meaningful-group bonus. Attribute bonuses approach a configured cap with `cap × (level−1)/(level−1+20)`. Extra effort, group and combined modifiers are bounded. Outcome probabilities are normalized to retain at least 10% Common; signature is an alternative Legendary result, not an additional item. Final game balance remains unapproved.

The protected loot laboratory shows base/final probabilities, contribution/group bonuses and guaranteed rewards without writing player progress. Saves create audited, immutable configuration revisions. They affect subsequent activations, not already active encounters.

## Persistence and privacy

Migration `0005_tiny_apocalypse.sql` adds indexed activity identities/times to receipts plus encounters, party membership, contributions, action receipts and individual reward rows. Existing events receive no invented activity metadata. Migrations 0000–0004 are unchanged.

Accepted membership reserves one party per player per boss. Pending invitations do not reserve slots. Activation and contributions use checked revisions; party composition cannot shrink after activation to reduce its target. Contributions, HP settlement, receipts and audit writes commit atomically. Individual reward rows and wallet updates commit atomically, including Fellowship, inventory and lifetime-find evidence. A retry or new claim nonce cannot grant a second reward.

The player client persists a separate, account-scoped encounter envelope before sending. Network/unknown outcomes retain it for retry after reload; definite validation failures clear it so the player can correct GPS/party state. World GPS actions and encounter actions share a synchronization lock. A pending encounter pauses GPS transport until recovered. Clearing a pending envelope reloads authoritative parties first; it never reverses a server settlement.

Other party members can see names, contribution effort, HP and qualification. Private attribute snapshots and individual loot stay private. The player directory is authenticated, requires two characters and returns at most 20 names/IDs, with no email addresses. Activity summaries contain no raw routes. Existing server GPS consistency checks are not hardware attestation or Garmin/Strava provider verification.

## Evidence and remaining gates

Real SQLite migration tests cover solo/group lifecycle, explicit consent, locked roster, stale revisions, tile/window/closure evidence, individual minimum rejection, failures/expiry, lost-response replay, private snapshots, separate account journals, no duplicate loot, wallet-race rollback, loot caps and admin authorization. Local browser QA created only an isolated QA draft, verified the map-preserving phone drawer, boss compass navigation and a zero-write loot simulation. No real activity or hosted player reward was fabricated.

Physical iPhone recording/compass, Enduro 3 communication, independently attested activity providers, guild combat, elevation/exploration objectives, push notifications and watch encounter display remain pending. Browser lock-screen recording is still limited. Dev access remains owner-private; creating shared party support does not change who can open this Site.

Validation for this increment: 94 regression cases, mobile/server TypeScript and lint, full Expo/Worker build and local Graphify integrity checks pass (2,787 nodes / 6,217 edges / 201 indexed files). GitHub checks for the preceding boss-definition commit 2a0f602 all succeeded (41224878178 / 41224878012 / 41224878075). Hosted migration/UI verification follows publication; physical tests remain pending.

## Encounter operations follow-up (TR-049)

The protected admin console now lists encounters by state/boss with 25-row keyset pages, inspects consent/reserved slots/contributions/claimed rewards, and settles overdue deadlines on inspection. Private XP snapshots and raw routes are excluded. An explicit reason and confirmation can end a draft/active dev encounter; the original document is retained in audit, slots are released, and player wallets/inventory/earned rewards are unchanged. Revision checks and an actor-scoped nonce make cancellation safe against races and lost responses. Resolved encounters cannot be cancelled or their rewards reversed. Local browser QA cancelled only the isolated Shared QA draft; no hosted encounter or player progress was modified.

The encounter release 6f54cb836dfbce046346994f0c4390c0a437bf98 was published successfully as managed d742b42eb480e88770f76d979599ca8146e317f4 / appgver_23245202cf448191908ad9cfb59e927b. Hosted Tumppi opened Encounters and refreshed empty boss/party/activity queries without errors, verifying the appended migration path. Production remains unchanged.

Operations follow-up validation: 97 regression cases, server/mobile typecheck and lint, Worker build and refreshed Graphify pass. GitHub CI for encounter commit 6f54cb8 succeeded: web 41229065770, shared backend 41229065814, graph 41229065870.
