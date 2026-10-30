import type { Point } from './region';
export function visitAreas(mine: Record<string, number>, others: Record<string, number>, center: Point, width: number, height: number, scale: number) {
  const step = 2 ** Math.max(0, Math.ceil(Math.log2(12 / (250 * scale)))), size = 250 * step;
  const west = center.x - width / scale / 2, east = center.x + width / scale / 2, south = center.y - height / scale / 2, north = center.y + height / scale / 2;
  const groups = new Map<string, { x: number; y: number; size: number; mine: boolean; others: boolean }>();
  for (const [visits, own] of [[mine, true], [others, false]] as const) for (const [key, count] of Object.entries(visits)) {
    if (!(count > 0) || !Number.isFinite(count) || !/^-?\d+,-?\d+$/.test(key)) continue;
    const [i, j] = key.split(',').map(Number); if (!Number.isSafeInteger(i) || !Number.isSafeInteger(j)) continue;
    const x = Math.floor(i / step) * size, y = Math.floor(j / step) * size;
    if (x > east || x + size < west || y > north || y + size < south) continue;
    const id = `${x},${y}`, group = groups.get(id) || { x, y, size, mine: false, others: false };
    if (own) group.mine = true; else group.others = true; groups.set(id, group);
  }
  return { size, areas: [...groups.values()] };
}
export function mapDetail(scale: number) { return scale < .04 ? 'region' : scale < .18 ? 'district' : 'street'; }
