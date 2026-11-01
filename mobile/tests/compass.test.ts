import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CompassSession,headingDelta,normalizeHeading,readHeading,relativeBearing,type HeadingReading,type HeadingWatch} from '../src/location/compass';
import {watchHeading} from '../src/location/heading-client.web';

test('TR-165 headings use screen-top direction, cardinal points, tilt and portrait/landscape rotation',()=>{
  for(const heading of [0,90,180,270]){
    const reading=readHeading({absolute:true,alpha:normalizeHeading(-heading),beta:0,gamma:0},0,1000)!;
    assert.ok(Math.abs(headingDelta(heading,reading.degrees))<1e-8);
    assert.equal(relativeBearing(heading,reading.degrees),0);
  }
  assert.equal(readHeading({absolute:true,alpha:0,beta:0,gamma:0},90,1)!.degrees,90);
  assert.equal(readHeading({absolute:true,alpha:0,beta:0,gamma:0},270,1)!.degrees,270);
  assert.ok(Math.abs(headingDelta(270,readHeading({absolute:true,alpha:90,beta:45,gamma:10},0,1)!.degrees))<1e-8);
  assert.equal(readHeading({absolute:true,alpha:0,beta:90,gamma:0},0,1),null,'vertical screen top has no horizontal direction');
  const apple=readHeading({webkitCompassHeading:350,webkitCompassAccuracy:10},90,1)!;
  assert.equal(apple.degrees,80);assert.equal(apple.reference,'magnetic');
  assert.equal(relativeBearing(10,350),20);assert.equal(relativeBearing(350,10),-20);
  assert.equal(relativeBearing(-10,null),350,'north-up fallback retains the geographic bearing');
});

test('TR-165 rejects relative-only, missing, invalid and uncalibrated sensor readings',()=>{
  for(const sample of [{alpha:0,beta:0,gamma:0,absolute:false},{alpha:null,beta:0,gamma:0,absolute:true},{alpha:NaN,beta:0,gamma:0,absolute:true},{alpha:400,beta:0,gamma:0,absolute:true},{webkitCompassHeading:-1,webkitCompassAccuracy:10},{webkitCompassHeading:5,webkitCompassAccuracy:-1},{webkitCompassHeading:5,webkitCompassAccuracy:60},{webkitCompassHeading:5}])assert.equal(readHeading(sample,0,100),null);
});

function harness(){let now=1000;const calls:{receive:(r:HeadingReading|null)=>void;removed:number}[]=[];let changes=0;
  const watch:HeadingWatch=async receive=>{const c={receive,removed:0};calls.push(c);return{remove(){c.removed++;}};};
  const session=new CompassSession(watch,()=>changes++,()=>now);
  return{session,calls,changes:()=>changes,advance(ms:number){now+=ms;},fix(degrees:number){calls.at(-1)!.receive({degrees,reference:'magnetic',timestamp:now});}};
}
test('TR-165 smoothing crosses north by the short arc; stale/invalid sensors never keep a live arrow',async()=>{
  const h=harness();await h.session.start();h.fix(359);h.advance(200);h.fix(1);
  assert.ok(Math.abs(headingDelta(359,h.session.snapshot().heading!))<2,'no average through south');
  const before=h.changes();for(let i=0;i<50;i++){h.advance(1);h.fix(2);}
  assert.equal(h.changes(),before,'sensor bursts do not cause 50 screen renders');
  h.advance(8001);h.session.tick();assert.equal(h.session.snapshot().status,'stale');assert.equal(h.session.snapshot().heading,null);
  const stale=h.changes();h.session.tick();assert.equal(h.changes(),stale);
  h.fix(90);assert.equal(h.session.snapshot().heading,90,'a fresh reading resets stale smoothing');
  h.calls[0].receive(null);assert.equal(h.session.snapshot().heading,null);assert.equal(h.session.snapshot().status,'waiting');
});

test('TR-165 sensor lifecycle owns one listener and disposes late/background callbacks',async()=>{
  const h=harness();await h.session.start();await h.session.start();assert.equal(h.calls.length,1);
  h.fix(20);h.session.resume();assert.equal(h.calls.length,1,'ordinary focus does not restart compass');
  h.session.suspend();assert.equal(h.calls[0].removed,1);assert.equal(h.session.snapshot().heading,null);
  h.calls[0].receive({degrees:30,timestamp:1000,reference:'magnetic'});assert.equal(h.session.snapshot().status,'paused');
  h.session.resume();h.session.resume();assert.equal(h.calls.length,2);await Promise.resolve();
  h.advance(500);h.fix(40);assert.equal(h.session.snapshot().heading,40);
  h.session.stop();assert.equal(h.calls[1].removed,1);assert.equal(h.session.snapshot().status,'off');
  let release!:(x:{remove():void})=>void,removed=0;
  const late=new CompassSession(()=>new Promise(resolve=>{release=resolve;}),()=>{});
  const pending=late.start();void late.start();late.stop();release({remove(){removed++;}});await pending;assert.equal(removed,1);
  const denied=new CompassSession(async()=>{const error=new Error('Denied');error.name='NotAllowedError';throw error;},()=>{});
  await denied.start();assert.equal(denied.snapshot().status,'denied');assert.equal(denied.snapshot().heading,null);
});

test('TR-165 web adapter requests permission explicitly and cleans up; unrelated relative events do not flicker a valid heading',async()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
  const events=new EventTarget(),orientation=new EventTarget();let permissionCalls=0;const readings:(HeadingReading|null)[]=[];
  const fake={isSecureContext:true,DeviceOrientationEvent:{async requestPermission(absolute:boolean){assert.equal(absolute,true);permissionCalls++;return'granted';}},screen:{orientation:Object.assign(orientation,{angle:0})},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)};
  Object.defineProperty(globalThis,'window',{configurable:true,value:fake});
  const send=(type:string,data:object)=>events.dispatchEvent(Object.assign(new Event(type),data));
  try{
    assert.equal(permissionCalls,0,'importing the adapter cannot prompt');
    const sub=await watchHeading(r=>readings.push(r));assert.equal(permissionCalls,1);
    send('deviceorientationabsolute',{absolute:true,alpha:0,beta:0,gamma:0});assert.equal(readings.at(-1)!.degrees,0);
    send('deviceorientation',{absolute:false,alpha:40,beta:0,gamma:0});assert.equal(readings.length,1);
    fake.screen.orientation.angle=90;orientation.dispatchEvent(new Event('change'));assert.equal(readings.at(-1),null);
    send('deviceorientation',{webkitCompassHeading:0,webkitCompassAccuracy:10});assert.equal(readings.at(-1)!.degrees,90);
    sub.remove();const count=readings.length;send('deviceorientationabsolute',{absolute:true,alpha:0,beta:0,gamma:0});orientation.dispatchEvent(new Event('change'));assert.equal(readings.length,count);
  }finally{if(previous)Object.defineProperty(globalThis,'window',previous);else Reflect.deleteProperty(globalThis,'window');}
});
