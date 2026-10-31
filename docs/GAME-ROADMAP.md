# Trail Relics — saved game ideas

Recorded from the user's ideas on 2026-10-30. These are planned designs, not claims about implemented multiplayer features.

## WoW-inspired outdoor progression

Build a richer outdoor adventure inspired by MMO progression: everyday movement provides resources, players cooperate in guilds, and events offer shared challenges and loot.

- **Movement rewards:** accumulate gold or other resources while travelling. The current prototype already earns gold from accepted walking distance; broader movement types and rewards remain to be designed.
- **Guilds:** a sports club, a group of friends, or another community can form a guild.
- **Events / raids:** themed outings such as a Halloween hike act like cooperative raids. Loot drop chances improve with the number of participating guild members and how hard they work. Exact effort measures, scaling and limits remain open.
- **Forest resources:** discover resources in woodland areas. Spend them to claim map tiles for yourself or your guild.

## Buying tiles with gold

Tiles should also be purchasable using gold. The user specified:

**Next purchase price for a tile = that tile's previous purchase price + 1 gold.**

Implemented for the local playtest: the first purchase costs 1 gold, followed by 2 → 3 → 4 gold for successive purchases of the same tile. The increment is per tile, not a global increase across all tiles.

Players must visit a tile before claiming it. Tap an explored tile on the map, or use the current explored tile in the quest drawer. Buying a tile owned by another profile transfers ownership; gold is spent and is not paid to the former owner. Buying your own tile is blocked. Claims persist across quests and are visible in gold for your profile and purple for other profiles on the same installation. They are shared only between profiles on that browser/phone, without cross-phone synchronization. A spending receipt prevents queued autosaves from refunding purchases.

Still open: guild ownership, woodland resources as alternative claim methods, expiry, and a server-backed market shared between phones.

## Artefact appearance and effort-based rewards — backlog

Added on 2026-10-31 at the user's request. Save the design for later; do not change live spawning or reward probabilities yet.

Original guiding idea, in the user's words: **“Further, with more pain gives you better rewards.”** Going farther and taking on more effort/challenge should improve the rewards of an outing, not merely add more identical finds.

Preserve the original outdoor-exploration loop: walk real streets and trails, explore new ground, discover and collect artefacts. The phone is the main game; Garmin is the compact collector/navigation companion with limited vision and battery use. Rarer artefacts should look bigger and more prestigious.

Design the appearance system separately from collection:

- **Appearance:** decide where and when artefacts become available, and how entering/exploring tiles reveals them.
- **Reward quality:** longer and more demanding exploration should improve opportunities for rarer or better rewards. Distance is central; elevation, terrain difficulty and conditions are candidate effort factors, with their exact roles still open.
- **Collection:** distinguish the chance of finding/seeing an artefact from the chance of successfully capturing it. Keep this consistent with search energy and the planned guild/event bonuses.

Existing prototype rules are a reference, not the final appearance design: unfamiliar areas improve generated rarity odds; accumulated search energy, outing/lifetime distance and weather influence capture probability. Curated landmark artefacts currently use fixed locations. Preserve the intent of rewarding exploration and effort when replacing or extending these rules.

Still to design: effort scoring, distance/rarity tiers and caps, spawn/refresh timing, visibility, repeat-visit farming limits, and how rewards interact with search-energy spending, guilds and raids. No new formula or thresholds are agreed yet. Gold distance rewards and tile claims remain the separate, already implemented resource systems.

## Future NPC encounters and combat

Backlog only, as explicitly requested: place NPC enemies on selected game tiles and develop fighting/combat mechanics for encounters. Enemy types, spawn rules, combat controls, rewards and how encounters interact with guilds or tile ownership remain open design questions. No NPC enemies or combat are implemented in the current playtest.

## Shared-service dependencies

Cross-phone guilds, event participation, shared claims and a consistent tile market require shared server state. Profiles and progress are currently local to each phone, as previously requested; publishing the web app alone does not implement these multiplayer systems.

## Original notes

> Entä jos siitä tekis vähän wowimaisen?
>
> Saat resursseja liikkumalla. Eli aina ku oot menossa, niin tulee kultaa tjsp.
>
> Sit on killat (eli vaikka urheiluseura, kaveriporukka tjsp.). Tapahtumat (esim. halloween hike) vois olla vähän ku eventtejä/raideja, mistä droppaa kamoja paremmalla prosentilla mitä enemmän killasta on porukkaa ja mitä kovempaa ne vetää jne.
>
> Metsästä löytyy resursseja, millä voi kleimata ruutuja itselle tai killalle.
