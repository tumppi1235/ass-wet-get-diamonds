import {classifyActivity} from '../mobile/src/integrations/activity-category';
const args=process.argv.slice(2),values=new Map<string,string>();
try{
  if(args.length%2)throw new Error('Use pairs: --source garmin-connect-iq --sport 1 --sub-sport 3 OR --source strava --sport TrailRun');
  for(let i=0;i<args.length;i+=2){if(!['--source','--sport','--sub-sport'].includes(args[i])||values.has(args[i]))throw new Error('Unknown or duplicate option');values.set(args[i],args[i+1]);}
  const source=values.get('--source'),sport=values.get('--sport'),subSport=values.get('--sub-sport');
  if(!source||!sport)throw new Error('Provide --source and --sport');
  if(source==='garmin-connect-iq'&&(!/^\d+$/.test(sport)||(subSport!==undefined&&!/^\d+$/.test(subSport))))throw new Error('Connect IQ codes must be unsigned integers');
  if(source==='strava'&&subSport!==undefined)throw new Error('Strava uses sport_type, not subSport');
  const result=classifyActivity(source==='strava'?{source,sport_type:sport}:{source,sport:Number(sport),subSport:subSport===undefined?null:Number(subSport)});
  console.log(JSON.stringify({...result,writes:0},null,2));if(result.status==='invalid'||result.status==='unsupported')process.exitCode=2;
}catch(e){console.error((e as Error).message);process.exitCode=2;}
