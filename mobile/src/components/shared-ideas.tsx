import React,{useEffect,useRef,useState} from 'react';
import {Text,View} from 'react-native';
import {Button,styles,colors} from './ui';
import type {SharedWorldClient} from '../accounts/shared-world';
import {ATTRIBUTES,ATTRIBUTE_LABELS} from '../game/progression';
import type {AdventureIdeas,RecommendationPreferences} from '../game/recommendations';
import type {RoutePlan} from '../game/route-plan';
import {SharedRoutes} from './shared-routes';
const initial:RecommendationPreferences={goal:'endurance',movement:'foot',meters:3000,terrain:'any',access:'known-paths'};
export function SharedIdeas({client,plan,onPlan,onShowRoute}:{client:SharedWorldClient;plan?:RoutePlan;onPlan(plan?:RoutePlan):void;onShowRoute():void}){
  const[preferences,setPreferences]=useState(initial),[result,setResult]=useState<AdventureIdeas>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),request=useRef<AbortController|null>(null),sequence=useRef(0);
  useEffect(()=>()=>{sequence.current++;request.current?.abort();},[]);
  const change=(patch:Partial<RecommendationPreferences>)=>{sequence.current++;request.current?.abort();setBusy(false);setPreferences(p=>({...p,...patch}));setResult(undefined);setError('');};
  const load=async()=>{request.current?.abort();const abort=new AbortController(),id=++sequence.current;request.current=abort;setBusy(true);setResult(undefined);setError('');try{const ideas=await client.ideas(preferences,abort.signal);if(sequence.current===id)setResult(ideas);}catch(e){if(sequence.current===id)setError((e as Error).message);}finally{if(sequence.current===id)setBusy(false);}};
  return <View style={{gap:12}}><Text style={styles.heading}>Adventure ideas</Text><Text style={styles.small}>Plan ordinary progress. This does not start a quest, reserve a destination or award bonus XP.</Text>
    <Text style={styles.eyebrow}>Attribute goal</Text><View style={styles.row}>{ATTRIBUTES.map(goal=><Button key={goal} title={ATTRIBUTE_LABELS[goal]} quiet={preferences.goal!==goal} onPress={()=>change({goal})}/>)}</View>
    <Text style={styles.eyebrow}>Movement</Text><View style={styles.row}>{(['foot','bicycle']as const).map(movement=><Button key={movement} title={movement==='foot'?'Foot':'Bicycle'} quiet={preferences.movement!==movement} onPress={()=>change({movement})}/>)}</View>
    <Text style={styles.eyebrow}>Planned recorded distance</Text><View style={styles.row}>{[1000,3000,5000,10000,20000].map(meters=><Button key={meters} title={`${meters/1000} km`} quiet={preferences.meters!==meters} onPress={()=>change({meters})}/>)}</View>
    <Text style={styles.eyebrow}>Destination preferences</Text><View style={styles.row}>{(['any','urban','trail','woodland']as const).map(terrain=><Button key={terrain} title={terrain==='any'?'Any terrain':terrain[0].toUpperCase()+terrain.slice(1)} quiet={preferences.terrain!==terrain} onPress={()=>change({terrain})}/>)}</View>
    <View style={styles.row}><Button title="Paths I can verify" quiet={preferences.access!=='known-paths'} onPress={()=>change({access:'known-paths'})}/><Button title="Step-free required" quiet={preferences.access!=='step-free'} onPress={()=>change({access:'step-free'})}/></View>
    <Button title="Show ideas" busy={busy} onPress={()=>{void load();}}/>{error&&<Text style={styles.error}>{error}</Text>}
    {result&&<><Text style={styles.heading}>{result.title}</Text><Text style={styles.body}>{result.guidance}</Text><Text style={styles.small}>Experimental · {result.balanceRevision} · generated {new Date(result.generatedAt).toLocaleTimeString()} · zero rewards granted</Text>
      {result.assumptions.map(text=><Text key={text} style={styles.small}>If: {text}</Text>)}
      <Text style={styles.eyebrow}>Conditional ordinary XP</Text>{result.levels.filter(row=>result.xp[row.attribute]>0).map(row=><Text key={row.attribute} style={styles.body}>{ATTRIBUTE_LABELS[row.attribute]} +{result.xp[row.attribute]} XP · level {row.before} → {row.after}</Text>)}{!Object.values(result.xp).some(Boolean)&&<Text style={styles.small}>No supported XP estimate for this goal yet.</Text>}
      {!!result.places.length&&<Text style={styles.eyebrow}>Nearby catalog ideas · not routes</Text>}{result.places.map(place=><View key={place.id} style={{padding:12,gap:6,borderWidth:1,borderColor:colors.line}}><Text style={styles.body}>{place.name}</Text><Text style={styles.small}>{(place.minimumReturnMeters/1000).toFixed(2)} km straight-line minimum return · terrain {place.terrain}</Text><Text style={styles.small}>{place.newTile?'New tile':'Previously reached tile'} · {place.newRegion?'New regional block':'Known regional block'}</Text><Text style={styles.small}>{place.latitude.toFixed(5)}, {place.longitude.toFixed(5)} · {place.source}</Text></View>)}
      {result.limits.map(text=><Text key={text} style={styles.small}>{text}</Text>)}<Text style={styles.small}>Estimates are conditional, not promised totals. Extra new tiles, regions or finds can change actual XP; GPS gaps, failed searches and changing balance rules can reduce it. Use Quest to select movement and start recording.</Text>
    </>}
    <View style={styles.divider}/><SharedRoutes client={client} plan={plan} onPlan={onPlan} onShow={onShowRoute}/>
  </View>;
}
