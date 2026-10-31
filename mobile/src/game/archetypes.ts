import {ATTRIBUTES,type Progression,type Attribute,levelProgress} from './progression';
const NAMES:Record<Attribute,string>={exploration:'Pathfinder',power:'Climber',agility:'Wayfarer',endurance:'Long-distance explorer',perception:'Relic seeker',fellowship:'Trail companion'};
/** A description of earned growth, never a class restriction or reward multiplier. */
export function emergingArchetype(progression?:Progression,coefficient=25){
  if(!progression||ATTRIBUTES.every(k=>progression.xp[k]===0))return'New explorer';
  const ranks=ATTRIBUTES.map(key=>({key,level:levelProgress(progression.xp[key],coefficient).level})).sort((a,b)=>b.level-a.level);
  if(ranks[0].level===ranks[1].level)return'All-round explorer';return NAMES[ranks[0].key];
}
