import {readHeading,type HeadingSample,type HeadingWatch} from './compass';
type OrientationAPI={requestPermission?:(absolute?:boolean)=>Promise<string>};
let permitted=false;
/** Called only from the explicit Enable/Retry action; never prompts on mount. */
export const watchHeading:HeadingWatch=async changed=>{
  if(typeof window==='undefined'||!window.isSecureContext||!('DeviceOrientationEvent' in window))throw new Error('Compass unavailable');
  const api=window.DeviceOrientationEvent as unknown as OrientationAPI;
  if(!permitted&&api.requestPermission){const permission=await api.requestPermission(true);if(permission!=='granted'){const error=new Error('Compass permission denied');error.name='NotAllowedError';throw error;}}
  permitted=true;
  const angle=()=>window.screen.orientation?.angle??(typeof window.orientation==='number'?window.orientation:0);
  const reading=(event:Event)=>{const sample=event as unknown as HeadingSample;if(sample.absolute||typeof sample.webkitCompassHeading==='number')changed(readHeading(sample,angle(),Date.now()));};
  // Invalidate immediately on a screen rotation; do not rotate an old sample twice.
  const rotated=()=>changed(null);
  window.addEventListener('deviceorientationabsolute',reading);
  window.addEventListener('deviceorientation',reading);
  window.screen.orientation?.addEventListener('change',rotated);window.addEventListener('orientationchange',rotated);
  return{remove(){window.removeEventListener('deviceorientationabsolute',reading);window.removeEventListener('deviceorientation',reading);window.screen.orientation?.removeEventListener('change',rotated);window.removeEventListener('orientationchange',rotated);}};
};
