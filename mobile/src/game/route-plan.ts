import type {MappedRoute,RouteUnavailable} from './mapped-route';
export type RoutePlanInput={from:string;to:string;movement:'foot'|'bicycle';maxMeters:number;access:'known-paths'|'step-free'};
export type RoutePlan={generatedAt:number;preview:boolean;originName:string;destination:string;policy:string;regionsRevision:string;awardsWritten:0;preferences?:RoutePlanInput;sourceDate?:string;source?:string;coverage?:'bounded-envelope'|'lazy-network';result:MappedRoute|{status:'unavailable';reason:RouteUnavailable['reason']|'data-unavailable'|'data-invalid'|'busy'}};
