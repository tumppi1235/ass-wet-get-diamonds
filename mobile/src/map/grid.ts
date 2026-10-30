import type { Point } from './region';
export function gridForView(center: Point, width: number, height: number, scale: number) {
  if (250 * scale < 12) return '';
  const west = center.x - width / scale / 2, east = center.x + width / scale / 2, south = center.y - height / scale / 2, north = center.y + height / scale / 2;
  const lines: string[] = [];
  for (let x = Math.ceil(west / 250) * 250; x <= east; x += 250) lines.push(`M${x},${-south}V${-north}`);
  for (let y = Math.ceil(south / 250) * 250; y <= north; y += 250) lines.push(`M${west},${-y}H${east}`);
  return lines.join('');
}
