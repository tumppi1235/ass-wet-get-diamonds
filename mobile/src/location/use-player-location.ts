import {useCallback,useEffect,useMemo,useState} from 'react';
import {watchPlayerLocation} from './client';
import {observeLocationLifecycle} from './lifecycle';
import {LocationSession,initialLocation} from './session';
import type {TrackedFix} from './tracker';
export function usePlayerLocation(onGameFix:(fix:TrackedFix)=>void){
  const [snapshot,setSnapshot]=useState(initialLocation);
  const controller=useMemo(()=>new LocationSession(watchPlayerLocation,setSnapshot,()=>{}),[]);
  useEffect(()=>{controller.setOnFix(onGameFix);},[controller,onGameFix]);
  useEffect(()=>{
    const unobserve=observeLocationLifecycle(visible=>{if(visible)controller.resume();else controller.suspend();});
    const timer=setInterval(()=>controller.tick(),5000);
    return()=>{unobserve();clearInterval(timer);controller.stop(false);};
  },[controller]);
  const start=useCallback(()=>controller.start(),[controller]);
  const stop=useCallback(()=>controller.stop(),[controller]);
  const latestFix=useCallback(()=>controller.latestFix(),[controller]);
  return {...snapshot,start,stop,latestFix};
}
