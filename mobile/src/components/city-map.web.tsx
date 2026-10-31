import React, { useEffect, useRef, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import type { CityMapProps } from './city-map.types';
import { CityMap as RasterMap } from './raster-city-map';
import { Button } from './ui';
import 'maplibre-gl/dist/maplibre-gl.css';
import './quest-map.css';
import type { createQuestMap } from '../map/vector-runtime.web';
import {GAME_REGION} from '../map/region';

export function CityMap(props: CityMapProps) {
  const host=useRef<HTMLDivElement>(null),latest=useRef(props),controller=useRef<ReturnType<typeof createQuestMap> | null>(null);
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[fallback,setFallback]=useState(false);
  const {height:screenHeight}=useWindowDimensions(),height=props.fullScreen?screenHeight:560;
  useEffect(()=>{latest.current=props;controller.current?.update();},[props]);
  useEffect(()=>{
    if(fallback)return;
    let cancelled=false;
    import('../map/vector-runtime.web').then(({createQuestMap})=>{
      if(cancelled || !host.current)return;
      try{controller.current=createQuestMap(host.current,()=>latest.current,()=>{setReady(true);setError('');},setError);}
      catch(e){console.warn('Vector map unavailable',e);setFallback(true);}
    }).catch(()=>setFallback(true));
    return()=>{cancelled=true;controller.current?.destroy();controller.current=null;};
  },[fallback]);
  if(fallback)return <RasterMap {...props}/>;
  return <View style={{height,backgroundColor:'#C3CA96',position:'relative'}}>
    <div ref={host} className="quest-vector-map" role="region" aria-label={'Interactive '+GAME_REGION+' map'} style={{position:'absolute',inset:0}}/>
    <View style={{position:'absolute',right:10,top:12,gap:6}}>
      <Button title="Me" quiet busy={props.locating} onPress={()=>controller.current?.locate()}/>
    </View>
    {(!ready || error) && <View pointerEvents="none" style={{position:'absolute',left:12,right:110,bottom:92}}><Text style={{color:'#183E35',backgroundColor:'#F0E9CD',padding:7,fontSize:12}}>{error || 'Drawing your adventure map…'}</Text></View>}
    <div className="quest-map-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> · <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noreferrer">Terrain: Mapzen / sources</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">Improve map</a></div>
  </View>;
}
