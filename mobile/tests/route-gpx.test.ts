import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {plannedRouteGpx} from '../src/game/route-gpx';
import type {RoutePlan} from '../src/game/route-plan';
const plan:RoutePlan={generatedAt:1000,preview:true,originName:'Public preview',destination:'Jyväskylä & <Harju> "path"\u0001',policy:'finland-paths-dev-1',regionsRevision:'test-regions',awardsWritten:0,sourceDate:'2026-10-30T21:24:51Z',source:'verified-source',result:{status:'ready',kind:'planned-map-route',points:[{nodeId:1,latitude:62.24,longitude:25.74},{nodeId:2,latitude:62.241,longitude:25.741},{nodeId:3,latitude:62.242,longitude:25.74}],meters:400,startOffsetMeters:45,endOffsetMeters:55,wayIds:[1]}};

test('TR-098 GPX independently parses as namespaced XML with ordered mapped geometry, escaped labels and no recorded effort',()=>{
  const output=plannedRouteGpx(plan),venv=fileURLToPath(new URL('../../.tools/graphify-venv/Scripts/python.exe',import.meta.url));
  const python=process.env.TRAIL_TEST_PYTHON||(process.platform==='win32'?(existsSync(venv)?venv:'python'):'python3');
  const script=`import sys,json,xml.etree.ElementTree as E
r=E.fromstring(sys.stdin.buffer.read());n={'g':'http://www.topografix.com/GPX/1/1'}
print(json.dumps({'tag':r.tag,'version':r.attrib['version'],'name':r.find('g:metadata/g:name',n).text,'points':[[float(p.attrib['lat']),float(p.attrib['lon'])] for p in r.findall('g:trk/g:trkseg/g:trkpt',n)],'type':r.find('g:trk/g:type',n).text,'times':len(r.findall('.//g:time',n)),'elevations':len(r.findall('.//g:ele',n)),'extensions':len(r.findall('.//g:extensions',n)),'license':r.find('g:metadata/g:copyright/g:license',n).text}))`;
  const parsed=spawnSync(python,['-c',script],{input:output,encoding:'utf8'});assert.equal(parsed.status,0,parsed.stderr||parsed.error?.message||'XML parser failed');
  const actual=JSON.parse(parsed.stdout);assert.equal(actual.tag,'{http://www.topografix.com/GPX/1/1}gpx');assert.equal(actual.version,'1.1');assert.equal(actual.name,'Planned route: Jyväskylä & <Harju> "path"');assert.deepEqual(actual.points,[[62.24,25.74],[62.241,25.741],[62.242,25.74]]);assert.equal(actual.type,'planned-route');assert.equal(actual.times,0);assert.equal(actual.elevations,0);assert.equal(actual.extensions,0);assert.equal(actual.license,'https://opendatacommons.org/licenses/odbl/1-0/');
  assert.ok(output.includes('not a recorded activity'));assert.equal(JSON.stringify(plan.result).includes('distanceCredit'),false);
});

test('TR-098 unavailable, unsourced, oversized and non-WGS84 planned tracks cannot be exported',()=>{
  assert.throws(()=>plannedRouteGpx({...plan,result:{status:'unavailable',reason:'disconnected'}}));assert.throws(()=>plannedRouteGpx({...plan,sourceDate:undefined}));
  if(plan.result.status!=='ready')return;
  const ready=plan.result;
  for(const point of [{nodeId:1,latitude:NaN,longitude:25},{nodeId:1,latitude:91,longitude:25},{nodeId:1,latitude:62,longitude:180}])assert.throws(()=>plannedRouteGpx({...plan,result:{...ready,points:[point,ready.points[1]]}}),/Invalid GPX/);
  assert.throws(()=>plannedRouteGpx({...plan,result:{...ready,points:[]}}));assert.throws(()=>plannedRouteGpx({...plan,result:{...ready,points:Array.from({length:20001},()=>ready.points[0])}}));
});
