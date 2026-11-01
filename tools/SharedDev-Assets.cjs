// Preserve supported released frontend chunks; discard unused generated copies.
const fs=require('node:fs'),path=require('node:path');
function resetOutput(root,target){
  const base=fs.realpathSync(root),resolved=path.resolve(target);
  if(![path.join(base,'dist'),path.join(base,'.tools/shared-dev-build')].includes(resolved))throw Error('Refusing to reset a non-output path');
  if(fs.existsSync(resolved)){
    if(!fs.lstatSync(resolved).isDirectory()||fs.lstatSync(resolved).isSymbolicLink()||fs.realpathSync(resolved)!==resolved)throw Error('Unsafe output directory');
    fs.rmSync(resolved,{recursive:true});
  }
  fs.mkdirSync(resolved,{recursive:true});
}
function walk(dir,visit){if(!fs.existsSync(dir))return;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error('Unexpected asset symlink');if(entry.isDirectory())walk(file,visit);else if(entry.isFile())visit(file);}}
function retainScripts(client,cache,retained=[]){
  const known=new Set(),current=[];
  const relative=(root,file)=>path.relative(root,file).split(path.sep).join('/');
  walk(path.join(client,'_expo/static/js'),file=>{if(file.endsWith('.js')){const name=relative(client,file);known.add(name);current.push(name);}});
  if(cache)walk(path.join(cache,'_expo/static/js'),file=>{if(file.endsWith('.js'))known.add(relative(cache,file));});
  for(const file of retained)if(!file.startsWith('_expo/static/js/')||file.includes('\\')||file.includes(':')||file.includes('\0')||path.posix.normalize(file)!==file||!file.endsWith('.js'))throw Error('Invalid retained asset path');
  const wanted=new Set(),queue=[];
  const select=file=>{if(!wanted.has(file)){if(!known.has(file))throw Error('Released asset is missing: '+file);wanted.add(file);queue.push(file);}};
  const scan=text=>{for(const file of known){const hash=path.basename(file).match(/[a-f0-9]{32}/)?.[0];if(text.includes(path.basename(file))||(hash&&text.includes(hash)))select(file);}};
  for(const file of retained)select(file);
  const html=file=>{if(!file.endsWith('.html'))return;const text=fs.readFileSync(file,'utf8');for(const m of text.matchAll(/(?:src|href)=["']([^"']+\.js(?:\?[^"']*)?)["']/g)){const url=new URL(m[1],'https://assets.invalid/'),name=url.pathname.slice(1);if(url.origin==='https://assets.invalid'&&name.startsWith('_expo/')&&!known.has(name))throw Error('HTML script is missing: '+name);}scan(text);};
  walk(client,html);
  if(cache)walk(cache,html);
  while(queue.length){const file=queue.shift(),a=path.join(client,file),b=cache&&path.join(cache,file);scan(fs.readFileSync(fs.existsSync(a)?a:b,'utf8'));}
  let copied=0,removed=0,bytes=0;
  for(const file of wanted){const a=path.join(client,file),b=cache&&path.join(cache,file);if(!fs.existsSync(a)){fs.mkdirSync(path.dirname(a),{recursive:true});fs.copyFileSync(b,a);copied++;}bytes+=fs.statSync(a).size;}
  for(const file of current)if(!wanted.has(file)){fs.unlinkSync(path.join(client,file));removed++;}
  return{kept:wanted.size,copied,removed,bytes};
}
function retainReleased(root,client,cache,required=false){
  const config=JSON.parse(fs.readFileSync(path.join(root,'tools/shared-dev-retained-assets.json'),'utf8'));
  if(config.projectId!=='appgprj_6ae5c02d5c008191b51fda4f4f39c7a5')throw Error('Wrong dev asset policy');
  const available=cache&&fs.existsSync(cache);
  if(required&&!available)throw Error('Existing dev release assets are required before publication');
  if(available){
    for(const name of ['maps','assets']){const from=path.join(cache,name);if(fs.existsSync(from))fs.cpSync(from,path.join(client,name),{recursive:true,force:false});}
    walk(path.join(cache,'_expo'),file=>{if(!file.endsWith('.js')){const to=path.join(client,path.relative(cache,file));if(!fs.existsSync(to)){fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(file,to);}}});
  }
  const result=retainScripts(client,available?cache:null,available?config.files:[]);
  console.log('Frontend asset retention: '+JSON.stringify(result));return result;
}
module.exports={resetOutput,retainScripts,retainReleased};
