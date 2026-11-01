export type WorldScope={environment:'development'|'production';projectId:string};
export const DEV_SCOPE:WorldScope={environment:'development',projectId:'appgprj_6ae5c02d5c008191b51fda4f4f39c7a5'};
export const PROD_SCOPE:WorldScope={environment:'production',projectId:'appgprj_6ae4783f8fcc8191a8e97464e8375938'};
export function serviceScope(env:{TRAIL_ENV?:string;TRAIL_PROJECT_ID?:string}):WorldScope{
  const scope=env.TRAIL_ENV==='development'?DEV_SCOPE:env.TRAIL_ENV==='production'?PROD_SCOPE:null;
  if(!scope||env.TRAIL_PROJECT_ID!==undefined&&env.TRAIL_PROJECT_ID!==scope.projectId||scope.environment==='production'&&env.TRAIL_PROJECT_ID!==scope.projectId)throw new Error('Shared service environment/project is not configured correctly');
  return scope;
}
