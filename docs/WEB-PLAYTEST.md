# Phone web playtest

Play at **https://trail-relics-jyvaskyla.tuomasl.chatgpt.site**.

The Expo web build is published through the existing **Trail Relics · Jyväskylä** Sites project (`appgprj_6ae4783f8fcc8191a8e97464e8375938`). Its audience is public, explicitly approved by the user, so friends can open the URL without ChatGPT sign-in.

1. Open the HTTPS game URL in Safari or Chrome on a phone. Sign in, or select **Create account** and enter a display name, username, password and matching password confirmation. Successful registration signs in the new explorer with separate, empty progress on that phone.
2. Tap the bottom **Quest** strip to open the controls, then **Start quest**. Allow precise location for the site. Keep the page open and the screen on while walking.
3. Your position and accuracy appear on the map. During an active quest, walking earns **1 gold per 250 m**, including distance through previously explored tiles, plus **1 gold the first time you explore each tile**. Walking rewards need an accurate fix (25 m or better), walking speed and a position inside Jyväskylä. Partial distance carries over between quests/reloads; existing gold and visits are preserved, without retroactive bonuses.
4. Follow public streets and paths. The direction arrow is a north-up bearing, not a turn-by-turn route. Landmark markers show actual path-side destinations. Enter the artefact’s own tile to attempt collection, including landmark relics. Collection also requires a fresh, eligible GPS fix.
5. The bottom strip announces when a relic is ready. Open the quest drawer and tap **Collect artefact**. One attempt is available per relic per quest. Keep walking after a capture.
6. Open the drawer and tap **Stop quest** to stop GPS and save progress. A new quest resets quest distance, search energy and attempts, preserving gold, collection and visited areas. A failed/denied location request does not reset the previous quest's progress.

The map fills the game screen and uses one unified retro outdoor style. **Me** is its only map button. On opening the game, the app requests location and centres/follows the player after the first fix; a location-only watch does not award quest progress. If location is denied, the last explored position stays visible and the drawer explains the error. A small compass sits at the top left, and quest controls stay hidden in the bottom drawer. The **Relics** tab lists destinations, including Haukkala and Sippulanniemi, with navigation choices; Collection and Profile are also available from the drawer. Leaving the map preserves the active adventure; returning reconnects GPS. Locking an iPhone may suspend GPS delivery; no rewards are invented for the missing interval. **Me** refreshes location and recentres after panning; start a quest to earn resources.

The browser map uses accurate OpenStreetMap vectors with a retro palette, original pixel terrain patterns, framed artefact icons and Mapzen elevation shading. At wider zoom levels, visited areas are grouped and minor details disappear. Pinch, drag, double click and mouse wheel control zoom. No Street/Terrain selector or "Show 250 m tiles" button is needed.

## Claiming tiles

Visit a tile and earn gold by walking. Tap an explored tile on the map to open its claim details, or open Quest to claim the latest explored tile. The button shows the exact gold cost; unvisited, outside-city and unaffordable tiles cannot be purchased. The first purchase is **1 gold**, and each subsequent purchase of that same tile costs its previous price **+ 1 gold**. Purchases from another local profile transfer ownership without paying the previous owner. Your own tile cannot be bought again. Gold borders show your claims; purple borders show claims by other local profiles, with owner labels when zoomed in. Claims persist across reloads and new quests. Claims and prices are shared between profiles on this installation only.

Profiles and progress remain local to each browser/phone, as requested earlier. Friends see the same landmark world but their own collection and gold. Purple visit overlays cover other profiles on that same installation; this release does not upload players' tracks or synchronize friends' visits. Moving between localhost and the hosted address uses separate storage. Clearing site data loses that installation's progress.

## Sign-in and provisioned players

Sign-in is required for every game screen; the admin/test credential shortcuts have been removed. Existing valid sessions last up to eight hours, and an open game returns to sign-in when its session expires. The `admin` and `test` profiles remain available through manual sign-in.

Provisioned player usernames are `tuomas.jokela` (Tuomas Jokela) and `tumppi` (Tumppi). Generated passwords are delivered privately in the chat; source contains only their salted PBKDF2 verifiers. Bootstrap adds missing explorer profiles without resetting existing passwords, sessions or progress. It does not overwrite an existing matching username or restore a changed password. These remain local profiles, without hosted authentication or cross-phone synchronization.

## Landmark data

23 relic locations are on mapped walking paths: seven at Haukkala, seven at Sippulanniemi, and the existing nine city destinations. Both areas include Compass, Rune, Stone, Shard, Crown, Key and Lantern. Each artefact has a distinct pixel marker; gold remains a walking resource. Existing coordinates and collected finds are preserved. Coordinates/source references are in `mobile/assets/landmarks.json` (© OpenStreetMap contributors, ODbL).

`tools/Add-RegionalRelics.cjs` reads the retained local OSM extracts and adds missing types at public-path nodes in distinct game cells at least 140m apart. It makes no network requests and does not replace existing landmarks. The additional locations are distributed within the extracts' Haukkala/Sippulanniemi area bounds.

The city describes the [Sippulanniemi nature trail](https://www.jyvaskyla.fi/liikunta/reitit-ulkoilu-ja-virkistys/luontopolut/sippulanniemen-luontopolku) and local tourism lists [Jyväskylä landmarks](https://visitjyvaskyla.fi/en/tour/landmarks-in-jyvaskyla/). Use posted access and seasonal route instructions when visiting. Game relics are fictional and are not physical objects placed at these locations.

## Publishing again

Run checks and `npx expo export --platform web` in `mobile`. Use the Sites source helper to open the same project, retaining its returned credential in memory and passing it only through stdin. The local hosting checkout is `.tools/trail-relics-host`, with `.openai/hosting.json` declaring static directory `dist`. Copy the validated Expo `mobile/dist` output into that checkout's `dist`, then package/push with the helper, save that exact commit/archive, and deploy the saved version. Keep hosting credentials, user saves and generated plaintext passwords out of Git.
