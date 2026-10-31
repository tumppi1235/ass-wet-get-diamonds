# Phone web playtest

Play at **https://trail-relics-jyvaskyla.tuomasl.chatgpt.site**.

The Expo web build is published through the existing **Trail Relics · Jyväskylä** Sites project (`appgprj_6ae4783f8fcc8191a8e97464e8375938`). Its audience is public, explicitly approved by the user, so friends can open the URL without ChatGPT sign-in.

1. Open the HTTPS game URL in Safari or Chrome on a phone. Sign in or create a local profile.
2. Tap the bottom **Quest** strip to open the controls, then **Start quest**. Allow precise location for the site. Keep the page open and the screen on while walking.
3. Your position and accuracy appear on the map. Walking rewards need an accurate fix (25 m or better), walking speed and a position inside Jyväskylä.
4. Follow public streets and paths. The direction arrow is a north-up bearing, not a turn-by-turn route. Landmark markers show actual path-side destinations. Get within **70 m** to collect a landmark relic; ordinary discoveries use their 250 m cell. Collection also requires a fresh, eligible GPS fix.
5. The bottom strip announces when a relic is ready. Open the quest drawer and tap **Collect artefact**. One attempt is available per relic per quest. Keep walking after a capture.
6. Open the drawer and tap **Stop quest** to stop GPS and save progress. A new quest resets quest distance, search energy and attempts, preserving gold, collection and visited areas. A failed/denied location request does not reset the previous quest's progress.

The map fills the game screen. Its only map selections are **Street**, **Terrain** and **Me**. A small compass sits at the top left, and quest controls stay hidden in the bottom drawer. The **Relics** tab lists destinations, including Haukkala and Sippulanniemi, with navigation choices; Collection and Profile are also available from the drawer. Leaving the map pauses the quest. **Me** can locate you without awarding quest progress; start a quest to earn resources.

The default map uses clearer OpenStreetMap street tiles at a zoom that avoids enlarging raster imagery. A subtle web-only color treatment softens saturation and warms the paper tones to fit the game UI, without filtering game markers or labels drawn by the game. Terrain remains available. At wider zoom levels, visited areas are grouped and minor details disappear. Pinch, drag, double click and mouse wheel control zoom. No "Show 250 m tiles" button is needed.

Profiles and progress remain local to each browser/phone, as requested earlier. Friends see the same landmark world but their own collection and gold. Purple visit overlays cover other profiles on that same installation; this release does not upload players' tracks or synchronize friends' visits. Moving between localhost and the hosted address uses separate storage. Clearing site data loses that installation's progress.

## Provisioned player

Username: `tuomas.jokela`. Display name: Tuomas Jokela. The generated password is delivered privately in the chat; source contains only its salted PBKDF2 verifier. Bootstrap adds this explorer profile without resetting existing users or progress. It does not overwrite an existing matching username or restore a changed password.

## Landmark data

13 relic locations are snapped to mapped walking paths: two at Haukkala, two at Sippulanniemi, and destinations at Harju, Nero stairs, Kirkkopuisto, Toivola, Lutakko harbour, Kuokkala bridge, Ylistö bridge, Tourujoki and Viitaniemi. Coordinates/source references are in `mobile/assets/landmarks.json` (© OpenStreetMap contributors, ODbL).

The city describes the [Sippulanniemi nature trail](https://www.jyvaskyla.fi/liikunta/reitit-ulkoilu-ja-virkistys/luontopolut/sippulanniemen-luontopolku) and local tourism lists [Jyväskylä landmarks](https://visitjyvaskyla.fi/en/tour/landmarks-in-jyvaskyla/). Use posted access and seasonal route instructions when visiting. Game relics are fictional and are not physical objects placed at these locations.

## Publishing again

Run checks and `npx expo export --platform web` in `mobile`. Use the Sites source helper to open the same project, retaining its returned credential in memory and passing it only through stdin. The local hosting checkout is `.tools/trail-relics-host`, with `.openai/hosting.json` declaring static directory `dist`. Copy the validated Expo `mobile/dist` output into that checkout's `dist`, then package/push with the helper, save that exact commit/archive, and deploy the saved version. Keep hosting credentials, user saves and generated plaintext passwords out of Git.
