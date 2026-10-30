const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const G=require('../public/engine.js');
global.Game=G;
const Filter=require('../android/assets/gps.js');
const filter=new Filter();let now=100000;
const fix=(x,y,time=now,accuracy=5,speed=1)=>({...G.geo(x,y),time,accuracy,speed});
assert.equal(filter.accept(fix(0,0,now-20000),now),null);
assert.equal(filter.accept(fix(0,0,now,40),now),null);
assert.equal(filter.accept(fix(0,0),now).distance,0);
now+=1000;assert.equal(filter.accept(fix(2,1),now).distance,0);
now+=1000;assert.ok(filter.accept(fix(9,0),now).distance>8.9);
assert.equal(filter.accept(fix(10,0),now),null,'duplicate fix');
now+=1000;assert.equal(filter.accept(fix(600,0),now),null,'GPS jump');assert.equal(filter.fresh,0);
now+=1000;assert.equal(filter.accept(fix(610,0,now,5,15),now),null,'vehicle speed');
filter.reset();now+=1000;assert.equal(filter.accept(fix(1000,0),now).distance,0,'resume must not count paused distance');
assert.equal(filter.accept({...fix(0,0),lat:NaN},now),null);

// Run the actual mobile screen/controller with a small DOM and a deterministic clock.
const elements=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',style:{},setAttribute(k,v){this[k]=v;}});return elements.get(id);};
class ClockFilter extends Filter{accept(fix){return super.accept(fix,now);}}
const storage=new Map();const context={Game:G,GpsFilter:ClockFilter,document:{getElementById:element},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},window:{addEventListener(){}},Date:{now:()=>now},setInterval(){},confirm:()=>true,console};
const mapUpdates=[];context.window.PhoneMap=class{update(state,ready){mapUpdates.push({state,ready});}};
context.window.window=context.window;vm.createContext(context);
vm.runInContext(fs.readFileSync(require.resolve('../android/assets/mobile.js'),'utf8'),context);
// Browser globals normally alias window properties.
context.gpsStatus=context.window.gpsStatus;
element('gpsStart').onclick();
context.window.onGps(fix(0,0));
assert.match(element('signal').innerHTML,/READY TO CAPTURE/);
assert.equal(element('collect').disabled,false);
element('mapTab').onclick();assert.equal(element('guide').hidden,true);assert.equal(mapUpdates.at(-1).ready,true,'street map receives live player state');
element('collect').onclick();assert.equal(element('collect').disabled,true,'one collection attempt per outing');
const saved=JSON.parse(storage.get('trail-relics-android-v1'));assert.ok(saved.searched['0,0']);
now+=20000;element('guideTab').onclick();assert.equal(element('collect').disabled,true,'stale GPS cannot collect');
context.window.pauseGps();assert.equal(element('collect').disabled,true);
element('newOuting').onclick();assert.equal(JSON.parse(storage.get('trail-relics-android-v1')).outing,2);
const iosMessages=[];context.window.webkit={messageHandlers:{trailRelics:{postMessage:message=>iosMessages.push(message)}}};
element('gpsStart').onclick();element('gpsStop').onclick();assert.deepEqual(iosMessages,['start','stop'],'iOS bridge dispatches only explicit GPS actions');
console.log('Passed: stale/poor/jumping/vehicle GPS rejected, jitter threshold, no paused distance, phone street-map integration, capture readiness, saved progress and iOS bridge.');
