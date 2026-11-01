// Mirror reproducible source plus the verified Worker artifact into the existing dev Site checkout.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),host=path.join(root,'.tools/trail-relics-dev-host'),artifact=path.join(root,'.tools/shared-dev-build');
const manifest=JSON.parse(fs.readFileSync(path.join(host,'.openai/hosting.json'),'utf8'));
if(manifest.project_id!=='appgprj_6ae5c02d5c008191b51fda4f4f39c7a5')throw new Error('Refusing to modify any other Site');
const paths=spawnSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).stdout.split('\0').filter(Boolean);
for(const name of paths){if(!/^(dev-server\/|mobile\/|tools\/|public\/(engine\.js|streets\.js|streets-osm\.json)$)/.test(name))continue;const source=path.join(root,name),target=path.join(host,name);if(!fs.statSync(source).isFile())continue;fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);}
fs.mkdirSync(path.join(host,'dev-server/.openai'),{recursive:true});fs.copyFileSync(path.join(root,'dev-server/.openai/hosting.json'),path.join(host,'dev-server/.openai/hosting.json'));
fs.copyFileSync(path.join(root,'dev-server/.openai/hosting.json'),path.join(host,'.openai/hosting.json'));
fs.writeFileSync(path.join(host,'package.json'),JSON.stringify({name:'trail-relics-shared-dev-host',private:true,scripts:{build:'node tools/Build-HostedSharedDev.cjs'}},null,2));
// Worker builds put public assets under dist/client; retain previous lazy bundles for tabs already open.
require('./SharedDev-Assets.cjs').retainReleased(root,path.join(artifact,'client'),path.join(host,'dist/client'),true);
// Retain the exact derived input in the managed source repository so provider
// rebuilds reproduce the complete graph, rather than a city/test-only fixture.
const network=require('./Stage-RouteAssets.cjs').stage(root,path.join(artifact,'client'));
if(network)fs.cpSync(network.source,path.join(host,'route-network'),{recursive:true});
require('./SharedDev-Assets.cjs').resetOutput(host,path.join(host,'dist'));fs.cpSync(artifact,path.join(host,'dist'),{recursive:true});
console.log('Prepared existing development Site source and Worker artifact. Production untouched.');
