import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Redirect,Link} from 'expo-router';
import {Platform,Pressable,Text,View,ScrollView} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SharedWorldClient,type SharedSnapshot} from '../accounts/shared-world';
import type {EncounterAction} from '../game/encounters';
import type {Boss} from '../game/bosses';
import {SharedEncounters} from '../components/shared-encounters';
import {SharedIdeas} from '../components/shared-ideas';
import type {RoutePlan} from '../game/route-plan';
import type {User} from '../accounts/local-accounts';
import {APP_ENV} from '../config/environment';
import {CityMap} from '../components/city-map';
import {Button,Field,Loading,styles,colors} from '../components/ui';
import {watchPlayerLocation} from '../location/client';
import {observeLocationLifecycle} from '../location/lifecycle';
import type {DevEvent,Movement} from '../game/dev-world';
import {currentTile,claimPrice} from '../game/claims';
import {useSharedClaims} from '../accounts/use-shared-claims';
import {levelProgress} from '../game/progression';
import {availableRelics,captureTarget,relicPoint,relicDistance} from '../game/landmarks';
import G from '../game/engine';
import {groundBearing,groundDistance} from '../map/geodesy';
import {useCompass} from '../location/use-compass';
import {relativeBearing} from '../location/compass';
import {RawLocationSession} from '../location/raw-session';
import {SharedCharacter,SharedCollection} from '../components/shared-journal';
import {detectedRarityClue} from '../game/rarity-clues';
import {RelicClue} from '../components/relic-clue';
export default function SharedWorld(){
  const [client]=useState(()=>new SharedWorldClient(AsyncStorage));
  const [routePlan,setRoutePlan]=useState<RoutePlan>();
  const [loading,setLoading]=useState(true);
  const [drawer,setDrawer]=useState(false),[selectedRelic,setSelectedRelic]=useState<string>();
  const [panel,setPanel]=useState<'quest'|'character'|'collection'|'encounters'|'ideas'>('quest');
  const [encounterPending,setEncounterPending]=useState(false),[guidedBoss,setGuidedBoss]=useState<Boss>();
  const compass=useCompass(APP_ENV==='development');
  const [user,setUser]=useState<User|null>(null),[name,setName]=useState(''),[snapshot,setSnapshot]=useState<SharedSnapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState(false),[notice,setNotice]=useState(''),[mode,setMode]=useState<Movement>('foot'),[tracking,setTracking]=useState(false),[others,setOthers]=useState<Record<string,number>>({});
  const latest=useRef(snapshot),lock=useRef(false);useEffect(()=>{latest.current=snapshot;},[snapshot]);
  const [selectedTile,setSelectedTile]=useState<string>();
  const claimTileId=selectedTile||(snapshot?currentTile(snapshot.world.game):'');
  const {claims,clusters:claimClusters,claim:tileClaim,ready:claimPriceReady,validTile:validClaimTile,error:claimError,onViewBounds,refresh:refreshClaims}=useSharedClaims(client,user?.id,claimTileId);
  const [now,setNow]=useState(()=>Date.now());useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const refresh=useCallback(async()=>{const who=await client.profile();setUser(who);const state=await client.load();latest.current=state;setSnapshot(state);setMode(state.world.movement);setTracking(state.world.game.adventure?.status==='active');setPending(await client.pending());setEncounterPending(await client.pendingEncounter());setError('');},[client]);
  useEffect(()=>{
    if(APP_ENV!=='development')return;let cancelled=false;
    void client.profile().then(async who=>{const[state,waiting,encWaiting]=await Promise.all([client.load(),client.pending(),client.pendingEncounter()]);if(cancelled)return;setUser(who);latest.current=state;setSnapshot(state);setMode(state.world.movement);setTracking(state.world.game.adventure?.status==='active');setPending(waiting);setEncounterPending(encWaiting);if(encWaiting){setPanel('encounters');setDrawer(true);}setError('');}).catch(e=>{if(!cancelled)setError(e.message);}).finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[client]);
  const sharedOwner=user?.id,communityTile=snapshot?currentTile(snapshot.world.game):'';
  useEffect(()=>{if(!sharedOwner||!communityTile)return;let cancelled=false;void client.visits().then(visits=>{if(!cancelled)setOthers(Object.fromEntries(visits.visits.map(v=>[v.tile,v.players])));}).catch(e=>{if(!cancelled)setError(e.message);});return()=>{cancelled=true;};},[client,sharedOwner,communityTile]);
  const send=useCallback(async(event:DevEvent)=>{
    if(lock.current||!latest.current)return false;
    lock.current=true;if(event.kind!=='gps')setBusy(true);setError('');
    try{const result=await client.dispatch(event,latest.current.revision);latest.current=result;setSnapshot(result);setNotice(result.receipt.reason);setPending(false);if(event.kind==='claim')await refreshClaims();return true;}
    catch(e){setError((e as Error).message);setPending(await client.pending());if(event.kind==='claim')void refreshClaims().catch(()=>{});return false;}
    finally{lock.current=false;if(event.kind!=='gps')setBusy(false);}
  },[client,refreshClaims]);
  useEffect(()=>{
    if(!tracking||pending||encounterPending)return;
    const session=new RawLocationSession(watchPlayerLocation,fix=>{void send({kind:'gps',fix});},setError);
    const stop=observeLocationLifecycle(value=>{if(value)session.resume();else session.suspend();});
    const timer=setInterval(()=>session.tick(),5000);void session.start();
    return()=>{clearInterval(timer);stop();session.stop();};
  },[tracking,pending,encounterPending,send]);
  async function performEncounter(action?:EncounterAction){
    if(lock.current)throw new Error('GPS is syncing; try again in a moment');lock.current=true;setBusy(true);
    try{const result=action?await client.encounter(action):await client.retryEncounter();if(result.world){latest.current=result.world;setSnapshot(result.world);}setEncounterPending(false);return result;}
    finally{setEncounterPending(await client.pendingEncounter());lock.current=false;setBusy(false);}
  }
  async function retry(){setBusy(true);setError('');try{const result=await client.retry();latest.current=result;setSnapshot(result);setPending(false);setNotice(result.receipt.reason);if(['adventure started','adventure stopped','already active'].includes(result.receipt.reason))setTracking(result.world.game.adventure?.status==='active');if(result.receipt.reason==='claimed')void refreshClaims();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  if(APP_ENV!=='development')return <Redirect href="/"/>;
  if(loading)return <Loading message="Opening shared dev progress…"/>;
  if(!user||!snapshot)return <ScrollView style={styles.page} contentContainerStyle={{padding:22,gap:18}}><Text style={styles.title}>Shared dev world</Text><Text style={styles.body}>A separate shared profile for development. Your phone profiles, passwords and saved games stay where they are.</Text>{error&&<Text style={styles.error}>{error}</Text>}<Field label="Shared display name" value={name} onChangeText={setName} maxLength={40}/><Button title="Create shared dev profile" disabled={!name.trim()} busy={busy} onPress={()=>{setBusy(true);void client.join(name).then(refresh).then(refreshClaims).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}/>{Platform.OS==='web'&&<a href="/signin-with-chatgpt?return_to=/shared" target="_top" style={{color:colors.gold}}>Sign in with ChatGPT</a>}<Button title="Retry connection" quiet onPress={()=>{void refresh().then(refreshClaims).catch(e=>setError(e.message));}}/><Link href="/" style={styles.body}>Return to local game</Link></ScrollView>;
  const game=snapshot.world.game,active=game.adventure?.status==='active',position=snapshot.world.previous;
  const eligible=!!position&&snapshot.world.latestGpsValid&&now>=position.timestamp&&now-position.timestamp<15000;
  const point=position||game,ready=eligible?captureTarget(game,point):undefined;
  const available=availableRelics(game,point),next=ready||available.find(r=>r.id===selectedRelic)||available[0];
  const origin=G.geo(point.x,point.y),target=guidedBoss?{lat:guidedBoss.latitude,lon:guidedBoss.longitude}:next?G.geo(relicPoint(next).x,relicPoint(next).y):origin;
  const arrow=relativeBearing(groundBearing({latitude:origin.lat,longitude:origin.lon},{latitude:target.lat,longitude:target.lon}),compass.heading);
  return <View style={{flex:1,backgroundColor:colors.paper}}>
    <CityMap plannedRoute={routePlan?.result.status==='ready'?routePlan.result:undefined} fullScreen game={game} communityVisits={others} onDiscover={()=>{}} player={position?{...position,precise:eligible}:null} focusKey={position?'shared-gps':''} demo={false} locating={false} onLocate={()=>setTracking(true)} ownerId={user.id} activeTileId={currentTile(game)} claims={claims} claimClusters={claimClusters} onViewBounds={onViewBounds} selectedTileId={selectedTile} onSelectTile={tile=>{setSelectedTile(tile);setDrawer(true);}} selectedRelicId={next?.id} capturableId={ready?.id} onSelectRelic={setSelectedRelic}/>
    <Text style={{position:'absolute',top:10,left:'40%',color:colors.gold,backgroundColor:colors.paper,padding:6,fontSize:10}}>SHARED DEV{routePlan?.result.status==='ready'?' · PLANNED ROUTE':''}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Open shared quest details" onPress={()=>setDrawer(true)} style={{position:'absolute',top:12,left:10,width:108,minHeight:110,padding:9,backgroundColor:'#152D2AF2',borderColor:colors.gold,borderWidth:2,alignItems:'center'}}><Text style={{color:colors.gold,fontSize:11}}>{compass.heading===null?'NORTH UP':`${Math.round(compass.heading)%360}° ${compass.reference==='magnetic'?'M':'N'}`}</Text><Text style={{fontSize:39,lineHeight:44,color:colors.gold,transform:[{rotate:arrow+'deg'}]}}>{next||guidedBoss?'↑':'✥'}</Text><Text numberOfLines={2} style={{fontSize:10,color:colors.ink,textAlign:'center'}}>{guidedBoss?.name||next?.landmark||next?.name||'Explore'}</Text><Text style={{color:colors.gold}}>{guidedBoss?Math.round(groundDistance({latitude:origin.lat,longitude:origin.lon},{latitude:target.lat,longitude:target.lon}))+' m':next?Math.round(relicDistance(next,point))+' m':''}</Text></Pressable>
    {!drawer&&<Pressable accessibilityRole="button" accessibilityLabel="Open shared quest controls" onPress={()=>setDrawer(true)} style={{position:'absolute',bottom:0,left:0,right:0,padding:14,minHeight:50,backgroundColor:'#142A2BF5',borderTopColor:colors.gold,borderTopWidth:2}}><Text style={{color:colors.gold,textAlign:'center'}}>Gold {game.gold} · {ready?'RELIC READY':active?'QUEST ACTIVE':'QUEST STOPPED'} · CONTROLS ▴</Text></Pressable>}
    {drawer&&<ScrollView style={{position:'absolute',bottom:0,left:0,right:0,maxHeight:'58%',backgroundColor:'#142A2BF5',borderTopColor:colors.gold,borderTopWidth:2}} contentContainerStyle={{padding:14,gap:10}}>
      <View style={styles.spread}><Text style={styles.eyebrow}>{user.displayName}</Text><Button title="Hide" quiet onPress={()=>setDrawer(false)}/></View>
      <View style={styles.row}><Button title="Quest" quiet={panel!=='quest'} onPress={()=>setPanel('quest')}/><Button title="Character" quiet={panel!=='character'} onPress={()=>setPanel('character')}/><Button title="Collection" quiet={panel!=='collection'} onPress={()=>setPanel('collection')}/><Button title="Encounters" quiet={panel!=='encounters'} onPress={()=>setPanel('encounters')}/><Button title="Ideas" quiet={panel!=='ideas'} onPress={()=>setPanel('ideas')}/></View>
      {panel==='ideas'?<SharedIdeas client={client} plan={routePlan} onPlan={setRoutePlan} onShowRoute={()=>setDrawer(false)}/>:panel==='encounters'?<SharedEncounters now={now} client={client} owner={user.id} latitude={origin.lat} longitude={origin.lon} blocked={busy||pending} pending={encounterPending} perform={performEncounter} onRecovered={()=>setEncounterPending(false)} onGuide={boss=>{setGuidedBoss(boss);setDrawer(false);}}/>:panel==='character'?<SharedCharacter world={snapshot.world}/>:panel==='collection'?<SharedCollection world={snapshot.world}/>:<>
      <Text style={styles.heading}>Shared adventure · {mode==='foot'?'Foot':'Bicycle'}</Text><Text style={styles.small}>Experimental balance · revision {snapshot.world.configRevision}. Progress is stored in dev only.</Text>
      {!active&&<View style={styles.row}><Button title="Foot" quiet={mode!=='foot'} onPress={()=>setMode('foot')}/><Button title="Bicycle" quiet={mode!=='bicycle'} onPress={()=>setMode('bicycle')}/></View>}
      <View style={styles.row}><Button title="Start quest" disabled={active||pending||encounterPending} busy={busy} onPress={()=>{void send({kind:'start',movement:mode}).then(sent=>{if(sent)setTracking(true);});}}/><Button title="Stop quest" quiet disabled={!active||pending||encounterPending} busy={busy} onPress={()=>{void send({kind:'stop'}).then(sent=>{if(sent)setTracking(false);});}}/></View>
      <Button title="Attempt artefact in this tile" disabled={pending||encounterPending||!eligible} busy={busy} onPress={()=>{void send({kind:'capture'});}}/>
      {!guidedBoss&&<RelicClue clue={detectedRarityClue(game,point,next?.id,eligible)} ready={!!ready&&ready.id===next?.id}/>}
      <Text style={styles.small}>{compass.message}</Text>{guidedBoss&&<Button title="Return compass to artefacts" quiet onPress={()=>setGuidedBoss(undefined)}/>}<Button title={compass.heading===null?'Enable / retry compass':'Turn compass off'} quiet busy={compass.status==='starting'} onPress={()=>{if(compass.heading===null){compass.stop();compass.start();}else compass.stop();}}/>
      <Text style={styles.body}>Gold {game.gold} · {(game.meters/1000).toFixed(2)} km · {game.collection.length} finds · tile {currentTile(game)}</Text>
      <Button title={!validClaimTile?'Tile outside game area':!claimPriceReady?'Checking tile price…':tileClaim?.ownerId===user.id?'Tile is yours':`Claim ${claimTileId} · ${claimPrice(tileClaim)} gold`} quiet busy={busy} disabled={!claimPriceReady||pending||encounterPending||tileClaim?.ownerId===user.id||!(game.visits[claimTileId]>0)||game.gold<claimPrice(tileClaim)} onPress={()=>{void send({kind:'claim',tile:claimTileId,price:claimPrice(tileClaim)});}}/>{claimError&&<><Text style={styles.error}>{claimError}</Text><Button title="Retry ownership" quiet onPress={()=>{void refreshClaims();}}/></>}{claimClusters.length>0&&<Text style={styles.small}>Numbered markers group nearby claims. Zoom in to see individual claimed tiles.</Text>}
      <Text style={styles.small}>Exploration level {levelProgress(game.progression?.xp.exploration||0,snapshot.world.curveCoefficient).level} · Endurance level {levelProgress(game.progression?.xp.endurance||0,snapshot.world.curveCoefficient).level} · Agility level {levelProgress(game.progression?.xp.agility||0,snapshot.world.curveCoefficient).level}</Text>
      {notice&&<Text style={styles.body}>{notice}</Text>}{error&&<Text style={styles.error}>{error}</Text>}
      {encounterPending&&<Button title="Recover pending encounter action" quiet onPress={()=>setPanel('encounters')}/>} {pending&&<><Button title="Retry pending action" busy={busy} onPress={()=>{void retry();}}/><Button title="Check saved action and reload" quiet busy={busy} onPress={()=>{setBusy(true);void client.discardStalePending().then(state=>{latest.current=state;setSnapshot(state);setMode(state.world.movement);setTracking(state.world.game.adventure?.status==='active');setPending(false);setError('');void refreshClaims().catch(()=>{});}).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}/></>}
      {pending&&<><Text style={styles.small}>Cancel only the unsynced request. This does not undo a recorded action or stop your quest.</Text><Button title="Cancel unsynced action" quiet busy={busy} onPress={()=>{setBusy(true);void client.cancelPending("world").then(state=>{latest.current=state;setSnapshot(state);setMode(state.world.movement);setTracking(state.world.game.adventure?.status==="active");setPending(false);setError("");void refreshClaims().catch(()=>{});}).catch(e=>setError(e.message)).finally(()=>setBusy(false));}}/></>}
      <Text style={styles.small}>GPS gaps add no distance or XP. Browser screen-lock recording is still limited. Shared events use server validation; they do not prove that GPS cannot be spoofed.</Text>{user.role==='admin'&&Platform.OS==='web'&&<a href="/admin-world" style={{color:colors.gold}}>Shared world administration</a>}<Link href="/" style={styles.body}>Return to local game</Link>
      </>}
    </ScrollView>}
  </View>;
}
