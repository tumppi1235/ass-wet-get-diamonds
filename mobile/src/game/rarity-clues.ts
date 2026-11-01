import type {GameState,Rarity} from './types';
import {availableRelics,relicDistance} from './landmarks';
export const CLUE_RULES:Record<Rarity,{nearMeters:number;iconSize:number;color:string;signal:string}>={
  Common:{nearMeters:100,iconSize:36,color:'#B9C6B0',signal:'A weathered trace'},
  Rare:{nearMeters:250,iconSize:48,color:'#8FE0E1',signal:'A runic shimmer'},
  Legendary:{nearMeters:500,iconSize:64,color:'#E6B653',signal:'A legendary resonance'},
};
/** Cosmetic signals for ALREADY detected items. Never query a spawn/catalog to reveal a hidden destination. */
export function detectedRarityClue(game:GameState,point:{x:number;y:number},id:string|undefined,accurate:boolean){
  if(!id)return null;const relic=availableRelics(game,point).find(r=>r.id===id);if(!relic)return null;
  const distance=relicDistance(relic,point);if(!Number.isFinite(distance))return null;
  const rule=CLUE_RULES[relic.rarity];if(!rule)return null;
  return{id:relic.id,name:relic.name,rarity:relic.rarity,...rule,band:accurate?(distance<=rule.nearMeters?'near':'distant'):'last-seen',message:accurate?`${rule.signal} · ${distance<=rule.nearMeters?'nearby':'follow the compass'}`:`${rule.signal} · waiting for accurate GPS`};
}
