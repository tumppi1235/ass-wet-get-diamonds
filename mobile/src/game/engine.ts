import type { Engine } from './types';
import { seedLandmarks } from './landmarks';
import { GOLD_PER_NEW_TILE, restoreResources } from './resources';
import { isInJyvaskyla } from '../map/region';
// Keep the same tested deterministic engine as the browser prototype.
const shared: Engine = require('../../../public/engine.js');
const engine: Engine = {
  ...shared,
  initial: () => seedLandmarks(restoreResources(shared.initial())),
  enter: s => { const c=shared.cell(s.x,s.y),first=!(s.visits[shared.key(c.i,c.j)]>0); const entered = shared.enter(s); if(entered&&first&&isInJyvaskyla(s))s.gold+=GOLD_PER_NEW_TILE; seedLandmarks(s); return entered; },
  move: (s, dx, dy) => { const c=shared.cell(s.x+dx,s.y+dy),first=!(s.visits[shared.key(c.i,c.j)]>0); const entered = shared.move(s, dx, dy); if(entered&&first&&isInJyvaskyla(s))s.gold+=GOLD_PER_NEW_TILE; seedLandmarks(s); return entered; },
};
export default engine;
