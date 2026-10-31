const fs=require('node:fs'),path=require('node:path');
const layers=[];
const kinds=(...v)=>['in',['get','kind'],['literal',v]];
function fill(id,layer,color,filter,minzoom=0){layers.push({id,type:'fill',source:'osm','source-layer':layer,minzoom,...(filter?{filter}:{}),paint:{'fill-color':color}});}
function line(id,color,width,filter,minzoom=0,extra={}){layers.push({id,type:'line',source:'osm','source-layer':'streets',minzoom,filter,layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':color,'line-width':width,...extra}});}
const width=(a,b,c)=>['interpolate',['exponential',1.3],['zoom'],9,a,14,b,18,c];
layers.push({id:'land-base',type:'background',paint:{'background-color':'#C3CA96'}});
fill('settlements','land','#C9C2A4',kinds('residential','commercial','retail','garages'),9);
fill('industry','land','#B6AD99',kinds('industrial','construction'),11);
fill('fields','land','#B7BE83',kinds('farmland','farmyard','orchard','allotments'),10);
fill('grass','land','#A7BB80',kinds('grass','meadow','grassland','park','garden','recreation_ground','golf_course'),10);
fill('forest','land','#699267',kinds('forest'),7);
fill('scrub','land','#8FA474',kinds('scrub','heath'),11);
fill('wetlands','land','#8EA991',kinds('swamp','bog','string_bog','wet_meadow','marsh'),11);
fill('beaches','land','#E4CE9B',kinds('sand','beach'),11);
fill('bare-rock','land','#A69F83',kinds('bare_rock','scree','shingle'),11);
fill('ocean','ocean','#458DB5');fill('lakes','water_polygons','#458DB5');
layers.push({id:'shoreline',type:'line',source:'osm','source-layer':'water_polygons',minzoom:11,paint:{'line-color':'#3A7B86','line-width':1}});
layers.push({id:'streams',type:'line',source:'osm','source-layer':'water_lines',minzoom:11,paint:{'line-color':'#458DB5','line-width':width(.5,1.5,4)}});
for(const [id,sl,filter,pattern]of[
 ['forest-texture','land',kinds('forest'),'forest-pattern'],
 ['grass-texture','land',kinds('grass','grassland','meadow','park','garden'),'grass-pattern'],
 ['rock-texture','land',kinds('bare_rock','scree','shingle'),'rock-pattern'],
 ['water-texture','water_polygons',null,'water-pattern']])layers.push({id,type:'fill',source:'osm','source-layer':sl,minzoom:13,...(filter?{filter}:{}),paint:{'fill-pattern':pattern,'fill-opacity':['step',['zoom'],.35,14,.65,16,.85]}});
// Buildings and roads cover decoration. Nothing decorative changes real geometry.
fill('buildings','buildings','#A48C75',null,14);
layers.push({id:'building-outlines',type:'line',source:'osm','source-layer':'buildings',minzoom:15,paint:{'line-color':'#7D725C','line-width':.8}});
fill('road-areas','street_polygons','#EFE3BB',null,13);
const major=kinds('motorway','trunk','primary','secondary','tertiary');
const minor=kinds('residential','unclassified','living_street','service','road');
const pathKinds=kinds('path','footway','cycleway','pedestrian','steps','track','bridleway');
const allowed=['all',pathKinds,['!=',['get','foot'],'no'],['!=',['get','foot'],'limited']];
const restricted=['all',pathKinds,['in',['get','foot'],['literal',['no','limited']]]];
line('major-casing','#A9966B',width(1.5,6,22),major,5);
line('major-roads','#EFE3BB',width(1,4.5,18),major,5);
line('local-casing','#A69674',width(.6,3.6,15),minor,12);
line('local-streets','#EFE3BB',width(.4,2.5,12),minor,12);
line('railways','#736F5A',width(.5,1.5,3),['==',['get','rail'],true],11,{'line-dasharray':[3,2]});
line('trail-casing','#6A5D3F',width(.8,4,8),allowed,13);
line('trails','#EACB85',width(.5,2.4,5),allowed,13,{'line-dasharray':[3,1.5]});
line('restricted-paths','#9C8C77',width(.4,1.2,3),restricted,14,{'line-dasharray':[1,3]});
layers.push({id:'piers',type:'line',source:'osm','source-layer':'pier_lines',minzoom:14,paint:{'line-color':'#EFE3BB','line-width':3}});
layers.push({id:'ferries',type:'line',source:'osm','source-layer':'ferries',minzoom:11,paint:{'line-color':'#E1DFC2','line-width':1.2,'line-dasharray':[2,3]}});
const textPaint={'text-color':'#334B3B','text-halo-color':'#F5ECCD','text-halo-width':1.4,'text-halo-blur':0};
const label=(id,sl,minzoom,size,layout={},paint={})=>layers.push({id,type:'symbol',source:'osm','source-layer':sl,minzoom,layout:{'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':size,'text-max-width':9,...layout},paint:{...textPaint,...paint}});
label('lake-labels','water_polygons_labels',10,['interpolate',['linear'],['zoom'],10,11,16,16],{}, {'text-color':'#1F5C76','text-halo-color':'#B5D5D1'});
label('street-labels','street_labels',14,11,{'symbol-placement':'line','symbol-spacing':260,'text-max-angle':35});
label('place-labels','place_labels',7,['interpolate',['linear'],['zoom'],7,11,12,15,16,18]);
const style={version:8,name:'Trail Relics · Jyväskylä',metadata:{schema:'Shortbread 1.1',description:'Accurate OSM vectors with original pixel patterns. Decoration never changes geography.'},
 glyphs:'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',sprite:'/maps/trail-sprites',
 sources:{osm:{type:'vector',url:'https://vector.openstreetmap.org/shortbread_v1/tilejson.json'}},layers};
fs.writeFileSync(path.join(__dirname,'../mobile/public/maps/trail-retro-style.json'),JSON.stringify(style,null,2)+'\n');
console.log('Built retro Shortbread map style ('+layers.length+' layers).');
