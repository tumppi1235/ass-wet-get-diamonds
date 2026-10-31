import React from 'react';
import Svg, { G as Group, Path } from 'react-native-svg';
import itemArt from '../../assets/pixel-items/art.json';
const items: Record<string, { fill: string; d: string }[]> = itemArt;
export const iconForRelic = (name = '') => ({ Compass: 'relic', Rune: 'rune', Stone: 'stone', Shard: 'crystal', Crystal: 'crystal', Crown: 'mythic', Mythic: 'mythic', Key: 'key', Lantern: 'lantern' }[name] || name.toLowerCase());
const sprites: Record<string, string[]> = {
  coin: ['.....OOOOOO.....','...OOYYYYYYOO...','..OYYLLLLYYSSO..','.OYYLLYYLLYYSSO.','.OYLLOOOLLYYSSO.','OYYLLOYYOLYYSSSO','OYLLLOYLLLYYSSSO','OYLLLOOLLLYYSSSO','OYLLLLOOLLYYSSSO','OYLLLOYOOLYYSSSO','OYYLLOYYOLYYSSSO','.OYLLOOOLLYYSSO.','.OYYLLLLLLYYSSO.','..OYYYYYYYYSSO..','...OOSSSSSSOO...','.....OOOOOO.....'],
  compass: ['......OOOO......','......OYYO......','....OOOLLOOO....','...OYYYYYYYYO...','..OYYYOOOYYYYO..','.OYYYOOLLOYYYYO.','.OYYOOLLLLOYYYO.','OYYOOLLLLLOYYYYO','OYYOYYYYLLOYYYYO','.OYYOYYYLOOYYYO.','.OYYYOOOOLYYYYO.','..OYYYYYYYYYYO..','...OYYYYYYYYO...','....OOOOOOOO....','......OYYO......','......OOOO......'],
  gem: ['....OOOOOOOO....','...OLLLLLLLLO...','..OLLYYYYLLLLO..','.OLLYYYYYYLLLLO.','OYYYYYYYYYYYYYYO','.OYYYYYYYYSSSSO.','..OYYYYYYSSSSO..','...OYYYYSSSSO...','....OYYYSSSO....','.....OYYSSO.....','......OYSO......','.......OO.......'],
  crown: ['.OO....OO....OO.','.OLO...OLO...OLO','.OYLO.OYYLO.OYLO','.OYYLOYYYYLOYYSO','..OYYYYYYYYYSSO.','..OYYYYYYYYYSSO.','..OLLYYLLYYLSSO.','..OYYYYYYYYYSSO.','..OOOOOOOOOOOO..','..OLLLLLLLLSSO..','..OYYYYYYYYSSO..','..OOOOOOOOOOOO..'],
  boots: ['....OOOOOO......','....OLLLYO......','....OYYYYO......','....OYYYYO......','....OYYSSO......','....OYYYYOOOO...','....OYYYYYYYOO..','...OYYYYYYYYYSO.','..OYYYYYYYYSSSO.','..OOOOOOOOOOOO..','..OYYYYYYYYSSSO.','..OOOOOOOOOOOO..'],
  lantern: ['......OOOO......','.....OYYYO......','.....OYYYO......','....OOOOOOO.....','....OLLLYYO.....','....OYYLYYO.....','....OYYLYYO.....','....OYYLYYO.....','....OYYLYYO.....','....OYYYYYO.....','....OOOOOOO.....','.....OYYYO......','....OOOOOOO.....'],
  key: ['..OOOOO.........','.OLLLYYO........','OLYYYYYSO.......','OLYYOYYSSO......','OLYYOYYSSO......','.OYYYSSSO.......','..OOSSOO........','....OYYO........','....OYYOOOO.....','....OYYYYYO.....','....OYYOOOO.....','....OYYO........','....OOOO........'],
};
export function PixelGlyph({ name = 'relic', tone = 'gold' }: { name?: string; tone?: 'gold' | 'blue' | 'green' }) {
  const normalized = ({ compass: 'relic', gem: 'crystal', crown: 'mythic' } as Record<string, string>)[name] || name;
  const artwork = items[normalized];
  if (artwork) return <Group>{artwork.map(path => <Path key={path.fill} fill={path.fill} d={path.d} />)}</Group>;
  const rows = sprites[name] || sprites.gem, palette = { O: '#191C24', L: '#FFF1B6', Y: tone === 'blue' ? '#78DAD2' : tone === 'green' ? '#B2D17A' : '#E8BA54', S: tone === 'blue' ? '#327E9A' : tone === 'green' ? '#5C8A55' : '#A96635' };
  return <Group scale={2}>{Object.entries(palette).map(([symbol, fill]) => <Path key={symbol} fill={fill} d={rows.flatMap((row, y) => [...row].flatMap((pixel, x) => pixel === symbol ? [`M${x} ${y}h1v1h-1z`] : [])).join('')} />)}</Group>;
}
export function PixelIcon({ name = 'relic', size = 40, tone = 'gold' }: { name?: string; size?: number; tone?: 'gold' | 'blue' | 'green' }) {
  return <Svg width={size} height={size} viewBox="0 0 32 32"><PixelGlyph name={name} tone={tone} /></Svg>;
}
