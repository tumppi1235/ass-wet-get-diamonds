import type {RoutePlan} from './route-plan';
function xml(value:string){
  return Array.from(value.slice(0,500)).filter(char=>{const n=char.codePointAt(0)!;return n===9||n===10||n===13||n>=32&&n<=0xd7ff||n>=0xe000&&n<=0xfffd||n>=0x10000&&n<=0x10ffff;}).join('').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
}
/** GPX 1.1 navigation track. No recording times, elevations, effort or reward evidence. */
export function plannedRouteGpx(plan:RoutePlan){
  if(plan.result.status!=='ready'||plan.result.kind!=='planned-map-route'||!plan.sourceDate||!plan.source||plan.result.points.length<2||plan.result.points.length>20000)throw new Error('Choose a mapped route before exporting');
  const points=plan.result.points.map(point=>{
    if(!Number.isFinite(point.latitude)||!Number.isFinite(point.longitude)||Math.abs(point.latitude)>90||point.longitude< -180||point.longitude>=180)throw new Error('Invalid GPX coordinate');
    return `<trkpt lat="${point.latitude.toFixed(7)}" lon="${point.longitude.toFixed(7)}"/>`;
  }).join('\n');
  const name=xml('Planned route: '+plan.destination),description=xml(`Planned navigation only; not a recorded activity. Mapped access and conditions need checking. OSM source ${plan.sourceDate}; policy ${plan.policy}; region revision ${plan.regionsRevision}. Start/end offsets are excluded; no connector legs, activity distance, effort, XP or collection claims.`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Trail Relics development route planner" xmlns="http://www.topografix.com/GPX/1/1">
<metadata><name>${name}</name><desc>${description}</desc><copyright author="OpenStreetMap contributors"><license>https://opendatacommons.org/licenses/odbl/1-0/</license></copyright><link href="https://www.openstreetmap.org/copyright"><text>© OpenStreetMap contributors</text></link></metadata>
<trk><name>${name}</name><desc>${description}</desc><type>planned-route</type><trkseg>
${points}
</trkseg></trk></gpx>\n`;
}
