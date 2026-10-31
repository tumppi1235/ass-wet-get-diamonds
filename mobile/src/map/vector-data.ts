import type { Feature, FeatureCollection, Position } from 'geojson';
import G from '../game/engine';
import { LANDMARKS, relicPoint,relicDistance } from '../game/landmarks';
import {RELEASE_FEATURES} from '../config/features';
import {FINLAND} from './country';
import {groundDestination} from './geodesy';
import type { GameState, Relic } from '../game/types';
import type { PlayerPosition } from '../location/tracker';
import { JYVASKYLA, visibleGameTiles, type Point } from './region';
import { visitAreas } from './visits';
import { tilePoint, type TileClaims } from '../game/claims';

export const collection = (features: Feature[] = []): FeatureCollection => ({ type: 'FeatureCollection', features });
export const coordinates = (p: Point): [number, number] => { const g = G.geo(p.x, p.y); return [g.lon, g.lat]; };
const feature = (geometry: Feature['geometry'], properties: Feature['properties'] = {}): Feature => ({ type: 'Feature', properties, geometry });
const ring = (x: number, y: number, size: number) => [[x,y],[x+size,y],[x+size,y+size],[x,y+size],[x,y]].map(([x,y])=>coordinates({x,y}));
export function relicIcon(name: string) { return ({ Compass: 'relic', Rune: 'rune', Stone: 'stone', Shard: 'crystal', Crystal: 'crystal', Crown: 'mythic', Mythic: 'mythic', Key: 'key', Lantern: 'lantern' } as Record<string,string>)[name] || 'stone'; }
export function relicData(game: GameState, point: Point, selected?: string, capturable?: string) {
  const found = new Set(game.collection.map(r=>r.id));
  const relics = new Map<string,Relic>(LANDMARKS.map(r=>[r.id,r]));
  for (const r of Object.values(game.revealed)) if(r) relics.set(r.id,r);
  for (const r of game.collection) relics.set(r.id,r);
  return collection([...relics.values()].map(r=>({ ...feature({type:'Point',coordinates:coordinates(relicPoint(r))},{
    relicId:r.id, name:r.name, landmark:r.landmark || r.name, rarity:r.rarity, icon:relicIcon(r.name),
    collected:found.has(r.id), searched:!!game.searched[r.id], selected:r.id===selected, collectable:r.id===capturable,
    distance:Math.round(relicDistance(r,point)),
  }), id:r.id })));
}
export function trailData(game: GameState) {
  const lines: Position[][]=[]; let current: Position[]=[];
  for(const p of game.path){ if(p.breakBefore && current.length){if(current.length>1)lines.push(current);current=[];} current.push(coordinates(p)); }
  if(current.length>1)lines.push(current);
  return collection(lines.map(coordinates=>feature({type:'LineString',coordinates})));
}
export function playerData(player: PlayerPosition | null, demo: Point | null) {
  const target=player || demo;
  return collection(target?[feature({type:'Point',coordinates:coordinates(target)},{precise:player?player.precise:true})]:[]);
}
export function accuracyData(player: PlayerPosition | null) {
  if(!player)return collection();
  const ring=Array.from({length:65},(_,i)=>{if(RELEASE_FEATURES.nationalExploration){const p=groundDestination(player,player.accuracy,i/64*360);return[p.longitude,p.latitude];}const angle=i/64*Math.PI*2;return coordinates({x:player.x+Math.sin(angle)*player.accuracy,y:player.y+Math.cos(angle)*player.accuracy});});
  return collection([feature({type:'Polygon',coordinates:[ring]},{precise:player.precise})]);
}
export function overlayData(game: GameState, others: Record<string,number>, center: Point, width: number, height: number, scale: number) {
  const explored=visitAreas(game.visits,others,center,width,height,scale);
  const visits=collection(explored.areas.map(a=>feature({type:'Polygon',coordinates:[ring(a.x,a.y,a.size)]},{owner:a.mine&&a.others?'both':a.mine?'mine':'others'})));
  const cells=visibleGameTiles(center,width,height,scale,game);
  const grid=collection(cells.map(([i,j])=>feature({type:'Polygon',coordinates:[ring(i*250,j*250,250)]})));
  return {visits,grid,cells};
}
export const boundaryData = collection([feature({type:'MultiPolygon',coordinates:RELEASE_FEATURES.nationalExploration?FINLAND.polygons.map(p=>[p.outer,...p.holes]):JYVASKYLA.polygons.map(p=>[p.outer,...p.holes].map(r=>{const coords=r.map(([x,y])=>coordinates({x,y}));return [...coords,coords[0]];}))})]);
export function claimsData(claims:TileClaims,ownerId?:string,selectedId?:string){
  return collection(Object.entries(claims).filter(([id])=>tilePoint(id)).map(([id,c])=>{
    const [i,j]=id.split(',').map(Number);
    return feature({type:'Polygon',coordinates:[ring(i*250,j*250,250)]},{mine:c.ownerId===ownerId,owner:c.ownerName,price:c.pricePaid,selected:id===selectedId});
  }));
}
export function selectedTileData(id?:string){if(!id||!tilePoint(id))return collection();const [i,j]=id.split(',').map(Number);return collection([feature({type:'Polygon',coordinates:[ring(i*250,j*250,250)]})]);}
