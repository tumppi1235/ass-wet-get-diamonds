import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observeLocationLifecycle} from '../src/location/lifecycle.web';
test('TR-146 visibility/page restoration is observed and all listeners are removed on cleanup',()=>{
  const originalDoc=Object.getOwnPropertyDescriptor(globalThis,'document'),originalWin=Object.getOwnPropertyDescriptor(globalThis,'window');
  const doc=Object.assign(new EventTarget(),{visibilityState:'visible'}),win=new EventTarget(),events:boolean[]=[];
  Object.defineProperty(globalThis,'document',{configurable:true,value:doc});Object.defineProperty(globalThis,'window',{configurable:true,value:win});
  try{
    const remove=observeLocationLifecycle(visible=>events.push(visible));
    doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));win.dispatchEvent(new Event('focus'));
    doc.visibilityState='visible';win.dispatchEvent(new Event('pageshow'));win.dispatchEvent(new Event('pagehide'));
    assert.deepEqual(events,[false,true,false]);remove();win.dispatchEvent(new Event('focus'));doc.dispatchEvent(new Event('visibilitychange'));assert.equal(events.length,3);
  }finally{
    if(originalDoc)Object.defineProperty(globalThis,'document',originalDoc);else Reflect.deleteProperty(globalThis,'document');
    if(originalWin)Object.defineProperty(globalThis,'window',originalWin);else Reflect.deleteProperty(globalThis,'window');
  }
});
