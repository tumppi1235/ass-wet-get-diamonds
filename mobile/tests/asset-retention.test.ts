import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const {retainScripts,resetOutput}=createRequire(import.meta.url)('../../tools/SharedDev-Assets.cjs');
const results=path.resolve(import.meta.dirname,'../../test-results');mkdirSync(results,{recursive:true});
function fixture(){const base=mkdtempSync(path.join(results,'assets-'));return{base,close(){assert.ok(base.startsWith(results+path.sep));rmSync(base,{recursive:true});},write(root:string,name:string,text:string){const file=path.join(base,root,name);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,text);return file;}};}
test('release assets retain current, cached and historical lazy dependencies while pruning unused scripts',()=>{
  const f=fixture();try{
    const root=path.join(f.base,'client'),cache=path.join(f.base,'cache'),prefix='_expo/static/js/web/';
    f.write('client','index.html',`<script src="/${prefix}entry.js"></script>`);
    f.write('client',prefix+'entry.js','const lazyHash="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"');
    f.write('client',prefix+'lazy-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.js','export default 1');
    const orphan=f.write('client',prefix+'unused.js','unused');
    f.write('cache','index.html',`<script src="/${prefix}old.js"></script>`);
    f.write('cache',prefix+'old.js','const lazyUrl="./old-lazy.js"');f.write('cache',prefix+'old-lazy.js','old');
    f.write('cache',prefix+'historical.js','older supported release');
    const result=retainScripts(root,cache,[prefix+'historical.js']);
    assert.equal(result.kept,5);assert.equal(result.removed,1);assert.equal(existsSync(orphan),false);
    assert.equal(readFileSync(path.join(root,prefix+'old-lazy.js'),'utf8'),'old');
  }finally{f.close();}
});
test('release assets reject unsafe paths and missing HTML dependencies before pruning',()=>{
  const f=fixture();try{const root=path.join(f.base,'client');const orphan=f.write('client','_expo/static/js/web/orphan.js','keep until valid');
    f.write('client','index.html','<script src="/_expo/static/js/web/missing.js"></script>');
    assert.throws(()=>retainScripts(root,null,['_expo/static/js/../../outside.js']),/Invalid retained/);
    assert.throws(()=>retainScripts(root,null,['_expo/static/js/web/..\\outside.js']),/Invalid retained/);
    assert.throws(()=>retainScripts(root,null),/HTML script is missing/);assert.ok(existsSync(orphan));
  }finally{f.close();}
});
test('build cleanup is confined to declared generated output and preserves canonical inputs',()=>{
  const f=fixture();try{const source=f.write('','route-network/canary','canonical'),output=f.write('','dist/old.js','generated');
    assert.throws(()=>resetOutput(f.base,path.join(f.base,'route-network')),/non-output/);
    resetOutput(f.base,path.join(f.base,'dist'));assert.equal(existsSync(output),false);assert.equal(readFileSync(source,'utf8'),'canonical');
  }finally{f.close();}
});
