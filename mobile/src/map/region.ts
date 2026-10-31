import boundary from '../../assets/jyvaskyla-boundary.json';
import G from '../game/engine';
import {RELEASE_FEATURES} from '../config/features';
import {isInFinland,intersectsFinland} from './country';
export type Point = { x: number; y: number };
export const JYVASKYLA = boundary;
export const GAME_REGION=RELEASE_FEATURES.nationalExploration?'Finland':'Jyväskylä';
export function isPlayablePoint(point:Point){const p=G.geo(point.x,point.y);return RELEASE_FEATURES.nationalExploration?isInFinland(p.lat,p.lon):isInJyvaskyla(point);}
const tileEligibility=new Map<string,boolean>();
export function isPlayableCell(i:number,j:number){
  const center={x:(i+.5)*250,y:(j+.5)*250};
  if(!RELEASE_FEATURES.nationalExploration)return isInJyvaskyla(center);
  const key=G.key(i,j),cached=tileEligibility.get(key);if(cached!==undefined)return cached;
  const sw=G.geo(i*250,j*250),ne=G.geo((i+1)*250,(j+1)*250);
  const valid=intersectsFinland(sw.lon,sw.lat,ne.lon,ne.lat);
  if(tileEligibility.size>=2048)tileEligibility.delete(tileEligibility.keys().next().value!);
  tileEligibility.set(key,valid);return valid;
}
function inRing(p: Point, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j], cross = (p.x - a[0]) * (b[1] - a[1]) - (p.y - a[1]) * (b[0] - a[0]);
    if (Math.abs(cross) < .01 && p.x >= Math.min(a[0], b[0]) && p.x <= Math.max(a[0], b[0]) && p.y >= Math.min(a[1], b[1]) && p.y <= Math.max(a[1], b[1])) return true;
    if ((a[1] > p.y) !== (b[1] > p.y) && p.x < (b[0] - a[0]) * (p.y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
export function isInJyvaskyla(point: Point) {
  const [west, south, east, north] = JYVASKYLA.bounds;
  if (point.x < west || point.x > east || point.y < south || point.y > north) return false;
  return JYVASKYLA.polygons.some(p => inRing(point, p.outer) && !p.holes.some(h => inRing(point, h)));
}
export function fitJyvaskyla(width: number, height: number) {
  const [west, south, east, north] = JYVASKYLA.bounds;
  return { center: { x: (west + east) / 2, y: (south + north) / 2 }, scale: Math.min(width / (east - west), height / (north - south)) * .9 };
}
export function visibleGameTiles(center: Point, width: number, height: number, scale: number, current?: Point): [number, number][] {
  const halfW = width / scale / 2, halfH = height / scale / 2;
  const i0 = Math.floor((center.x - halfW) / 250), i1 = Math.floor((center.x + halfW) / 250), j0 = Math.floor((center.y - halfH) / 250), j1 = Math.floor((center.y + halfH) / 250);
  if ((i1 - i0 + 1) * (j1 - j0 + 1) > 400) return [];
  const here = current && isPlayablePoint(current) ? G.cell(current.x, current.y) : null;
  const result: [number, number][] = [];
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (isPlayableCell(i,j) || (here?.i === i && here.j === j)) result.push([i, j]);
  return result;
}
