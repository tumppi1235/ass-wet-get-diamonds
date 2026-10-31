import React,{useState} from 'react';
import { Link, Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { useSession } from '../accounts/session';
import { useGame } from '../game/state';
import { availableRelics, relicDistance } from '../game/landmarks';
import { Frame } from '../components/frame';
import { Loading, styles, colors, pixelFont,Field,Button } from '../components/ui';
import {APP_ENV} from '../config/environment';
import { iconForRelic, PixelIcon } from '../components/pixel-icon';
export default function Relics() {
  const { session, loading } = useSession(), { game } = useGame();
  const [query,setQuery]=useState(''),[limit,setLimit]=useState(48);
  if (loading) return <Loading />; if (!session) return <Redirect href="/login" />; if (!game) return <Loading />;
  const all=availableRelics(game,game).filter(r=>r.landmarkId),needle=query.trim().toLocaleLowerCase();
  const relics=all.filter(r=>!needle||`${r.landmark} ${r.name} ${r.rarity}`.toLocaleLowerCase().includes(needle));
  return <Frame>
    <Text style={styles.eyebrow}>{APP_ENV==='development'?'RELICS ACROSS FINLAND':'LANDMARK RELICS'}</Text>
    <Text style={styles.title}>Choose your next discovery.</Text>
    <Text style={styles.body}>Distances use your last saved position. Enter the artefact’s tile with fresh, accurate GPS to attempt collection. Discovery also works without recording a quest.</Text>
    <Link href="/" style={{color:colors.gold,fontFamily:pixelFont,fontSize:21}}>← Back to map</Link>
    {APP_ENV==='development'&&<><Field label="Find a city, trail or relic" value={query} onChangeText={text=>{setQuery(text);setLimit(48);}}/><Text style={styles.small}>{relics.length} matching destinations · nearest first</Text></>}
    {relics.slice(0,limit).map(r=><View key={r.id} style={[styles.panel,styles.spread]}>
      <PixelIcon name={iconForRelic(r.name)} size={r.rarity==='Legendary'?64:48} tone={r.rarity==='Rare'?'blue':'gold'}/>
      <View style={{flex:1,minWidth:150,gap:6}}><Text style={styles.heading}>{r.landmark}</Text>
        <Text style={styles.body}>{r.rarity} {r.name} · {(relicDistance(r,game)/1000).toFixed(1)} km</Text>
        <Link href={{pathname:'/',params:{target:r.id}}} style={{color:colors.gold,fontFamily:pixelFont,fontSize:20}}>Navigate to relic →</Link>
      </View>
    </View>)}
    {relics.length>limit&&<Button title="Show more relics" quiet onPress={()=>setLimit(value=>value+48)}/>}
    {!relics.length&&<Text style={styles.body}>{query?'No matching relics. Try another city or trail.':'All landmark relics for this quest have been collected or attempted. Start a new quest to renew attempts.'}</Text>}
  </Frame>;
}
