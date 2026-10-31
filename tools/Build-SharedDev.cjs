// Build the Expo game plus isolated Sites Worker without touching legacy dist/ or production hosting.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),mobile=path.join(root,'mobile'),server=path.join(root,'dev-server');
function run(script,args=[],cwd=root){const r=spawnSync(process.execPath,[script,...args],{cwd,env:{...process.env,EXPO_PUBLIC_APP_ENV:'development'},stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
const manifest=JSON.parse(fs.readFileSync(path.join(server,'.openai/hosting.json'),'utf8'));
if(manifest.project_id!=='appgprj_6ae5c02d5c008191b51fda4f4f39c7a5'||manifest.static||manifest.d1!=='DB')throw new Error('Shared build must target the existing dev Worker and its isolated DB');
if(!process.argv.includes('--reuse-game')){
  run(path.join(root,'tools/Build-RetroMap.cjs'));run(path.join(root,'tools/Build-RetroStyle.cjs'));
  run(path.join(mobile,'node_modules/expo/bin/cli'),['export','--platform','web'],mobile);
}
const html=fs.readFileSync(path.join(mobile,'dist/index.html'),'utf8'),common=html.match(/src="([^"]*__common[^"]*)"/)[1];
const bundle=fs.readFileSync(path.join(mobile,'dist',common),'utf8');
if(!bundle.includes('t("development")'))throw new Error('Refusing to bundle a non-development game export');
fs.cpSync(path.join(mobile,'dist'),path.join(server,'game-export'),{recursive:true});
run(path.join(server,'scripts/run-framework.mjs'),['build'],server);
const out=path.join(root,'.tools/shared-dev-build');fs.mkdirSync(out,{recursive:true});fs.cpSync(path.join(server,'dist'),out,{recursive:true});
const sha=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim();
fs.writeFileSync(path.join(out,'client/release.json'),JSON.stringify({sourceCommit:sha,environment:'development',release:'shared-dev-world',features:{sharedWorld:true,liveCompass:true},deviceTests:'Physical validation pending',saveNamespace:'trail-relics.dev.profiles.v1'},null,2));
console.log('Shared development artifact: '+out);
