import type {Relic} from './types';
import type {SpawnRules} from './world-spawns';
export type WorldRegion={id:string;name:string;south:number;north:number;west:number;east:number;terrain:'urban'|'trail'|'woodland';weather:'clear'|'rain'|'snow'|'cold';blocked:boolean;startsAt:number;endsAt:number;rarityFactor:number};
export type WorldRegions={revision:string;regions:WorldRegion[];winterFactor:number;nightFactor:number;rainFactor:number;woodlandFactor:number};
export const WORLD_REGIONS:WorldRegions={revision:'regions-experiment-1',regions:[],winterFactor:1,nightFactor:1,rainFactor:1,woodlandFactor:1};
export function validateRegions(value:WorldRegions){
  if(!value||typeof value.revision!=='string'||!/^[a-z0-9-]{3,50}$/.test(value.revision)||!Array.isArray(value.regions)||value.regions.length>30)throw new Error('Use up to 30 named event regions');
  for(const key of ['winterFactor','nightFactor','rainFactor','woodlandFactor']as const)if(!Number.isFinite(value[key])||value[key]<.1||value[key]>5)throw new Error('Modifier factors must be between 0.1 and 5');
  const ids=new Set<string>();
  for(const r of value.regions){
    if(!r||typeof r.id!=='string'||!/^[a-z0-9-]{1,50}$/.test(r.id)||ids.has(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>60)throw new Error('Use unique region IDs and names');ids.add(r.id);
    if(![r.south,r.north,r.west,r.east].every(Number.isFinite)||r.south<59||r.north>71||r.west<19||r.east>32||r.south>=r.north||r.west>=r.east||r.north-r.south>1||r.east-r.west>2)throw new Error('Use a Finland region up to 1° by 2°');
    if(!['urban','trail','woodland'].includes(r.terrain)||!['clear','rain','snow','cold'].includes(r.weather)||typeof r.blocked!=='boolean'||!Number.isFinite(r.rarityFactor)||r.rarityFactor<.1||r.rarityFactor>5||!Number.isSafeInteger(r.startsAt)||!Number.isSafeInteger(r.endsAt)||r.startsAt<0||r.endsAt<=r.startsAt)throw new Error('Invalid region terrain, weather, factor or active window');
  }
  return value;
}
export function rulesForPlace(place:Relic,now:number,base:SpawnRules,configuration:WorldRegions):SpawnRules|null{
  validateRegions(configuration);const timestamp=Math.floor(now/(base.windowHours*3600000))*base.windowHours*3600000,date=new Date(timestamp);
  const matching=configuration.regions.filter(r=>now>=r.startsAt&&now<r.endsAt&&place.latitude!>=r.south&&place.latitude!<=r.north&&place.longitude!>=r.west&&place.longitude!<=r.east).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  if(matching.some(r=>r.blocked))return null;
  const winter=[11,0,1].includes(date.getUTCMonth()),night=date.getUTCHours()<6||date.getUTCHours()>=20;
  const factor=Math.min(10,matching.reduce((value,r)=>value*r.rarityFactor*(r.weather==='rain'?configuration.rainFactor:1)*(r.terrain==='woodland'?configuration.woodlandFactor:1),1)*(winter?configuration.winterFactor:1)*(night?configuration.nightFactor:1));
  // Existing recorded spawns are immutable. Context affects future generated identities, not old claim ownership.
  const weight=(value:number)=>value===0?0:Math.min(10000,Math.max(1,Math.round(value*factor)));
  const phase=new Set(configuration.regions.flatMap(r=>[r.startsAt,r.endsAt]).filter(at=>at<=now)).size;
  return{...base,...(configuration.revision===WORLD_REGIONS.revision?{}:{context:configuration.revision+'-p'+phase}),weights:{Common:base.weights.Common,Rare:weight(base.weights.Rare),Legendary:weight(base.weights.Legendary)}};
}
export function blockedAt(position:{latitude:number;longitude:number},now:number,configuration:WorldRegions){return configuration.regions.some(r=>r.blocked&&now>=r.startsAt&&now<r.endsAt&&position.latitude>=r.south&&position.latitude<=r.north&&position.longitude>=r.west&&position.longitude<=r.east);}
