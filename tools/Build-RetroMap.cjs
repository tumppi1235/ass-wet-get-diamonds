// Original pixel artwork and reproducible MapLibre assets. No geographic downloads.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'mobile/public/maps');
fs.mkdirSync(out, {recursive:true});
const crc = b => { let c=0xffffffff; for(const v of b){c^=v;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0; };
function png(w,h,pixels){const chunk=(name,data)=>{const t=Buffer.from(name),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(data.length);c.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([n,t,data,c]);};const hdr=Buffer.alloc(13);hdr.writeUInt32BE(w);hdr.writeUInt32BE(h,4);hdr[8]=8;hdr[9]=6;const rows=[];for(let y=0;y<h;y++)rows.push(Buffer.from([0]),pixels.subarray(y*w*4,(y+1)*w*4));return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',hdr),chunk('IDAT',zlib.deflateSync(Buffer.concat(rows))),chunk('IEND',Buffer.alloc(0))]);}
function canvas(w,h){const pixels=Buffer.alloc(w*h*4);function rect(x,y,rw,rh,color){const c=color.match(/\w\w/g).map(v=>parseInt(v,16));for(let j=Math.max(0,y);j<Math.min(h,y+rh);j++)for(let i=Math.max(0,x);i<Math.min(w,x+rw);i++){const k=(j*w+i)*4;pixels[k]=c[0];pixels[k+1]=c[1];pixels[k+2]=c[2];pixels[k+3]=c[3]??255;}}return {w,h,pixels,rect};}
const images={};
const art=JSON.parse(fs.readFileSync(path.join(root,'mobile/assets/pixel-items/art.json'),'utf8'));
for(const [name,paths] of Object.entries(art)){
 const item=canvas(32,32);for(const p of paths)for(const match of p.d.matchAll(/M(\d+) (\d+)h1v1h-1z/g))item.rect(+match[1],+match[2],1,1,p.fill.slice(1));
 fs.writeFileSync(path.join(out,name+'.png'),png(32,32,item.pixels));
 // A framed map badge with its tip anchored to the actual geographic location.
 const badge=canvas(40,48);badge.rect(3,1,34,39,'E6B653');badge.rect(1,4,38,33,'E6B653');badge.rect(3,4,34,33,'102E2B');badge.rect(5,2,30,37,'102E2B');badge.rect(15,39,10,3,'E6B653');badge.rect(17,42,6,3,'E6B653');badge.rect(19,45,2,3,'E6B653');
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){const k=(y*32+x)*4;if(item.pixels[k+3])item.pixels.copy(badge.pixels,((y+4)*40+x+4)*4,k,k+4);}
 images[name]=badge;
}
function pattern(name,paint){const c=canvas(64,64);paint(c.rect);images[name]=c;fs.writeFileSync(path.join(out,name+'.png'),png(64,64,c.pixels));}
pattern('forest-pattern',r=>{for(const [x,y] of [[9,7],[38,30]]){r(x+5,y+21,3,7,'584C32');r(x+1,y+16,12,7,'254E3B');r(x+3,y+10,8,6,'254E3B');r(x+5,y+5,4,5,'254E3B');r(x,y+15,10,5,'447B4E');r(x+2,y+9,6,6,'528B57');r(x+4,y+4,2,5,'82A56B');r(x+1,y+16,2,2,'A0B576');}r(42,11,3,2,'88A66C');r(18,49,3,2,'49794A');});
pattern('grass-pattern',r=>{for(const [x,y]of[[8,13],[39,42],[53,7]]){r(x,y,2,4,'87A36B');r(x-2,y+2,2,2,'A2B77D');r(x+2,y+2,2,2,'87A36B');}});
pattern('rock-pattern',r=>{for(const [x,y]of[[8,10],[40,39]]){r(x,y+3,10,5,'797B68');r(x+2,y,6,3,'AEA58A');r(x+1,y+3,4,2,'C9BDA0');r(x,y+8,10,2,'6C715F');}});
pattern('water-pattern',r=>{for(const [x,y]of[[5,8],[32,28],[12,47],[49,56]]){r(x,y,8,2,'6AADC2');r(x+8,y-2,4,2,'589EBB');r(x+2,y+3,3,1,'3A7B9F');}});
const atlases=[];
for(const ratio of [1,2]){
 const atlas=canvas(512*ratio,256*ratio),meta={};let x=0,y=0,row=0;
 for(const [name,img]of Object.entries(images)){if(x+img.w>512){x=0;y+=row+2;row=0;}meta[name]={x:x*ratio,y:y*ratio,width:img.w*ratio,height:img.h*ratio,pixelRatio:ratio};
 for(let j=0;j<img.h;j++)for(let i=0;i<img.w;i++)for(let sy=0;sy<ratio;sy++)for(let sx=0;sx<ratio;sx++){const a=(j*img.w+i)*4,b=(((y+j)*ratio+sy)*atlas.w+(x+i)*ratio+sx)*4;img.pixels.copy(atlas.pixels,b,a,a+4);}x+=img.w+2;row=Math.max(row,img.h);}
 const suffix=ratio===2?'@2x':'',bytes=png(atlas.w,atlas.h,atlas.pixels),json=JSON.stringify(meta,null,2)+'\n';atlases.push({suffix,bytes,json});fs.writeFileSync(path.join(out,'trail-sprites'+suffix+'.png'),bytes);fs.writeFileSync(path.join(out,'trail-sprites'+suffix+'.json'),json);
}
const version=crypto.createHash('sha256').update(Buffer.concat(atlases.flatMap(a=>[a.bytes,Buffer.from(a.json)]))).digest('hex').slice(0,12),base='trail-sprites-'+version;
for(const a of atlases){fs.writeFileSync(path.join(out,base+a.suffix+'.png'),a.bytes);fs.writeFileSync(path.join(out,base+a.suffix+'.json'),a.json);}
fs.writeFileSync(path.join(out,'sprite-manifest.json'),JSON.stringify({base})+'\n');
// Versioned, same-origin ES module worker and its shared module (MapLibre 6).
const pkg=JSON.parse(fs.readFileSync(path.join(root,'mobile/node_modules/maplibre-gl/package.json')));
fs.copyFileSync(path.join(root,'mobile/node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs'),path.join(out,'maplibre-worker-'+pkg.version+'.js'));
fs.copyFileSync(path.join(root,'mobile/node_modules/maplibre-gl/LICENSE.txt'),path.join(out,'MAPLIBRE-LICENSE.txt'));
console.log('Built original pixel atlas, '+Object.keys(art).length+' PNG items, terrain patterns and MapLibre '+pkg.version+' worker.');
