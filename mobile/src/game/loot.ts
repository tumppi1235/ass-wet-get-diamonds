import {levelProgress,validateProgression,type Progression} from './progression';
import {BOSS_TIERS,type BossTier,type Boss} from './bosses';
export type LootRules={revision:string;baseGold:Record<BossTier,number>;rare:Record<BossTier,number>;legendary:Record<BossTier,number>;signature:Record<BossTier,number>;attributeCap:number;contributionCap:number;groupCap:number;combinedCap:number;fellowshipXp:number};
export const LOOT_RULES:LootRules={revision:'loot-experiment-1',baseGold:{Lesser:20,Standard:35,Greater:50,Mythical:100},rare:{Lesser:.2,Standard:.3,Greater:.4,Mythical:.5},legendary:{Lesser:.02,Standard:.05,Greater:.1,Mythical:.2},signature:{Lesser:.01,Standard:.02,Greater:.04,Mythical:.08},attributeCap:.15,contributionCap:.2,groupCap:.2,combinedCap:.75,fellowshipXp:25};
export function validateLootRules(r:LootRules){
  if(!r||typeof r.revision!=='string'||!/^[a-z0-9-]{3,60}$/.test(r.revision))throw new Error('Invalid loot revision');
  for(const tier of BOSS_TIERS){if(!r.baseGold||!Number.isSafeInteger(r.baseGold[tier])||r.baseGold[tier]<1||r.baseGold[tier]>10000)throw new Error('Invalid guaranteed base gold');for(const key of ['rare','legendary','signature']as const)if(!r[key]||!Number.isFinite(r[key][tier])||r[key][tier]<0||r[key][tier]>.9)throw new Error('Invalid loot probability');if(r.rare[tier]+r.legendary[tier]+r.signature[tier]>.9)throw new Error('Keep at least 10% common loot');}
  for(const key of ['attributeCap','contributionCap','groupCap','combinedCap']as const)if(!Number.isFinite(r[key])||r[key]<0||r[key]>2)throw new Error('Invalid loot modifier cap');
  if(!Number.isSafeInteger(r.fellowshipXp)||r.fellowshipXp<0||r.fellowshipXp>10000)throw new Error('Invalid Fellowship XP');return JSON.parse(JSON.stringify(r))as LootRules;
}
export function diminishingBonus(level:number,cap:number){if(!Number.isSafeInteger(level)||level<1||!Number.isFinite(cap)||cap<0)throw new Error('Invalid attribute bonus');return cap*(level-1)/(level-1+20);}
export type LootEvidence={progression:Progression;curveCoefficient:number;equivalentKm:number;targetKm:number;qualifiedPlayers:number};
export function lootChances(tier:BossTier,e:LootEvidence,rules=LOOT_RULES){
  validateLootRules(rules);if(!BOSS_TIERS.includes(tier)||!Number.isFinite(e.equivalentKm)||e.equivalentKm<0||!Number.isFinite(e.targetKm)||e.targetKm<=0||!Number.isInteger(e.qualifiedPlayers)||e.qualifiedPlayers<1||e.qualifiedPlayers>5)throw new Error('Invalid qualified loot evidence');
  const levels=Object.fromEntries(Object.entries(validateProgression(e.progression).xp).map(([k,v])=>[k,levelProgress(v,e.curveCoefficient).level]));
  const attr=(key:string)=>diminishingBonus(levels[key],rules.attributeCap),extra=Math.min(1,Math.max(0,e.equivalentKm/e.targetKm-1));
  const contribution=extra*rules.contributionCap*(.5+.5*diminishingBonus(levels.endurance,1)),group=e.qualifiedPlayers>1?Math.min(rules.groupCap,.04*(e.qualifiedPlayers-1)+attr('fellowship')):0;
  const multiplier=(attribute:number)=>1+Math.min(rules.combinedCap,contribution+group+attribute);
  let rare=rules.rare[tier]*multiplier(attr('agility')),legendary=rules.legendary[tier]*multiplier(attr('power')),signature=rules.signature[tier]*multiplier(attr('perception'));
  const total=rare+legendary+signature;if(total>.9){rare*=.9/total;legendary*=.9/total;signature*=.9/total;}
  return{rare,legendary,signature,common:1-rare-legendary-signature,gold:Math.floor(rules.baseGold[tier]*(1+attr('exploration'))),fellowshipXp:e.qualifiedPlayers>1?rules.fellowshipXp:0,contributionBonus:contribution,groupBonus:group,levels,rulesRevision:rules.revision};
}
export function rollBossLoot(boss:Boss,e:LootEvidence,rules=LOOT_RULES,random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/2**32){
  const chances=lootChances(boss.tier,e,rules),roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)throw new Error('Invalid loot roll');
  if(roll<chances.signature)return{...chances,rarity:'Legendary' as const,name:boss.artifactType,title:boss.signature,signature:true};
  const rarity=roll<chances.signature+chances.legendary?'Legendary' as const:roll<chances.signature+chances.legendary+chances.rare?'Rare' as const:'Common' as const;
  const types=['Stone','Rune','Compass','Shard','Crown','Key','Lantern'],typeRoll=random();if(!Number.isFinite(typeRoll)||typeRoll<0||typeRoll>=1)throw new Error('Invalid item roll');return{...chances,rarity,name:types[Math.floor(typeRoll*types.length)],title:undefined,signature:false};
}
