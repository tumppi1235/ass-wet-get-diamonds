// Offline transform. Source downloads are retained separately; this never changes tile coordinates.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
const dir=path.join(root,'.tools/finland-source'),meta=JSON.parse(fs.readFileSync(path.join(dir,'boundary-metadata.json'),'utf8'));
const source=JSON.parse(fs.readFileSync(path.join(dir,'finland-simplified.geojson'),'utf8'));
const polygons=source.features.flatMap(f=>f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates]).map(rings=>{
  const clean=rings.map(r=>r.map(([x,y])=>[+x.toFixed(6),+y.toFixed(6)])),outer=clean[0];
  return{bounds:[Math.min(...outer.map(p=>p[0])),Math.min(...outer.map(p=>p[1])),Math.max(...outer.map(p=>p[0])),Math.max(...outer.map(p=>p[1]))],outer,holes:clean.slice(1)};
});
const result={name:'Finland',source:meta.simplifiedGeometryGeoJSON,sourceBoundaryId:meta.boundaryID,year:meta.boundaryYearRepresented,license:meta.boundaryLicense,attribution:'© OpenStreetMap contributors; geoBoundaries / William & Mary geoLab',polygons};
fs.writeFileSync(path.join(root,'mobile/assets/finland-boundary.json'),JSON.stringify(result));console.log('Built Finland boundary:',polygons.length,'polygons; stable legacy grid retained.');
