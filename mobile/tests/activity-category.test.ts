import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyActivity} from '../src/integrations/activity-category';

test('TR-122 source-specific Garmin and Strava types map deterministically without using custom labels or speed',()=>{
  for(const[sport,movement]of [[1,'foot'],[11,'foot'],[17,'foot'],[2,'bicycle']]as const){const result=classifyActivity({source:'garmin-connect-iq',sport,subSport:0});assert.equal(result.movement,movement);assert.equal(result.status,'classified');assert.equal(result.declaredSetting,'unknown');assert.equal(result.rewardEligible,false);}
  for(const sport_type of ['Walk','Run','TrailRun','Hike','Ride','MountainBikeRide','GravelRide']){const result=classifyActivity({source:'strava',sport_type});assert.equal(result.movement,sport_type.includes('Ride')?'bicycle':'foot');assert.equal(result.rewardEligible,false);}
  for(const input of [{source:'fit',sport:1},{source:'garmin-health',sport:1},{source:'garmin-connect-iq',sport:7,subSport:0,speed:2,name:'Walking'},{source:'strava',sport_type:'Workout',name:'Run',speed:3},{source:'strava',sport_type:'Multisport'},{source:'strava',sport_type:'NordicSki'}])assert.equal(classifyActivity(input).movement,null);
});

test('TR-122 declared indoor, virtual and assisted activity metadata stays distinct from outdoor collection and reward proof',()=>{
  for(const[sport,subSport]of [[1,1],[1,45],[11,27],[2,5],[2,6],[2,88]]){const result=classifyActivity({source:'garmin-connect-iq',sport,subSport});assert.equal(result.declaredSetting,'indoor');assert.equal(result.rewardEligible,false);}
  for(const sport of [1,2])assert.equal(classifyActivity({source:'garmin-connect-iq',sport,subSport:58}).declaredSetting,'virtual');
  for(const input of [{source:'garmin-connect-iq',sport:21,subSport:0},{source:'garmin-connect-iq',sport:2,subSport:28},{source:'garmin-connect-iq',sport:2,subSport:47},{source:'strava',sport_type:'EBikeRide'},{source:'strava',sport_type:'EMountainBikeRide'}]){const result=classifyActivity(input);assert.equal(result.assisted,true);assert.equal(result.rewardEligible,false);}
  for(const sport_type of ['VirtualRun','VirtualRide'])assert.equal(classifyActivity({source:'strava',sport_type}).declaredSetting,'virtual');
  assert.equal(classifyActivity({source:'strava',sport_type:'Ride'}).assisted,null,'absence of an e-bike label does not prove unassisted effort');
  assert.equal(classifyActivity({source:'strava',sport_type:'Ride',trainer:true}).declaredSetting,'indoor');assert.equal(classifyActivity({source:'strava',sport_type:'VirtualRide',trainer:true}).declaredSetting,'virtual');assert.equal(classifyActivity({source:'strava',sport_type:'Run',manual:true}).status,'review');assert.equal(classifyActivity({source:'strava',sport_type:'Run',trainer:'false'}).status,'invalid');
});

test('TR-122 malformed, absent and incompatible metadata is preserved as invalid/review, never silently promoted by a known display name',()=>{
  for(const input of [null,[],{}, {source:'strava',type:'Run'},{source:'strava',sport_type:'run'},{source:'strava',sport_type:'__proto__'},{source:'garmin-connect-iq',sport:'1',subSport:3},{source:'garmin-connect-iq',sport:1,subSport:NaN},{source:'garmin-connect-iq',sport:-1,subSport:0}])assert.equal(classifyActivity(input).movement,null);
  for(const subSport of [null,undefined]){const result=classifyActivity({source:'garmin-connect-iq',sport:1,subSport});assert.equal(result.status,'review');assert.equal(result.movement,'foot');assert.equal(result.declaredSetting,'unknown');}
  for(const[sport,subSport]of [[1,7],[2,1],[1,254],[255,0]]){const result=classifyActivity({source:'garmin-connect-iq',sport,subSport,name:'Walk'});assert.equal(result.movement,null);assert.equal(result.rewardEligible,false);}
});
