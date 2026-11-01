// Build the Expo game plus isolated Sites Worker without touching legacy dist/ or production hosting.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),mobile=path.join(root,'mobile'),server=path.join(root,'dev-server'),production=process.argv.includes('--production'),environment=production?'production':'development';
function run(script,args=[],cwd=root){const r=spawnSync(process.execPath,[script,...args],{cwd,env:{...process.env,EXPO_PUBLIC_APP_ENV:environment},stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
const sourceManifest=JSON.parse(fs.readFileSync(path.join(server,'.openai/hosting.json'),'utf8')),manifest=production?JSON.parse(fs.readFileSync(path.join(root,'tools/hosting-production.json'),'utf8')):sourceManifest;
if(!['appgprj_6ae4783f8fcc8191a8e97464e8375938','appgprj_6ae5c02d5c008191b51fda4f4f39c7a5'].includes(sourceManifest.project_id))throw Error('Unknown source project');
if(manifest.project_id!==(production?'appgprj_6ae4783f8fcc8191a8e97464e8375938':'appgprj_6ae5c02d5c008191b51fda4f4f39c7a5')||manifest.static||manifest.d1!=='DB')throw new Error('Shared build must target the existing dev Worker and its isolated DB');
if(!process.argv.includes('--reuse-game')){
  run(path.join(root,'tools/Build-RetroMap.cjs'));run(path.join(root,'tools/Build-RetroStyle.cjs'));
  run(path.join(mobile,'node_modules/expo/bin/cli'),['export','--platform','web'],mobile);
}
const html=fs.readFileSync(path.join(mobile,'dist/index.html'),'utf8'),common=html.match(/src="([^"]*__common[^"]*)"/)[1];
const bundle=fs.readFileSync(path.join(mobile,'dist',common),'utf8');
if(!bundle.includes('t("'+environment+'")'))throw new Error('Refusing to bundle a non-development game export');
fs.cpSync(path.join(mobile,'dist'),path.join(server,'game-export'),{recursive:true});
const routes=require(production?'./Stage-ProductionRoutes.cjs':'./Stage-RouteAssets.cjs');routes.stage(root,path.join(server,'game-export'));
run(path.join(server,'scripts/run-framework.mjs'),['build'],server);
const out=path.join(root,production?'.tools/shared-prod-build':'.tools/shared-dev-build'),assets=require('./SharedDev-Assets.cjs');assets.resetOutput(root,out);fs.cpSync(path.join(server,'dist'),out,{recursive:true});
const cache=(production?[path.join(root,'.tools/trail-relics-host/dist/client'),path.join(root,'.tools/trail-relics-host/dist'),path.join(root,'dist/client')]:[path.join(root,'.tools/trail-relics-dev-host/dist/client'),path.join(root,'dist/client')]).find(dir=>fs.existsSync(dir));if(production)assets.retainProduction(path.join(out,'client'),cache);else assets.retainReleased(root,path.join(out,'client'),cache);
fs.writeFileSync(path.join(out,'.openai/hosting.json'),JSON.stringify(manifest,null,2));
routes.stage(root,path.join(out,'client'));
const sha=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim();
fs.writeFileSync(path.join(out,'client/release.json'),JSON.stringify({sourceCommit:sha,environment,release:production?'shared-production-world':'shared-dev-world',features:{sharedWorld:true,liveCompass:true},deviceTests:'Physical validation pending',saveNamespace:production?'trail-relics.profiles.v1':'trail-relics.dev.profiles.v1'},null,2));
console.log('Shared development artifact: '+out);
