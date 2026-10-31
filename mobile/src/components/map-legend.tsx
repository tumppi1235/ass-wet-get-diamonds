import React from 'react';
import {Text,View} from 'react-native';
import {TILE_STYLE} from '../map/overlay-style';
export function MapLegend(){return <View pointerEvents="none" style={{position:'absolute',left:8,bottom:78,backgroundColor:'#102E2BF2',borderColor:'#E6B653',borderWidth:1,padding:7,gap:5}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:6}}><View style={{width:15,height:12,backgroundColor:TILE_STYLE.explored,borderWidth:1,borderColor:'#BDF7F7',borderStyle:'dashed'}}/><Text style={{color:'#F5E7BB',fontSize:11}}>Explored</Text></View>
  <View style={{flexDirection:'row',alignItems:'center',gap:6}}><View style={{width:15,height:12,backgroundColor:TILE_STYLE.claimed,borderWidth:2,borderColor:TILE_STYLE.claimedEdge}}/><Text style={{color:'#F5E7BB',fontSize:11}}>Your claim</Text></View>
  <View style={{flexDirection:'row',alignItems:'center',gap:6}}><View style={{width:15,height:12,backgroundColor:TILE_STYLE.claimOther,borderWidth:2,borderColor:TILE_STYLE.claimedEdge}}/><Text style={{color:'#F5E7BB',fontSize:11}}>Other claims</Text></View>
</View>;}
