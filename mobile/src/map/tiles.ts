import G from '../game/engine';
import type { Point } from './region';
export type MapStyle = 'outdoor' | 'street' | 'offline';
export type Tile = { key: string; url: string; west: number; north: number; width: number; height: number };
const metersPerLongitudeDegree = 111320 * Math.cos(62.2415 * Math.PI / 180);
export const MAP_PROVIDERS = {
  outdoor: { url: process.env.EXPO_PUBLIC_OUTDOOR_TILE_URL || 'https://a.tile.opentopomap.org/{z}/{x}/{y}.png', maxZoom: 17, attribution: '© OpenStreetMap contributors, SRTM · OpenTopoMap (CC-BY-SA)', copyright: 'https://opentopomap.org/about' },
  street: { url: process.env.EXPO_PUBLIC_STREET_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, attribution: '© OpenStreetMap contributors', copyright: 'https://www.openstreetmap.org/copyright' },
};
export function tilesForView(center: Point, width: number, height: number, scale: number, style: Exclude<MapStyle, 'offline'>): Tile[] {
  const provider = MAP_PROVIDERS[style], z = Math.max(3, Math.min(provider.maxZoom, Math.round(Math.log2(scale * metersPerLongitudeDegree * 360 / 256)))), n = 2 ** z;
  const nw = G.geo(center.x - width / scale / 2, center.y + height / scale / 2), se = G.geo(center.x + width / scale / 2, center.y - height / scale / 2);
  const tx = (lon: number) => Math.max(0, Math.min(n - 1, Math.floor((lon + 180) / 360 * n)));
  const ty = (lat: number) => { const rad = Math.max(-85.05112878, Math.min(85.05112878, lat)) * Math.PI / 180; return Math.max(0, Math.min(n - 1, Math.floor((1 - Math.asinh(Math.tan(rad)) / Math.PI) / 2 * n))); };
  const latitude = (y: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
  const result: Tile[] = [];
  for (let x = tx(nw.lon); x <= tx(se.lon); x++) for (let y = ty(nw.lat); y <= ty(se.lat); y++) {
    const a = G.xy(latitude(y), x / n * 360 - 180), b = G.xy(latitude(y + 1), (x + 1) / n * 360 - 180);
    result.push({ key: `${style}/${z}/${x}/${y}`, url: provider.url.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)), west: a.x, north: a.y, width: b.x - a.x, height: a.y - b.y });
  }
  return result;
}
