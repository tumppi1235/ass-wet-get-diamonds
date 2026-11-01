// Derived public OSM data only. Never access game DBs, credentials or production dist.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function stage(root,client){
  const code=fs.readFileSync(path.join(root,'dev-server/trail/route-assets.ts'),'utf8'),sha=code.match(/ROUTE_MANIFEST_SHA='([a-f0-9]{64})'/)?.[1];
  if(!sha)throw new Error('Missing pinned route manifest');
  const source=[path.join(root,'.tools/finland-routing-dev-1'),path.join(root,'route-network')].find(folder=>fs.existsSync(path.join(folder,'manifest.json')));
  if(!source){console.log('No offline route dataset: route API will report data-unavailable; no partial fixture is staged.');return null;}
  const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),raw=fs.readFileSync(path.join(source,'manifest.json'));
  if(hash(raw)!==sha)throw new Error('Route source manifest does not match the pinned network');
  const manifest=JSON.parse(raw),target=path.join(client,'routing',sha);fs.mkdirSync(target,{recursive:true});
  for(const[key,info]of Object.entries(manifest.chunks)){
    if(!/^\d+_\d+$/.test(key))throw new Error('Invalid route source key');
    const name=key+'.json.gz',bytes=fs.readFileSync(path.join(source,name));
    if(bytes.length!==info.bytes||hash(bytes)!==info.sha256)throw new Error('Incomplete or changed route dataset: '+key);
    const legacy=path.resolve(target,name),relative=path.relative(path.resolve(client),legacy);
    if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Route output escaped its generated client directory');
    if(fs.existsSync(legacy))fs.rmSync(legacy); // only this known generated file; never source input
    const output=path.join(target,key+'.bin');
    if(!fs.existsSync(output)||hash(fs.readFileSync(output))!==info.sha256)fs.writeFileSync(output,bytes);
  }
  fs.writeFileSync(path.join(target,'manifest.json'),raw);
  fs.writeFileSync(path.join(target,'README.txt'),'Public derived map database: © OpenStreetMap contributors, ODbL-1.0. Source and timestamp: manifest.json. Reproduction: https://github.com/tumppi1235/ass-wet-get-diamonds/blob/develop/docs/DEV-ROUTING.md\nNo player locations, history or reward records.\n');
  console.log('Staged complete immutable national route network: '+Object.keys(manifest.chunks).length+' chunks.');return{source,target,sha};
}
module.exports={stage};
