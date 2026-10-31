export const ATTRIBUTES=['exploration','power','agility','endurance','perception','fellowship'] as const;
export type Attribute=typeof ATTRIBUTES[number];
export type Progression={version:1;xp:Record<Attribute,number>};
export const ATTRIBUTE_LABELS:Record<Attribute,string>={exploration:'Exploration',power:'Power',agility:'Agility',endurance:'Endurance',perception:'Perception',fellowship:'Fellowship'};
const integer=(v:number,label:string,min=0)=>{if(!Number.isSafeInteger(v)||v<min)throw new Error('Invalid '+label);};
export function newProgression():Progression{return{version:1,xp:{exploration:0,power:0,agility:0,endurance:0,perception:0,fellowship:0}};}
export function validateProgression(value:Progression){
  if(value.version!==1||!value.xp)throw new Error('Unsupported progression save');
  for(const key of ATTRIBUTES)integer(value.xp[key],key+' XP');
  return {...value,xp:{...value.xp}};
}
export function xpForLevel(level:number,coefficient=25){
  integer(level,'level',1);integer(coefficient,'curve coefficient',1);
  const xp=coefficient*(level-1)**2;integer(xp,'XP threshold');return xp;
}
export function levelProgress(xp:number,coefficient=25){
  integer(xp,'XP');integer(coefficient,'curve coefficient',1);
  let level=Math.floor(Math.sqrt(xp/coefficient))+1;
  while(level>1&&coefficient*(level-1)**2>xp)level--;
  while(coefficient*level**2<=xp)level++;
  const floor=xpForLevel(level,coefficient),next=coefficient*level**2;
  return{level,xp,levelXp:xp-floor,nextLevelXp:Number.isSafeInteger(next)?next:null,remainingXp:Number.isSafeInteger(next)?next-xp:null,fraction:Math.min(1,Math.max(0,(xp-floor)/(next-floor)))};
}
