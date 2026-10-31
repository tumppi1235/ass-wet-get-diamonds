import {test} from 'node:test';
import assert from 'node:assert/strict';
import {environment,storageKeys} from '../src/config/environment';
test('TR-111/112 development storage cannot read production profiles, sessions, claims or inventory',()=>{
  assert.equal(environment(undefined),'production');assert.throws(()=>environment('prodution'));
  const prod=storageKeys('production'),dev=storageKeys('development');
  assert.deepEqual(prod,{database:'trail-relics.profiles.v1',session:'trail-relics.session.v1'});
  assert.notEqual(dev.database,prod.database);assert.notEqual(dev.session,prod.session);
  const store=new Map([[prod.database,JSON.stringify({progress:{gold:42},tileClaims:{owner:'real'}})],[prod.session,'real-session']]);
  assert.equal(store.get(dev.database),undefined);assert.equal(store.get(dev.session),undefined);
  store.set(dev.database,'test-fixtures');assert.match(store.get(prod.database)!,/42/);
});
