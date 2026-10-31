# Graphics and world design

Preserve the original retro 8-bit RPG/Balatro-inspired UI and original sprites. Rarer artefacts must be larger and more prestigious without obscuring useful trails. Geography and GPS stay accurate; pixel decoration is clipped to actual mapped terrain. The map remains visible, Me is the only map button, the compass is a small overlay, and gameplay/account actions are in the drawer.

The implementation and palette are documented in [MAP-ART-DIRECTION.md](MAP-ART-DIRECTION.md). Assets live in `mobile/assets/pixel-items` and generated web atlases in `mobile/public/maps`; build scripts regenerate them reproducibly. Road/trail readability, low mobile rendering cost, meaningful ownership colors and legible GPS/active-tile status take precedence over extra effects. Garmin retains limited adjacent-tile vision and compact collector/navigation screens for battery and screen constraints.

Future bosses, companions, character archetypes and expanded rarities require briefs here and gameplay decisions in GAME_DESIGN.md before adding assets to the live app. Existing asset files and map style are retained rather than replaced during project organization.
