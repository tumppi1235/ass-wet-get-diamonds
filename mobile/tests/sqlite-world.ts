import {DatabaseSync} from 'node:sqlite';
import {readdirSync,readFileSync} from 'node:fs';
/** Apply the real append-only migrations to an isolated transactional test database. */
export function database(){
  const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
  const folder=new URL('../../dev-server/drizzle/',import.meta.url);for(const file of readdirSync(folder).filter(x=>x.endsWith('.sql')).sort())sql.exec(readFileSync(new URL(file,folder),'utf8'));
  const prepare=(query:string)=>{let values:unknown[]=[];const statement={bind(...args:unknown[]){values=args;return statement;},async first(){return sql.prepare(query).get(...values as never[])??null;},async all(){return{results:sql.prepare(query).all(...values as never[])};},async run(){return /^\s*SELECT\b/i.test(query)?{success:true,results:sql.prepare(query).all(...values as never[])}:{success:true,meta:sql.prepare(query).run(...values as never[])};}};return statement;};
  return{sql,db:{prepare,async batch(statements:ReturnType<typeof prepare>[]){sql.exec('BEGIN IMMEDIATE');try{const results=[];for(const statement of statements)results.push(await statement.run());sql.exec('COMMIT');return results;}catch(error){sql.exec('ROLLBACK');throw error;}}}};
}
