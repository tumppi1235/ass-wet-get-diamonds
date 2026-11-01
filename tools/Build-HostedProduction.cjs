const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'.openai/hosting.json'),'utf8'));
if(manifest.project_id!=='appgprj_6ae4783f8fcc8191a8e97464e8375938'||!process.env.npm_execpath)throw Error('Use npm run build in the existing production Site');
for(const folder of ['mobile','dev-server']){const r=spawnSync(process.execPath,[process.env.npm_execpath,'ci'],{cwd:path.join(root,folder),stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
const r=spawnSync(process.execPath,[path.join(root,'tools/Build-SharedDev.cjs'),'--production'],{cwd:root,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
require('./SharedDev-Assets.cjs').resetOutput(root,path.join(root,'dist'));fs.cpSync(path.join(root,'.tools/shared-prod-build'),path.join(root,'dist'),{recursive:true});
