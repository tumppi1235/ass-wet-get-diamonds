import type {Boss} from './bosses';

export function validateBossObjectives(value:unknown):{uniqueTiles:number}|undefined{
  if(value===undefined)return undefined;
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>k!=='uniqueTiles'))throw new Error('Unsupported boss objective');
  const uniqueTiles=(value as {uniqueTiles?:unknown}).uniqueTiles;
  if(typeof uniqueTiles!=='number'||!Number.isInteger(uniqueTiles)||uniqueTiles<0||uniqueTiles>200)throw new Error('Use 0 to 200 distinct activity tiles');
  return{uniqueTiles};
}
/** Missing evidence never satisfies an enabled exploration requirement. */
export function explorationObjective(boss:Pick<Boss,'objectives'>,uniqueTiles?:number){
  const required=validateBossObjectives(boss.objectives)?.uniqueTiles||0;
  const observed=Number.isSafeInteger(uniqueTiles)&&uniqueTiles!>=0?uniqueTiles!:null;
  return{required,observed,met:required===0||observed!==null&&observed>=required};
}
