// Offline recovery drill only: exclusive creation, never an existing/shared/hosted database.
import {DatabaseSync} from 'node:sqlite';
import {openSync,closeSync,readFileSync,readdirSync,statSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateSnapshot,SNAPSHOT_TABLES,SNAPSHOT_COLUMNS,SNAPSHOT_SCHEMA,MAX_SNAPSHOT_BYTES} from '../dev-server/trail/snapshot-format';
export async function restoreDevSnapshot(input:string,output:string){
  if(statSync(input).size>MAX_SNAPSHOT_BYTES)throw new Error('Snapshot file is too large');const snapshot=await validateSnapshot(JSON.parse(readFileSync(input,'utf8')));
  const destination=resolve(output),descriptor=openSync(destination,'wx',0o600);closeSync(descriptor);let db:DatabaseSync|undefined;
  try{
    db=new DatabaseSync(destination);db.exec('PRAGMA foreign_keys=ON');
    const folder=new URL('../dev-server/drizzle/',import.meta.url),migrations=readdirSync(folder).filter(f=>f.endsWith('.sql')).sort();
    if(migrations.length!==SNAPSHOT_SCHEMA+1)throw new Error('Use the recovery source matching this snapshot schema');for(const file of migrations)db.exec(readFileSync(new URL(file,folder),'utf8'));
    for(const table of SNAPSHOT_TABLES){const actual=db.prepare(`PRAGMA table_info(${table})`).all().map(r=>r.name);if(actual.length!==SNAPSHOT_COLUMNS[table].length||SNAPSHOT_COLUMNS[table].some(c=>!actual.includes(c)))throw new Error('Recovery schema columns differ from snapshot format');}
    db.exec('BEGIN IMMEDIATE');
    try{for(const table of SNAPSHOT_TABLES){const columns=SNAPSHOT_COLUMNS[table],statement=db.prepare(`INSERT INTO ${table} (${columns.map(c=>'"'+c+'"').join(',')}) VALUES (${columns.map(()=>'?').join(',')})`);for(const row of snapshot.tables[table])statement.run(...columns.map(c=>row[c]));}if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Recovery foreign keys failed');if(Object.values(db.prepare('PRAGMA integrity_check').get()||{})[0]!=='ok')throw new Error('Recovery integrity check failed');db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
    db.close();db=undefined;return{environment:'offline-development',schema:snapshot.schema,digest:snapshot.digest,output:destination,rows:Object.fromEntries(SNAPSHOT_TABLES.map(t=>[t,snapshot.tables[t].length])),hostedDatabaseChanged:false};
  }catch(e){db?.close();unlinkSync(destination);throw e;}
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv.slice(2);if(args.length!==4||args[0]!=='--input'||args[2]!=='--output'){process.stderr.write('Usage: node mobile/node_modules/tsx/dist/cli.mjs tools/Restore-SharedDevSnapshot.mts --input private-snapshot.json --output NEW-local.sqlite\n');process.exitCode=1;}
  else void restoreDevSnapshot(args[1],args[3]).then(result=>{process.stdout.write(JSON.stringify(result,null,2)+'\n');}).catch(e=>{process.stderr.write((e as Error).message+'\n');process.exitCode=1;});
}
