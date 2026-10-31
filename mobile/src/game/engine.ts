import type { Engine } from './types';
import { seedLandmarks } from './landmarks';
import { restoreResources } from './resources';
// Keep the same tested deterministic engine as the browser prototype.
const shared: Engine = require('../../../public/engine.js');
const engine: Engine = {
  ...shared,
  initial: () => seedLandmarks(restoreResources(shared.initial())),
  enter: s => { const entered = shared.enter(s); seedLandmarks(s); return entered; },
  move: (s, dx, dy) => { const entered = shared.move(s, dx, dy); seedLandmarks(s); return entered; },
};
export default engine;
