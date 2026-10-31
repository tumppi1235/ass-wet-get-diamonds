export function observeLocationLifecycle(changed:(visible:boolean)=>void){
  const visibility=()=>changed(document.visibilityState!=='hidden');
  const foreground=()=>{if(document.visibilityState!=='hidden')changed(true);};
  const background=()=>changed(false);
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('pageshow',foreground);window.addEventListener('focus',foreground);window.addEventListener('pagehide',background);
  return()=>{document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pageshow',foreground);window.removeEventListener('focus',foreground);window.removeEventListener('pagehide',background);};
}
