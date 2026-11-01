// Reproducible fallback build for the existing managed dev source repository.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'.openai/hosting.json'),'utf8'));
if(manifest.project_id!=='appgprj_6ae5c02d5c008191b51fda4f4f39c7a5')throw new Error('This builder is restricted to the development Site');
if(!process.env.npm_execpath)throw new Error('Run through npm run build');
for(const folder of ['mobile','dev-server']){const run=spawnSync(process.execPath,[process.env.npm_execpath,'ci'],{cwd:path.join(root,folder),stdio:'inherit',env:process.env});if(run.status!==0)process.exit(run.status||1);}
const build=spawnSync(process.execPath,[path.join(root,'tools/Build-SharedDev.cjs')],{cwd:root,stdio:'inherit',env:process.env});if(build.status!==0)process.exit(build.status||1);
require('./SharedDev-Assets.cjs').resetOutput(root,path.join(root,'dist'));fs.cpSync(path.join(root,'.tools/shared-dev-build'),path.join(root,'dist'),{recursive:true});
