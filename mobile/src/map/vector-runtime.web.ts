import { Map, Popup, setWorkerUrl, setWorkerCount, getVersion, type GeoJSONSource, type LayerSpecification, type ExpressionSpecification, type FilterSpecification } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import G from '../game/engine';
import type { CityMapProps } from '../components/city-map.types';
import { accuracyData, boundaryData, claimsData, collection, coordinates, overlayData, playerData, relicData, selectedTileData, trailData } from './vector-data';
import { revision } from './style-revision.json';
import {GAME_REGION} from './region';
import {RELEASE_FEATURES} from '../config/features';

export function createQuestMap(container: HTMLDivElement, read: () => CityMapProps, onReady: () => void, onError: (message: string) => void) {
  setWorkerUrl(new URL('/maps/maplibre-worker-'+getVersion()+'.js',window.location.href).href);
  setWorkerCount(2);
  const initial = read(), target = initial.player || initial.game;
  const map = new Map({ container, style:'/maps/trail-retro-style.json?v='+revision, center:coordinates(target),zoom:14.4,
    transformStyle:(_previous,next)=>({...next,sprite:typeof next.sprite==='string'?new URL(next.sprite,window.location.href).href:next.sprite}),
    minZoom:RELEASE_FEATURES.nationalExploration?4:7,maxZoom:19,bearing:0,pitch:0,
    dragRotate:false,touchPitch:false,attributionControl:false,fadeDuration:0,
    canvasContextAttributes:{antialias:false},pixelRatio:Math.min(window.devicePixelRatio || 1,2),
  });
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  map.getCanvas().setAttribute('aria-label',GAME_REGION+' adventure map. Drag to pan and pinch or scroll to zoom.');
  let ready=false,follow=!!initial.player||initial.demo,focus=initial.focusKey,terrain=true,popup:Popup | null=null,popupId:string | null=null;
  let popupNodes:{title:HTMLElement;detail:HTMLElement;status:HTMLElement} | null=null;
  const sources = ['visits','grid','trail','accuracy','player','relics','boundary','claims','selected-tile','active-tile'];
  const data=(id:string,value:FeatureCollection)=>{(map.getSource(id) as GeoJSONSource | undefined)?.setData(value);};
  const viewport=()=>{
    const c=map.getCenter(),center=G.xy(c.lat,c.lng), canvas=map.getCanvas();
    const north=map.project(coordinates({x:center.x,y:center.y+100}));
    const origin=map.project([c.lng,c.lat]);
    return {center,width:canvas.clientWidth,height:canvas.clientHeight,scale:Math.max(.00001,Math.abs(origin.y-north.y)/100)};
  };
  function overlays(){if(!ready)return;const p=read(),v=viewport(),o=overlayData(p.game,p.communityVisits,v.center,v.width,v.height,v.scale);data('visits',o.visits);data('grid',o.grid);if(p.game.lastCell)p.onDiscover(o.cells);}
  function popupContents(id:string){
    const p=read(),point=p.player || p.game,feature=relicData(p.game,point,p.selectedRelicId,p.capturableId).features.find(f=>f.id===id);
    if(!feature || !popup)return;
    const a=feature.properties!;
    if(!popupNodes){const wrap=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('p'),status=document.createElement('p');wrap.append(title,detail,status);popup.setDOMContent(wrap);popupNodes={title,detail,status};}
    const {title,detail,status}=popupNodes;
    title.textContent=String(a.landmark);detail.textContent=`${a.rarity} ${a.name} · ${a.distance} m`;
    status.textContent=a.collected?'Collected':a.searched?'Searched this quest':a.collectable?'Ready to collect · open Quest':`${p.player||p.demo?'Follow your compass':'Find your location'} · open Quest to collect`;
  }
  function update(){if(!ready)return;const p=read(),point=p.player || p.game;
    data('claims',claimsData(p.claims || {},p.ownerId,p.selectedTileId));data('selected-tile',selectedTileData(p.selectedTileId));data('active-tile',selectedTileData(p.activeTileId));
    data('trail',trailData(p.game));data('relics',relicData(p.game,point,p.selectedRelicId,p.capturableId));
    data('player',playerData(p.player,p.demo?p.game:null));data('accuracy',accuracyData(p.player));
    if(p.focusKey && p.focusKey!==focus){focus=p.focusKey;follow=true;map.jumpTo({center:coordinates(point),zoom:Math.max(14.4,map.getZoom())});}
    else if(follow && (p.player || p.demo)){const center=map.getCenter(),next=coordinates(point);if(Math.abs(center.lng-next[0])+Math.abs(center.lat-next[1])>1e-8)map.jumpTo({center:next});}
    overlays();if(popupId)popupContents(popupId);
  }
  const add=(layer:LayerSpecification)=>map.addLayer(layer);
  map.on('load',()=>{
    if(ready)return;
    for(const id of sources)map.addSource(id,{type:'geojson',data:id==='boundary'?boundaryData:collection(),...(id==='relics'?{cluster:true,clusterMaxZoom:11,clusterRadius:40}:{} )});
    const visitColor:ExpressionSpecification=['match',['get','owner'],'mine','#75A34C','others','#A17DC4','#43AAA1'];
    add({id:'visit-fill',type:'fill',source:'visits',paint:{'fill-color':visitColor,'fill-opacity':.18}});
    add({id:'visit-edge',type:'line',source:'visits',paint:{'line-color':visitColor,'line-width':1.5,'line-opacity':.8}});
    add({id:'game-grid',type:'line',source:'grid',minzoom:13,paint:{'line-color':'#305B49','line-width':.65,'line-opacity':.25}});
    add({id:'claimed-fill',type:'fill',source:'claims',paint:{'fill-color':['case',['get','mine'],'#E6B653','#A17DC4'],'fill-opacity':.18}});
    add({id:'claimed-border',type:'line',source:'claims',paint:{'line-color':['case',['get','mine'],'#AD7D1F','#725198'],'line-width':2.5}});
    add({id:'selected-tile-border',type:'line',source:'selected-tile',paint:{'line-color':'#55D6D0','line-width':2,'line-dasharray':[3,2]}});
    add({id:'active-tile-border',type:'line',source:'active-tile',paint:{'line-color':'#FFF4BB','line-width':4}});
    add({id:'claimed-owner',type:'symbol',source:'claims',minzoom:15,layout:{'text-field':['concat','CLAIMED · ',['get','owner']],'text-font':['Noto Sans Regular'],'text-size':11,'text-max-width':12},paint:{'text-color':'#423B22','text-halo-color':'#FFF0B9','text-halo-width':1.5}});
    add({id:'municipal-boundary',type:'line',source:'boundary',maxzoom:13,paint:{'line-color':'#376747','line-width':1.5,'line-dasharray':[4,3]}});
    add({id:'route-casing',type:'line',source:'trail',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#FFF3CF','line-width':5}});
    add({id:'route-line',type:'line',source:'trail',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#B4613E','line-width':2.5}});
    add({id:'accuracy-fill',type:'fill',source:'accuracy',paint:{'fill-color':'#55A4B6','fill-opacity':.12}});
    add({id:'accuracy-edge',type:'line',source:'accuracy',paint:{'line-color':'#3D7C9B','line-opacity':.4,'line-width':1}});
    const unclustered:FilterSpecification=['!',['has','point_count']];
    add({id:'relic-clusters',type:'circle',source:'relics',filter:['has','point_count'],paint:{'circle-radius':16,'circle-color':'#102E2B','circle-stroke-color':'#E6B653','circle-stroke-width':2}});
    add({id:'relic-count',type:'symbol',source:'relics',filter:['has','point_count'],layout:{'text-field':['to-string',['get','point_count']],'text-font':['Noto Sans Regular'],'text-size':12},paint:{'text-color':'#F5DF9A'}});
    add({id:'relic-dots',type:'circle',source:'relics',filter:unclustered,maxzoom:13,paint:{'circle-radius':['case',['==',['get','rarity'],'Legendary'],7,5],'circle-color':['case',['get','collected'],'#72A887',['==',['get','rarity'],'Legendary'],'#E6B653','#75C6C7'],'circle-stroke-color':'#102E2B','circle-stroke-width':2}});
    add({id:'relic-ready',type:'circle',source:'relics',minzoom:13,filter:['all',unclustered,['any',['get','collectable'],['get','selected']]],paint:{'circle-radius':28,'circle-color':'#102E2B','circle-opacity':.25,'circle-stroke-color':['case',['get','collectable'],'#8ADDB3','#FFF0AA'],'circle-stroke-width':3,'circle-translate':[0,-26]}});
    add({id:'relic-icons',type:'symbol',source:'relics',filter:unclustered,minzoom:13,layout:{
      'icon-image':['get','icon'],'icon-anchor':'bottom','icon-size':['case',['get','selected'],1.25,['==',['get','rarity'],'Legendary'],1.2,['==',['get','rarity'],'Rare'],1,.8],
      'icon-allow-overlap':true,'icon-padding':3,'symbol-sort-key':['case',['get','selected'],3,['==',['get','rarity'],'Legendary'],2,1],
    },paint:{'icon-opacity':['case',['get','collected'],.45,['get','searched'],.6,1]}});
    add({id:'player-halo',type:'circle',source:'player',paint:{'circle-radius':13,'circle-color':'#FFFFFF','circle-opacity':.5}});
    add({id:'player-dot',type:'circle',source:'player',paint:{'circle-radius':6,'circle-color':['case',['get','precise'],'#267BAD','#BB8939'],'circle-stroke-color':'#FFF6DA','circle-stroke-width':3}});
    ready=true;update();setTerrain(terrain);onReady();
  });
  map.on('movestart',e=>{if(e.originalEvent)follow=false;});
  map.on('moveend',overlays);
  map.on('error',e=>{console.warn('Quest map:',e.error?.message);if(!ready)onError('Map could not load. Check your connection.');});
  map.on('click',async e=>{
    if(!ready)return;
    const features=map.queryRenderedFeatures(e.point,{layers:['relic-icons','relic-dots','relic-clusters']});const f=features[0];if(!f){const point=G.xy(e.lngLat.lat,e.lngLat.lng),c=G.cell(point.x,point.y);read().onSelectTile?.(G.key(c.i,c.j));return;}
    if(f.properties.point_count){const zoom=await (map.getSource('relics') as GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id);if(!map.getSource('relics'))return;map.jumpTo({center:(f.geometry as GeoJSON.Point).coordinates as [number,number],zoom});return;}
    const id=String(f.properties.relicId);read().onSelectRelic?.(id);popup?.remove();popupNodes=null;popupId=id;
    popup=new Popup({offset:[0,-45],closeButton:true,closeOnClick:true,maxWidth:'245px',className:'quest-relic-popup'}).setLngLat((f.geometry as GeoJSON.Point).coordinates as [number,number]);
    popupContents(id);popup.addTo(map);popup.on('close',()=>{popupId=null;popupNodes=null;});
  });
  for(const layer of ['relic-icons','relic-dots','relic-clusters']){map.on('mouseenter',layer,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',layer,()=>map.getCanvas().style.cursor='');}
  function setTerrain(enabled:boolean){terrain=enabled;if(!ready)return;
    // Add elevation only after Terrain is requested; Street never fetches it first.
    if(enabled && !map.getSource('elevation')){map.addSource('elevation',{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],tileSize:256,maxzoom:15,encoding:'terrarium',attribution:'<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Terrain © Mapzen / data sources</a>'});map.addLayer({id:'terrain-shade',type:'hillshade',source:'elevation',paint:{'hillshade-shadow-color':'#887A55','hillshade-highlight-color':'#F3E8BC','hillshade-accent-color':'#376747','hillshade-exaggeration':.35}},'forest-texture');}
    if(map.getLayer('terrain-shade'))map.setLayoutProperty('terrain-shade','visibility',enabled?'visible':'none');
    map.setPaintProperty('forest-texture','fill-opacity',enabled?.9:.55);
    map.setPaintProperty('grass-texture','fill-opacity',enabled?.75:.35);
  }
  const observer=new ResizeObserver(()=>map.resize());observer.observe(container);
  return {update,locate(){const p=read(),point=p.player || (p.demo?p.game:null);if(point){follow=true;map.jumpTo({center:coordinates(point),zoom:Math.max(14.4,map.getZoom())});}p.onLocate();},destroy(){observer.disconnect();popup?.remove();map.remove();}};
}
