// Runtime-only reproducible input: immutable, fully checksummed national data; never dev gameplay rows.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function stage(root,client){
  const code=fs.readFileSync(path.join(root,'dev-server/trail/route-assets.ts'),'utf8'),sha=code.match(/ROUTE_MANIFEST_SHA='([a-f0-9]{64})'/)?.[1],sourceSha=code.match(/ROUTE_SOURCE_MANIFEST_SHA='([a-f0-9]{64})'/)?.[1];if(!sha||!sourceSha)throw Error('Missing immutable route pins');
  const runtime=[path.join(root,'.tools/finland-routing-runtime-v2'),path.join(root,'route-runtime')].find(p=>fs.existsSync(path.join(p,'manifest.json'))),canonical=[path.join(root,'.tools/finland-routing-dev-1/manifest.json'),path.join(root,'route-source-manifest.json')].find(p=>fs.existsSync(p));
  if(!runtime||!canonical){if(process.env.CI){console.log('No national route input in CI; no fixture substituted.');return null;}throw Error('Complete production route inputs are required');}
  const raw=fs.readFileSync(path.join(runtime,'manifest.json')),original=fs.readFileSync(canonical);if(hash(raw)!==sha||hash(original)!==sourceSha)throw Error('Route source identity changed');
  const manifest=JSON.parse(raw),source=JSON.parse(original);if(manifest.version!==2||manifest.sourceManifestSha256!==sourceSha||Object.keys(manifest.chunks).length!==Object.keys(source.chunks).length)throw Error('Incomplete runtime');
  const target=path.join(client,'routing',sha);fs.mkdirSync(target,{recursive:true});
  for(const[key,info]of Object.entries(manifest.chunks)){if(!/^\d+_\d+$/.test(key)||source.chunks[key]?.edges!==info.edges)throw Error('Invalid route chunk');const input=path.join(runtime,key+(fs.existsSync(path.join(runtime,key+'.bin'))?'.bin':'.json.gz')),bytes=fs.readFileSync(input);if(bytes.length!==info.bytes||hash(bytes)!==info.sha256)throw Error('Route checksum mismatch: '+key);fs.writeFileSync(path.join(target,key+'.bin'),bytes);}
  fs.writeFileSync(path.join(target,'manifest.json'),raw);fs.writeFileSync(path.join(target,'README.txt'),'© OpenStreetMap contributors, ODbL-1.0. Complete public derived national route geometry; original source/timestamp/checksums in manifest.json. Reproduction and audit: https://github.com/tumppi1235/ass-wet-get-diamonds/blob/main/docs/DEV-ROUTING.md\nNo player data or reward records.\n');
  console.log('Staged complete production route network: '+Object.keys(manifest.chunks).length+' chunks.');return{runtime,canonical};
}
module.exports={stage};
