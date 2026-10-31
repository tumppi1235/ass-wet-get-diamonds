import React,{useState} from 'react';
import {View,Text} from 'react-native';
import type {DevWorld} from '../game/dev-world';
import {ATTRIBUTES,ATTRIBUTE_LABELS,levelProgress} from '../game/progression';
import {emergingArchetype} from '../game/archetypes';
import {lifetimeSummary} from '../game/achievements';
import {Button,styles,colors} from './ui';
import {PixelIcon,iconForRelic} from './pixel-icon';
export function SharedCharacter({world}:{world:DevWorld}){
  const game=world.game,stats=game.lifetime?lifetimeSummary(game.lifetime):null;
  return <View style={{gap:12}}><Text style={styles.heading}>{emergingArchetype(game.progression,world.curveCoefficient)}</Text><Text style={styles.small}>Your journeys shape this description. Every activity and attribute stays open to you.</Text><Text style={styles.body}>Lifetime: {((stats?.meters||0)/1000).toFixed(2)} km · {stats?.verifiedTiles||0} reached tiles · {stats?.verifiedFinds||0} field finds · {Math.floor((stats?.observedSeconds||0)/60)} observed minutes</Text><Text style={styles.small}>Experimental rewards · {world.configRevision}. Unrecorded GPS gaps and admin test grants do not count as physical achievements.</Text>{ATTRIBUTES.map(key=>{const level=levelProgress(game.progression?.xp[key]||0,world.curveCoefficient);return <View key={key} style={{borderWidth:1,borderColor:colors.line,padding:12,gap:6}}><View style={styles.spread}><Text style={styles.body}>{ATTRIBUTE_LABELS[key]}</Text><Text style={{color:colors.gold}}>Level {level.level}</Text></View><View accessibilityLabel={`${ATTRIBUTE_LABELS[key]} level progress ${Math.round(level.fraction*100)} percent`} style={{height:8,backgroundColor:'#0C1F21'}}><View style={{height:8,width:`${level.fraction*100}%`,backgroundColor:colors.gold}}/></View><Text style={styles.small}>{level.xp} XP · {level.remainingXp??'—'} XP to next level</Text>{(key==='power'||key==='fellowship')&&<Text style={styles.small}>Earning awaits supported elevation / cooperative evidence. Test admin values may be present.</Text>}</View>;})}</View>;
}
export function SharedCollection({world}:{world:DevWorld}){
  const[limit,setLimit]=useState(24),items=world.game.collection.slice().reverse();
  return <View style={{gap:12}}><Text style={styles.heading}>Your collection · {items.length}</Text>{!items.length&&<Text style={styles.body}>Enter a detected artefact tile with accurate GPS and try collecting. Returning later can reveal a new world spawn.</Text>}{items.slice(0,limit).map(item=><View key={item.id} style={{padding:16,gap:8,alignItems:'center',borderWidth:2,borderColor:item.rarity==='Legendary'?colors.gold:colors.line,backgroundColor:item.rarity==='Legendary'?'#433B28':'#193735'}}><PixelIcon name={iconForRelic(item.name)} size={item.rarity==='Legendary'?96:item.rarity==='Rare'?72:48}/><Text style={styles.heading}>{item.name}</Text><Text style={styles.eyebrow}>{item.rarity}</Text><Text style={styles.small}>{item.source==='Admin test grant'?'Admin test item':item.landmark||'Outdoor discovery'}</Text></View>)}{limit<items.length&&<Button title="Show more finds" quiet onPress={()=>setLimit(limit+24)}/>}</View>;
}
