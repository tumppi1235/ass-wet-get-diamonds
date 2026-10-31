export type AppEnvironment='development'|'production';
export function environment(value:string|undefined):AppEnvironment{
  if(value===undefined||value===''||value==='production')return 'production';
  if(value==='development')return 'development';
  throw new Error('EXPO_PUBLIC_APP_ENV must be development or production');
}
// Preserve the existing production storage keys. Development never reads or migrates them.
export function storageKeys(env:AppEnvironment){
  const prefix=env==='development'?'trail-relics.dev':'trail-relics';
  return{database:prefix+'.profiles.v1',session:prefix+'.session.v1'};
}
export const APP_ENV=environment(process.env.EXPO_PUBLIC_APP_ENV);
