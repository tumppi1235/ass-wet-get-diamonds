import type {AppEnvironment} from './environment';
// Independent versioned values, even while both environments use the approved initial curve.
const curves:Record<AppEnvironment,{version:number;coefficient:number}>={development:{version:1,coefficient:25},production:{version:1,coefficient:25}};
export function progressionConfig(environment:AppEnvironment){return{...curves[environment]};}
