import {AppState} from 'react-native';
export function observeLocationLifecycle(changed:(visible:boolean)=>void){const sub=AppState.addEventListener('change',state=>changed(state==='active'));return()=>sub.remove();}
