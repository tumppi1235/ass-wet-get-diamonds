# Development compass — TR-165

The 2026-10-31 backlog continuation adds an opt-in live compass to the private development browser playtest only. Production hosting and released gameplay remain unchanged. Native phone builds and Garmin connectivity are outside this iteration.

Open Quest controls and choose **Enable compass** from a real phone. Allow motion/orientation if the browser asks. The overlay shows the measured screen-top heading and rotates the artefact arrow relative to it; the map stays north-up. Turn it off from the same drawer. Nothing is requested automatically on page load, and no heading history is stored or uploaded. Enabling the compass does not grant GPS collection eligibility or alter rewards.

## Implementation and evidence

- `location/compass.ts`: circular smoothing, signed relative bearings, screen-top projection using the W3C Z-X-Y orientation matrix, freshness validation and one-listener lifecycle controller.
- `heading-client.web.ts`: explicit permission request from the enable action, iOS WebKit compass readings or absolute orientation events, screen rotation invalidation and complete listener cleanup. Relative-only alpha is ignored because its zero is arbitrary.
- `use-compass.ts`: lifecycle suspension/resumption and stale checks. Sensor bursts are limited to at most one render per 150ms. Off, denied, unavailable, paused, uncalibrated and stale states use visibly labeled NORTH UP guidance.
- WebKit readings require reported accuracy of 35 degrees or better. Missing/negative accuracy is rejected. W3C readings require absolute orientation and a usable horizontal projection of the screen's top edge; hold the phone flatter if needed. A readout expires after eight seconds without a fresh event.

Apple's browser reports **magnetic**, not true geographic heading. The overlay labels it `M`, and the drawer explicitly calls the target arrow approximate. This iteration does not implement magnetic-declination correction; GPS destination bearings are geographic. Absolute orientation is labeled separately. Do not present this prototype as precision navigation.

Automated `compass.test.ts` covers cardinal bearings, wraparound, tilt, portrait/landscape, rejected relative/uncalibrated data, stale fallback, throttling, permission timing, watcher cleanup and late callbacks. These use simulated readings, not hardware.

Development validation: all 56 regressions, lint and TypeScript passed; web export and Graphify integrity checks passed. At 390×844 the isolated browser preview showed NORTH UP, the opt-in Enable compass control, readable explanation and intact quest controls/profile progress. No physical sensor or new browser permission was exercised in visual QA.

## iPhone Chrome field acceptance — pending

1. Enable compass with GPS available, grant motion/orientation, and rotate through four cardinal headings while stationary. Confirm the arrow responds to phone orientation rather than direction of travel.
2. Cross north in both directions; no flip through south. Rotate portrait/landscape; the arrow follows the rendered screen top.
3. Hold near vertical, interrupt sensor delivery, deny permission, and switch away/lock/reopen. Each unsupported/stale state must visibly fall back to NORTH UP and recover only from fresh readings. Retry is available.
4. Verify Start/Stop quest, active tile, collection eligibility, route, gold and persisted progress behave as before. Desktop/browser preview proves layout and fallback only; a physical sensor pass is not yet recorded.

## Primary references

- [W3C Device Orientation and Motion](https://www.w3.org/TR/orientation-event/): earth/device rotation model, absolute vs relative data and user-activation permission requirements.
- [Apple webkitCompassHeading](https://developer.apple.com/documentation/webkitjs/deviceorientationevent/1804777-webkitcompassheading) and [webkitCompassAccuracy](https://developer.apple.com/documentation/webkitjs/deviceorientationevent/1804769-webkitcompassaccuracy): magnetic reference and invalid calibration values.
