import React from 'react';
import {Text,View} from 'react-native';
import type {GameState} from '../game/types';
import {lifetimeSummary} from '../game/achievements';
import {ATTRIBUTES,ATTRIBUTE_LABELS,levelProgress} from '../game/progression';
import {progressionConfig} from '../config/progression';
import {APP_ENV} from '../config/environment';
import {styles,colors} from './ui';
export function LifetimeJournal({game}:{game:GameState|null}){
  if(APP_ENV!=='development'||!game?.lifetime)return null;
  const stats=lifetimeSummary(game.lifetime),curve=progressionConfig(APP_ENV);
  return <View style={[styles.panel,{gap:12}]}>
    <Text style={styles.eyebrow}>ADVENTURE JOURNAL</Text>
    <Text style={styles.heading}>Every journey leaves a mark.</Text>
    <View style={styles.row}>{[
      ['Walked',(stats.meters/1000).toFixed(2)+' km'],['Recorded time',Math.floor(stats.observedSeconds/60)+' min'],['Tiles reached',String(stats.verifiedTiles)],['Artefacts found',String(stats.verifiedFinds)],['Adventures',String(stats.adventures)],
    ].map(([label,value])=><View key={label} style={{minWidth:125,flexGrow:1,padding:10,borderWidth:1,borderColor:colors.line,gap:6}}><Text style={styles.small}>{label}</Text><Text style={styles.heading}>{value}</Text></View>)}</View>
    <Text style={styles.small}>GPS records since {new Date(game.lifetime.since).toLocaleDateString()}. Demo walks and time without GPS are excluded. Earlier saved history: {stats.legacyTiles} tiles and {stats.legacyFinds} artefacts; historical distance is unknown.</Text>
    {game.progression&&<><Text style={styles.heading}>Your six attributes</Text><Text style={styles.small}>XP rewards are not active yet. Your journeys are recorded while the earning rules are being balanced.</Text><View style={styles.row}>{ATTRIBUTES.map(key=>{const p=levelProgress(game.progression!.xp[key],curve.coefficient);return <View key={key} style={{minWidth:140,flexGrow:1,padding:12,borderWidth:1,borderColor:colors.line,gap:6}}><Text style={styles.body}>{ATTRIBUTE_LABELS[key]}</Text><Text style={{color:colors.gold,fontSize:20}}>Level {p.level}</Text><Text style={styles.small}>{p.xp} XP · {p.remainingXp===null?'Next threshold unavailable':p.remainingXp+' to next level'}</Text></View>;})}</View></>}
  </View>;
}
