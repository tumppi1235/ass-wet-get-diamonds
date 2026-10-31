import type { Engine } from './types';
import { seedLandmarks } from './landmarks';
import { GOLD_PER_NEW_TILE, restoreResources } from './resources';
import { isInJyvaskyla,isPlayablePoint } from '../map/region';
import {APP_ENV} from '../config/environment';
// Keep the same tested deterministic engine as the browser prototype.
const shared: Engine = require('../../../public/engine.js');
function safeRelic(i:number,j:number,visits:Record<string,number>){
  // The new national catalog uses verified path coordinates. Do not create random building/sea-centre destinations elsewhere.
  if(APP_ENV==='development'&&!isInJyvaskyla({x:(i+.5)*250,y:(j+.5)*250}))return null;
  return shared.relic(i,j,visits);
}
function vision(s:import('./types').GameState){
  if(APP_ENV!=='development')return shared.vision(s);
  const c=shared.cell(s.x,s.y),found=[];
  for(let i=c.i-1;i<=c.i+1;i++)for(let j=c.j-1;j<=c.j+1;j++){
    const id=shared.key(i,j);if(!Object.hasOwn(s.revealed,id))s.revealed[id]=safeRelic(i,j,s.visits);
    if(s.revealed[id])found.push(s.revealed[id]!);
  }
  return found;
}
function enter(s:import('./types').GameState){
  if(APP_ENV!=='development')return shared.enter(s);
  const c=shared.cell(s.x,s.y),id=shared.key(c.i,c.j);vision(s);if(s.lastCell===id)return false;
  s.lastCell=id;s.visits[id]=(s.visits[id]||0)+1;return true;
}
const engine: Engine = {
  ...shared,
  relic:safeRelic,vision,
  initial: () => seedLandmarks(restoreResources(shared.initial())),
  enter: s => { const c=shared.cell(s.x,s.y),first=!(s.visits[shared.key(c.i,c.j)]>0); const entered = enter(s); if(entered&&first&&isPlayablePoint(s))s.gold+=GOLD_PER_NEW_TILE; seedLandmarks(s); return entered; },
  move: (s, dx, dy) => { const c=shared.cell(s.x+dx,s.y+dy),first=!(s.visits[shared.key(c.i,c.j)]>0); const entered = shared.move(s, dx, dy); if(entered&&first&&isPlayablePoint(s))s.gold+=GOLD_PER_NEW_TILE; seedLandmarks(s); return entered; },
};
export default engine;
