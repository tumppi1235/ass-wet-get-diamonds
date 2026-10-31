import type {Movement} from './dev-world';
export const BOSS_TIERS=['Lesser','Standard','Greater','Mythical']as const;
export type BossTier=typeof BOSS_TIERS[number];
export type BossRules={
  revision:string;windowHours:number;footHpPerKm:number;bicycleHpPerKm:number;modifierCap:number;
  targets:Record<BossTier,[number,number,number,number,number]>;
  individualMinimum:Record<BossTier,number>;
};
export const BOSS_RULES:BossRules={
  revision:'boss-experiment-1',windowHours:24,footHpPerKm:2,bicycleHpPerKm:.8,modifierCap:.1,
  targets:{Lesser:[20,11,8,6.125,5],Standard:[35,22,17,13.875,12],Greater:[50,35,28,24.25,22],Mythical:[75,65,58,53,50]},
  individualMinimum:{Lesser:.25,Standard:.25,Greater:.5,Mythical:1},
};
export const BOSS_DESIGNS=[
  {id:'metsanvartija',name:'Metsänvartija',theme:'An ancient guardian rooted in the woodland paths.',signature:'Warden Rune',type:'Rune',weakness:'foot' as Movement},
  {id:'hallahukka',name:'Hallahukka',theme:'A frost wolf guarding exposed ridges and winter trails.',signature:'Frost Crown',type:'Crown',weakness:'foot' as Movement},
  {id:'syvanne',name:'Syvänne',theme:'A lake spirit encountered on an accessible shoreline path.',signature:'Depth Shard',type:'Shard',weakness:'bicycle' as Movement},
  {id:'kivenkulkija',name:'Kivenkulkija',theme:'A wandering stone sentinel of hill paths and old tracks.',signature:'Wayfarer Compass',type:'Compass',weakness:'foot' as Movement},
]as const;
export type Boss={version:1;id:string;designId:string;name:string;tier:BossTier;tileId:string;latitude:number;longitude:number;source:string;startsAt:number;endsAt:number;signature:string;artifactType:string;weakness:Movement;weaknessBonus:number;rules:BossRules};
export function validateBossRules(r:BossRules){
  if(!r||typeof r.revision!=='string'||!/^[a-z0-9-]{3,60}$/.test(r.revision)||!Number.isInteger(r.windowHours)||r.windowHours<1||r.windowHours>168)throw new Error('Invalid boss encounter window');
  if(![r.footHpPerKm,r.bicycleHpPerKm].every(v=>Number.isFinite(v)&&v>0&&v<=20)||!Number.isFinite(r.modifierCap)||r.modifierCap<0||r.modifierCap>.25)throw new Error('Invalid boss damage or modifier cap');
  for(const tier of BOSS_TIERS){
    if(!r.targets||!Array.isArray(r.targets[tier])||r.targets[tier].length!==5||!r.targets[tier].every(v=>Number.isFinite(v)&&v>0&&v<=1000)||!r.individualMinimum||!Number.isFinite(r.individualMinimum[tier])||r.individualMinimum[tier]<0||r.individualMinimum[tier]>1)throw new Error('Invalid tier targets or individual minimum');
    // More roster members cannot make the total physical target cheaper.
    for(let i=1;i<5;i++)if(r.targets[tier][i]*(i+1)<r.targets[tier][i-1]*i)throw new Error('Total boss effort must not decrease with party size');
  }
  if(r.targets.Lesser[0]>50||r.targets.Standard[0]>50||r.targets.Greater[0]!==50||r.targets.Mythical[0]<75||r.targets.Mythical.some(v=>v<50)||r.individualMinimum.Greater<.25)throw new Error('Retain Greater-or-lower solo 50km and high-tier endurance floors');
  for(let t=1;t<BOSS_TIERS.length;t++)for(let n=0;n<5;n++)if(r.targets[BOSS_TIERS[t]][n]<r.targets[BOSS_TIERS[t-1]][n])throw new Error('Higher tiers must retain higher effort targets');
  return JSON.parse(JSON.stringify(r))as BossRules;
}
export function bossRequirements(tier:BossTier,partySize:number,rules=BOSS_RULES){
  validateBossRules(rules);if(!BOSS_TIERS.includes(tier)||!Number.isInteger(partySize)||partySize<1||partySize>5)throw new Error('Use a known tier and one to five players');
  const targetKm=rules.targets[tier][partySize-1];return{hp:targetKm*partySize*rules.footHpPerKm,targetKmPerPerson:targetKm,minimumKmPerPerson:Math.max(tier==='Mythical'?50:0,targetKm*rules.individualMinimum[tier]),windowHours:rules.windowHours};
}
export function bossDamage(meters:number,movement:Movement,boss:Pick<Boss,'weakness'|'weaknessBonus'>,rules=BOSS_RULES){
  validateBossRules(rules);if(!Number.isFinite(meters)||meters<0||meters>10000000||!['foot','bicycle'].includes(movement)||!Number.isFinite(boss.weaknessBonus)||boss.weaknessBonus<0)throw new Error('Invalid physical boss evidence');
  const baseHp=meters/1000*(movement==='foot'?rules.footHpPerKm:rules.bicycleHpPerKm),bonus=movement===boss.weakness?Math.min(boss.weaknessBonus,rules.modifierCap):0;
  return{baseHp,hp:baseHp*(1+bonus),equivalentKm:baseHp/rules.footHpPerKm,bonus};
}
export type BossContribution={owner:string;activityId:string;meters:number;movement:Movement;bossTileVisited:boolean;activityStartedAt:number;activityEndedAt:number};
export function simulateEncounter(tier:BossTier,partySize:number,contributions:BossContribution[],boss:Pick<Boss,'weakness'|'weaknessBonus'>,rules=BOSS_RULES){
  const requirement=bossRequirements(tier,partySize,rules),owners=new Set<string>();let hp=0;
  if(contributions.length>partySize)throw new Error('Too many contributors');
  const players=contributions.map(c=>{if(!c.owner||!c.activityId||owners.has(c.owner)||!c.bossTileVisited||!Number.isSafeInteger(c.activityStartedAt)||!Number.isSafeInteger(c.activityEndedAt)||c.activityEndedAt<c.activityStartedAt||c.activityEndedAt-c.activityStartedAt>rules.windowHours*3600000)throw new Error('One qualifying activity and boss-tile visit within the encounter window are required per player');owners.add(c.owner);const damage=bossDamage(c.meters,c.movement,boss,rules),qualified=damage.equivalentKm>=requirement.minimumKmPerPerson;hp+=damage.hp;return{owner:c.owner,...damage,qualified};});
  return{requirement,players,hp:Math.min(hp,requirement.hp),remainingHp:Math.max(0,requirement.hp-hp),victory:hp>=requirement.hp&&players.some(p=>p.qualified),rulesRevision:rules.revision,worldWrites:0};
}
