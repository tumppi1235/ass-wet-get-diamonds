// Existing public Site only; separate production DB is provisioned from its own manifest.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),host=path.join(root,'.tools/trail-relics-host'),artifact=path.join(root,'.tools/shared-prod-build'),manifest=JSON.parse(fs.readFileSync(path.join(root,'tools/hosting-production.json'),'utf8'));
if(manifest.project_id!=='appgprj_6ae4783f8fcc8191a8e97464e8375938'||JSON.parse(fs.readFileSync(path.join(host,'.openai/hosting.json'),'utf8')).project_id!==manifest.project_id)throw Error('Wrong production Site');
const release=JSON.parse(fs.readFileSync(path.join(artifact,'client/release.json'),'utf8'));if(release.environment!=='production'||release.saveNamespace!=='trail-relics.profiles.v1')throw Error('Wrong production artifact');
for(const name of spawnSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).stdout.split('\0').filter(Boolean)){
  if(!/^(dev-server\/|mobile\/|tools\/|public\/(engine\.js|streets\.js|streets-osm\.json)$)/.test(name))continue;const source=path.join(root,name),target=path.join(host,name);if(!fs.statSync(source).isFile())continue;fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);
}
for(const name of ['.openai/hosting.json','dev-server/.openai/hosting.json']){const target=path.join(host,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(manifest,null,2));}
fs.writeFileSync(path.join(host,'package.json'),JSON.stringify({name:'trail-relics-production-world',private:true,scripts:{build:'node tools/Build-HostedProduction.cjs'}},null,2));
fs.writeFileSync(path.join(host,'.gitignore'),'node_modules/\n**/node_modules/\n.tools/\n**/.env*\n**/.dev.vars*\n**/.wrangler/\n**/.next/\n**/game-export/\n**/test-results/\n');
const cache=fs.existsSync(path.join(host,'dist/client'))?path.join(host,'dist/client'):path.join(host,'dist');require('./SharedDev-Assets.cjs').retainProduction(path.join(artifact,'client'),cache);
require('./Stage-ProductionRoutes.cjs').stage(root,path.join(artifact,'client'));
require('./SharedDev-Assets.cjs').resetOutput(host,path.join(host,'dist'));fs.cpSync(artifact,path.join(host,'dist'),{recursive:true});console.log('Prepared existing public production Site. Dev DB/data and phone-local saves were not copied.');
