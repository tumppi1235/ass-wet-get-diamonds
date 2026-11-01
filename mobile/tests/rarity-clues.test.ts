import {test} from 'node:test';
import assert from 'node:assert/strict';
import {detectedRarityClue,CLUE_RULES} from '../src/game/rarity-clues';
import {newDevWorld} from '../src/game/dev-world';
import type {Relic} from '../src/game/types';
test('TR-022 clues use only already detected, unsearched and uncollected relics; they never seed hidden catalog items',()=>{
  const game=newDevWorld().game,p={x:125,y:125},relic:Relic={id:'detected-fixture',i:0,j:0,name:'Rune',rarity:'Rare',novelty:1};game.revealed={};const before=JSON.stringify(game);
  assert.equal(detectedRarityClue(game,p,relic.id,true),null);assert.equal(detectedRarityClue(game,p,'hidden-spawn',true),null);assert.equal(JSON.stringify(game),before);
  game.revealed[relic.id]=relic;assert.equal(detectedRarityClue(game,p,relic.id,true)?.rarity,'Rare');game.searched[relic.id]=true;assert.equal(detectedRarityClue(game,p,relic.id,true),null);game.searched={};game.collection=[relic];assert.equal(detectedRarityClue(game,p,relic.id,true),null);
});
test('TR-022 rarity changes clue tone, threshold and size without changing detection/collection or rewarding stale GPS',()=>{
  const game=newDevWorld().game,p={x:125,y:125};let size=0,near=0;for(const rarity of ['Common','Rare','Legendary']as const){const relic:Relic={id:'detected:'+rarity,i:0,j:0,name:'Stone',rarity,novelty:1};game.revealed={[relic.id]:relic};const before=JSON.stringify(game),clue=detectedRarityClue(game,p,relic.id,true)!;assert.ok(clue.iconSize>size&&CLUE_RULES[rarity].nearMeters>near);size=clue.iconSize;near=CLUE_RULES[rarity].nearMeters;assert.equal(clue.band,'near');assert.equal(detectedRarityClue(game,p,relic.id,false)?.band,'last-seen');assert.equal(JSON.stringify(game),before);}
});
