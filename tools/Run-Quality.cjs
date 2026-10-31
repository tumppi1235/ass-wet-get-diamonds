// Portable CI/local evidence from actual exit codes; never labels device tests passed.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),cwd=path.join(root,'mobile'),out=path.join(root,'test-results');
fs.mkdirSync(out,{recursive:true});
const tests=fs.readdirSync(path.join(cwd,'tests')).filter(f=>f.endsWith('.test.ts')).sort().map(f=>'tests/'+f);
const commands=[['TypeScript',process.execPath,[path.join(cwd,'node_modules/typescript/bin/tsc'),'--noEmit']],['Lint',process.execPath,[path.join(cwd,'node_modules/expo/bin/cli'),'lint']],['Regression tests',process.execPath,['--import','tsx','--test','--test-reporter=spec','--test-reporter=junit','--test-reporter-destination=stdout','--test-reporter-destination='+path.join(out,'junit.xml'),...tests]]];
const results=commands.map(([name,cmd,args])=>{const run=spawnSync(cmd,args,{cwd,encoding:'utf8',env:process.env});const log=(run.stdout||'')+(run.stderr||'')+(run.error?.message||'');fs.writeFileSync(path.join(out,name.toLowerCase().replaceAll(' ','-')+'.txt'),log);process.stdout.write(log);return{name,passed:run.status===0,exitCode:run.status};});
const sha=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout?.trim()||'unknown';
const dirty=spawnSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).stdout?.trim();
const report={generatedAt:new Date().toISOString(),sourceCommit:sha,workingTreeDirty:!!dirty,environment:process.env.EXPO_PUBLIC_APP_ENV||'production',results,deviceTests:'PENDING: see docs/TEST-PLAN.md'};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(report,null,2));
fs.writeFileSync(path.join(out,'summary.md'),'# Trail Relics automated checks\n\nSource: `'+sha+'`'+(dirty?' plus uncommitted working changes':'')+'\n\n| Check | Result |\n| --- | --- |\n'+results.map(r=>'| '+r.name+' | '+(r.passed?'PASS':'FAIL')+' |').join('\n')+'\n\nDevice field tests: PENDING. Automated tests use simulated GPS, not real iPhone recording.\n');
process.exitCode=results.every(r=>r.passed)?0:1;
