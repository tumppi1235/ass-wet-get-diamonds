# Pixel-map visual direction

Reference: the user's illustrated Jyväskylä map shared on 2026-10-31.

## Item art implemented

Original 32-pixel sprites recreate the reference's coin, stone, rune, compass relic, crystal and mythic-star visual language. Each has a transparent background. The reusable SVG exports and drawing data are in `mobile/assets/pixel-items/`; `node tools/Build-PixelItems.cjs` regenerates them and the public preview sheet. The game uses them in landmark map pins, relic lists, collection cards and the coin display. Lantern and key icons remain available for those item types. The Haukkala shore landmark now uses the Stone appearance; existing collected items are preserved.

Legendary map pins have larger gold frames. Wide zoom levels keep simple small dots so the new artwork does not overload the overview. These are icon changes, not new resource counters or changes to collection odds.

## Map options and indicative effort

The current raster map already supports a CSS color filter. It changes saturation, warmth and contrast on map imagery without filtering the interface or game markers.

1. **Refine the existing filter / texture:** a few development hours. Can provide a closer palette and subtle grain, but cannot reliably distinguish a road from text or turn a woodland shape into illustrated trees. Whole-image pixelation also pixelates road labels.
2. **Reference-like first version:** roughly 2–5 development days. Render real geography with a custom vector style: warm paths/roads, separate building and water colors, pixel tree sprites within woodland polygons and repeatable water textures. Keep readable labels above decorative layers and implement zoom-dependent detail.
3. **Polished city-wide mobile version:** roughly 1–2 weeks total, depending on map-data coverage, visual fidelity and phone testing. Includes consistent zoom behavior, label readability, battery/rendering performance and robust coverage.

These are rough engineering-effort estimates, not a fixed-price quote or guaranteed delivery date. A new map source may require a provider account/licence or hosting; that would be chosen separately.

Recommended approach: keep the GPS, tile grid and relic coordinates unchanged; style the map underneath them. Use geography-aware decoration rather than a single full-screen pixelation layer. No new map provider is introduced by the icon update.

References: [CSS filters](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/filter), [MapLibre layer styling](https://maplibre.org/maplibre-style-spec/layers/).
