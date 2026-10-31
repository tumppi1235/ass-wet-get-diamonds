# Shared dev artefact appearance

TR-003/004/005/008/009/010/011/015/016/017/018/020/030/033/036/037. Development only; production keeps its finite catalog and existing saves.

## Recorded world and personal drops

The server lazily records a dynamic spawn at each sourced outdoor catalog position in the requested nearby area. The initial catalog has 501 positions, not arbitrary national cell centres. Revision, source identity and UTC window determine stable spawn IDs and seeded rarity. Initial experimental weights: Common 75, Rare 22, Legendary 3; window 24 hours. Expiry makes an old spawn unavailable, and a later window creates a new identity. Existing inventories remain intact.

The first accepted personal visit to a sourced spawn tile independently rolls a personal drop (initial probability 25%). The result is deterministic for that player/tile/revision and the recorded visit prevents retries, new quests or config changes rerolling it. Other players' visits cannot suppress the first personal roll or repay personal first-visit XP. No placement is invented in an unsourced tile. Personal drops are visible only to their owner and do not expire.

Unique visitors per tile control detection, initially 2,000 metres at zero visitors, decreasing linearly to 300 metres at 20 visitors, then capped. An artefact in the player's own tile remains visible regardless of the detection radius. Detection does not allow remote collection: fresh accurate GPS inside the artefact's tile is still required.

The shared map receives nearby detected spawns rather than the full legacy catalog. Its optional `sharedSpawnsOnly` marker suppresses prototype map seeding only in shared mode. Local and production saves retain their prior behavior. A separate `(spawn, player)` claim ledger is written atomically with the inventory and event receipt; replay cannot grant a second item. The existing probability/one-attempt-per-outing rule remains. Later windows can be collected without repaying exploration XP.

## Administration and limits

The protected admin page edits versioned weights/window/first-visit probability, simulates all 501 sourced positions without world writes, queries a bounded area in pages and places/retires 24-hour test artefacts. Manual placement requires an explicit public-path review in the UI; an admin position is not proof of safe access. Retirement preserves prior inventory and audit history. Rule edits preserve recorded spawn identities and claims; old active records remain until expiry.

`admin/spawns` rejects national-sized boxes and returns at most 100 records with a cursor. Spatial and tile indexes support nearby queries; local persistence holds only detected nearby relics. Countrywide uncurated procedural placement, terrain/weather/season modifiers, configurable event regions, density map UI and worldwide-exclusive claims remain later work. Garmin deduplication still requires authenticated watch integration.

## Evidence

68 automated regressions pass, including real SQL migrations, deterministic weighted tiers/windows, two independent newcomers, first-visit no-reroll, atomic capture/replay, bounded non-overlapping pages, retirement, own-origin/admin validation, zero-write simulation and body-size rejection. Local D1/browser simulation returned 501 spawns and no world writes; nearby inspection generated and displayed path-side records. Shared GPS transport recovery is tested independently of Foot/Bicycle reward validation. Physical iPhone navigation, expiry across a real outing and sensor acceptance remain pending.

The preceding service increment is live in the existing private dev Site. Hosted platform sign-in, Tumppi profile creation and admin read passed; GitHub runs 41216856814 and 41216856858 passed. Production source remains a5dc0cd4ea88f6acb5fcd324d5239e84e73109e3.
