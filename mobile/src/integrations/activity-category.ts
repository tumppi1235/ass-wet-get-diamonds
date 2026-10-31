import type {Movement} from '../game/dev-world';
export const ACTIVITY_CATEGORY_REVISION='movement-map-dev-1';
export type ActivityCategory={revision:typeof ACTIVITY_CATEGORY_REVISION;source:'garmin-connect-iq'|'strava'|'unknown';movement:Movement|null;discipline:'walking'|'running'|'hiking'|'cycling'|null;declaredSetting:'outdoor'|'indoor'|'virtual'|'unknown';assisted:boolean|null;status:'classified'|'review'|'unsupported'|'invalid';reason:string;rewardEligible:false};
type Category=Pick<ActivityCategory,'movement'|'discipline'|'declaredSetting'|'assisted'>;
const base=(source:ActivityCategory['source']):ActivityCategory=>({revision:ACTIVITY_CATEGORY_REVISION,source,movement:null,discipline:null,declaredSetting:'unknown',assisted:null,status:'unsupported',reason:'Unsupported activity type; do not infer a category from speed or a custom profile name',rewardEligible:false});
const foot=(discipline:'walking'|'running'|'hiking'):Category=>({movement:'foot',discipline,declaredSetting:'unknown',assisted:null});
const bike:Category={movement:'bicycle',discipline:'cycling',declaredSetting:'unknown',assisted:null};
const strava:Record<string,Category>={Walk:foot('walking'),Run:foot('running'),TrailRun:{...foot('running'),declaredSetting:'outdoor'},Hike:foot('hiking'),Ride:bike,MountainBikeRide:{...bike,declaredSetting:'outdoor'},GravelRide:{...bike,declaredSetting:'outdoor'},EBikeRide:{...bike,assisted:true},EMountainBikeRide:{...bike,assisted:true,declaredSetting:'outdoor'},VirtualRide:{...bike,declaredSetting:'virtual'},VirtualRun:{...foot('running'),declaredSetting:'virtual'}};
const genericSubs=new Set([0]),runSubs=new Set([1,2,3,4,45,58,59,67]),walkSubs=new Set([2,3,27,30,31,58]),hikeSubs=new Set([3,58,66,67]),bikeSubs=new Set([5,6,7,8,9,10,11,12,13,28,29,46,47,48,49,58,88]);
/** Metadata classification only. Numeric Garmin values are Toybox.Activity enums, NEVER assumed FIT/Health API codes. */
export function classifyActivity(value:unknown):ActivityCategory{
  if(!value||typeof value!=='object'||Array.isArray(value))return{...base('unknown'),status:'invalid',reason:'Use source-specific activity metadata'};
  const input=value as Record<string,unknown>;
  if(input.source==='strava'){
    const result=base('strava');if(typeof input.sport_type!=='string'||!input.sport_type||input.sport_type.length>80)return{...result,status:'invalid',reason:'Use Strava sport_type, not the deprecated type or a display name'};
    const category=Object.hasOwn(strava,input.sport_type)?strava[input.sport_type]:undefined;if(!category)return result;
    if(['trainer','manual'].some(key=>input[key]!==undefined&&input[key]!==null&&typeof input[key]!=='boolean'))return{...result,status:'invalid',reason:'Use provider boolean trainer/manual flags; strings are not verified flags'};
    // Provider labels are metadata, not a verification of GPS, completion or unassisted physical effort.
    return{...result,...category,declaredSetting:category.declaredSetting==='virtual'?'virtual':input.trainer===true?'indoor':category.declaredSetting,status:input.manual===true?'review':'classified',reason:input.manual===true?'Manually entered activity; no independently recorded effort evidence':'Recognized sport_type; provider identity, completion and activity evidence remain unverified'};
  }
  if(input.source!=='garmin-connect-iq')return base('unknown');
  const result=base('garmin-connect-iq'),sport=input.sport,sub=input.subSport;
  if(!Number.isSafeInteger(sport)||Number(sport)<0||Number(sport)>255||(sub!==null&&sub!==undefined&&(!Number.isSafeInteger(sub)||Number(sub)<0||Number(sub)>255)))return{...result,status:'invalid',reason:'Use numeric Toybox.Activity sport/subSport, with null for an absent subSport'};
  const category=sport===1?foot('running'):sport===11?foot('walking'):sport===17?foot('hiking'):sport===2?bike:sport===21?{...bike,assisted:true}:null;
  if(!category)return result;
  if(sub===null||sub===undefined)return{...result,...category,status:'review',reason:'Known sport but no subSport; setting and full activity context remain unknown'};
  const expected=sport===1?runSubs:sport===11?walkSubs:sport===17?hikeSubs:bikeSubs;
  if(!genericSubs.has(Number(sub))&&!expected.has(Number(sub)))return{...result,status:'review',reason:'Unknown or incompatible sport/subSport combination; explicit review required'};
  const declaredSetting=sub===58?'virtual':(category.movement==='foot'?[1,27,45]:[5,6,88]).includes(Number(sub))?'indoor':[2,3,7,8,9,11,29,46,47].includes(Number(sub))?'outdoor':'unknown';
  return{...result,...category,declaredSetting,assisted:[28,47].includes(Number(sub))?true:category.assisted,status:'classified',reason:'Recognized Toybox.Activity metadata; GPS, saved completion and provider identity remain unverified'};
}
