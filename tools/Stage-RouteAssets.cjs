// Derived public OSM data only. Never access game DBs, credentials or production dist.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function pruneUnpublished(root,client,sourceSha){
  // This exact v1 dataset was rejected before deployment (including version 23).
  // Remove only known generated files, retaining canonical inputs and Git history.
  const base=fs.realpathSync(root),dir=fs.realpathSync(client),relative=path.relative(base,dir);
  if(relative.startsWith('..')||path.isAbsolute(relative)||!/^[a-f0-9]{64}$/.test(sourceSha))throw Error('Unsafe route output path');
  const obsolete=path.resolve(dir,'routing',sourceSha);
  if(!fs.existsSync(obsolete))return;
  if(fs.lstatSync(obsolete).isSymbolicLink()||path.dirname(obsolete)!==path.join(dir,'routing'))throw Error('Unsafe obsolete output');
  const names=fs.readdirSync(obsolete);
  if(names.some(name=>!/^\d+_\d+\.(?:bin|json\.gz)$/.test(name)&&!['manifest.json','README.txt'].includes(name)))throw Error('Unexpected obsolete route file');
  for(const name of names){const file=path.join(obsolete,name);if(!fs.lstatSync(file).isFile())throw Error('Unexpected route directory');fs.unlinkSync(file);}
  fs.rmdirSync(obsolete);
}
function stage(root,client){
  const code=fs.readFileSync(path.join(root,'dev-server/trail/route-assets.ts'),'utf8'),sha=code.match(/ROUTE_MANIFEST_SHA='([a-f0-9]{64})'/)?.[1],sourceSha=code.match(/ROUTE_SOURCE_MANIFEST_SHA='([a-f0-9]{64})'/)?.[1];
  if(!sha||!sourceSha||sha===sourceSha)throw Error('Missing compact runtime pin');
  const source=[path.join(root,'.tools/finland-routing-dev-1'),path.join(root,'route-network')].find(folder=>fs.existsSync(path.join(folder,'manifest.json')));
  if(!source){console.log('No offline route dataset: route API will report data-unavailable; no partial fixture is staged.');return null;}
  const runtimeSource=[path.join(root,'.tools/finland-routing-runtime-v2'),path.join(root,'dist/client/routing',sha)].find(folder=>fs.existsSync(path.join(folder,'manifest.json')));
  if(!runtimeSource)throw Error('Pack the complete canonical route network before staging');
  const canonicalRaw=fs.readFileSync(path.join(source,'manifest.json')),raw=fs.readFileSync(path.join(runtimeSource,'manifest.json'));
  if(hash(canonicalRaw)!==sourceSha||hash(raw)!==sha)throw Error('Route manifests do not match pinned data');
  const canonical=JSON.parse(canonicalRaw),manifest=JSON.parse(raw);
  if(manifest.version!==2||manifest.encoding!=='delta-e7-v1'||manifest.sourceManifestSha256!==sourceSha||Object.keys(manifest.chunks).length!==Object.keys(canonical.chunks).length)throw Error('Incomplete runtime network');
  fs.mkdirSync(client,{recursive:true});pruneUnpublished(root,client,sourceSha);
  const target=path.join(client,'routing',sha);fs.mkdirSync(target,{recursive:true});
  for(const[key,info]of Object.entries(manifest.chunks)){
    if(!/^\d+_\d+$/.test(key))throw Error('Invalid route key');
    const original=canonical.chunks[key],input=fs.readFileSync(path.join(source,key+'.json.gz'));
    if(!original||original.edges!==info.edges||input.length!==original.bytes||hash(input)!==original.sha256)throw Error('Canonical source changed: '+key);
    const name=fs.existsSync(path.join(runtimeSource,key+'.json.gz'))?key+'.json.gz':key+'.bin';
    const bytes=fs.readFileSync(path.join(runtimeSource,name));
    if(bytes.length!==info.bytes||hash(bytes)!==info.sha256)throw Error('Runtime source changed: '+key);
    const output=path.join(target,key+'.bin');
    if(!fs.existsSync(output)||hash(fs.readFileSync(output))!==info.sha256)fs.writeFileSync(output,bytes);
  }
  fs.writeFileSync(path.join(target,'manifest.json'),raw);
  fs.writeFileSync(path.join(target,'README.txt'),'Public derived map database: © OpenStreetMap contributors, ODbL-1.0. Complete original source and timestamp: manifest.json. Runtime delta geometry preserves source node IDs, coordinates, modes and direction. Reproduction: https://github.com/tumppi1235/ass-wet-get-diamonds/blob/develop/docs/DEV-ROUTING.md\nNo player locations, history or reward records.\n');
  console.log('Staged complete compact national route network: '+Object.keys(manifest.chunks).length+' chunks.');return{source,runtimeSource,target,sha};
}
module.exports={stage,pruneUnpublished};
