import React from 'react';
import {Text,View} from 'react-native';
import {PixelIcon,iconForRelic} from './pixel-icon';
import {styles} from './ui';
import type {detectedRarityClue} from '../game/rarity-clues';
export function RelicClue({clue,ready}:{clue:ReturnType<typeof detectedRarityClue>;ready:boolean}){
  if(!clue)return null;
  return <View accessibilityLabel={`${clue.rarity} artefact clue`} style={{borderWidth:2,borderColor:clue.color,padding:12,gap:8,flexDirection:'row',alignItems:'center'}}><PixelIcon name={iconForRelic(clue.name)} size={clue.iconSize}/><View style={{flex:1,gap:5}}><Text style={[styles.eyebrow,{color:clue.color}]}>{clue.rarity}</Text><Text style={styles.body}>{clue.message}</Text><Text style={styles.small}>{ready?'In your tile · attempt collection':'Reach its tile with accurate GPS to attempt collection.'}</Text></View></View>;
}
