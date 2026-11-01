import {useCallback,useEffect,useMemo,useState} from 'react';
import {CompassSession,compassOff} from './compass';
import {watchHeading} from './heading-client';
import {observeLocationLifecycle} from './lifecycle';
export function useCompass(enabled:boolean){
  const [snapshot,setSnapshot]=useState(compassOff);
  const controller=useMemo(()=>new CompassSession(watchHeading,setSnapshot),[]);
  useEffect(()=>{
    if(!enabled)return;
    const off=observeLocationLifecycle(visible=>{if(visible)controller.resume();else controller.suspend();});
    const timer=setInterval(()=>controller.tick(),1000);
    return()=>{off();clearInterval(timer);controller.stop(false);};
  },[controller,enabled]);
  const start=useCallback(()=>{if(enabled)void controller.start();},[controller,enabled]);
  const stop=useCallback(()=>controller.stop(),[controller]);
  return{...snapshot,start,stop};
}
