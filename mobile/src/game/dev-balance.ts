// Portable shared validation: browser admin and Worker use the same rules without importing the geographic engine.
export type DevBalance={revision:string;curveCoefficient:number;tileXp:number;regionXp:number;findXp:number;enduranceMetersPerXp:number;footFactor:number;bicycleFactor:number;footMaxSpeed:number;bicycleMaxSpeed:number};
export const DEV_BALANCE:DevBalance={revision:'dev-experimental-1',curveCoefficient:25,tileXp:5,regionXp:3,findXp:10,enduranceMetersPerXp:250,footFactor:1,bicycleFactor:.4,footMaxSpeed:7,bicycleMaxSpeed:22};
export function validateBalance(value:DevBalance){
  if(!value||typeof value.revision!=='string'||!/^[a-z0-9-]{3,60}$/.test(value.revision))throw new Error('Invalid balance revision');
  value={...value,curveCoefficient:value.curveCoefficient??25};
  for(const key of ['tileXp','regionXp','findXp','enduranceMetersPerXp','curveCoefficient']as const)if(!Number.isSafeInteger(value[key])||value[key]<(key==='enduranceMetersPerXp'||key==='curveCoefficient'?1:0)||value[key]>10000)throw new Error('Invalid '+key);
  for(const key of ['footFactor','bicycleFactor']as const)if(!Number.isFinite(value[key])||value[key]<=0||value[key]>2)throw new Error('Invalid '+key);
  for(const key of ['footMaxSpeed','bicycleMaxSpeed']as const)if(!Number.isFinite(value[key])||value[key]<1||value[key]>30)throw new Error('Invalid '+key);
  return{...value};
}
