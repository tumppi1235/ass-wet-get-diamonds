import type {Boss,BossContribution} from './bosses';
import type {Progression} from './progression';
import type {LootRules} from './loot';
export type EncounterState='draft'|'active'|'won'|'expired'|'cancelled'|'failed';
export type Contribution=BossContribution&{equivalentKm:number;hp:number;qualified:boolean;submittedAt:number;progression?:Progression;curveCoefficient?:number;source:'browser-gps';observedSeconds:number};
export type Encounter={version:1;id:string;boss:Boss;creator:string;roster:{id:string;name:string}[];state:EncounterState;createdAt:number;startedAt:number|null;deadline:number|null;resolvedAt:number|null;totalHp:number;remainingHp:number;contributions:Record<string,Contribution>;lootRules:LootRules|null};
export type EncounterView={encounter:Encounter;revision:number;members:{id:string;name:string;accepted:boolean}[];reward?:{gold:number;itemId:string;itemName:string;rarity:string;fellowshipXp:number}};
export type EncounterAction={kind:'create';bossId:string;members:string[]}|{kind:'accept'|'activate'|'cancel'|'leave';encounterId:string;revision:number}|{kind:'contribute';encounterId:string;revision:number;activityId:string}|{kind:'claim-loot';encounterId:string;revision:number};
export type EncounterReceipt={kind:EncounterAction['kind'];encounterId:string;reason:string;gold?:number;itemId?:string};
