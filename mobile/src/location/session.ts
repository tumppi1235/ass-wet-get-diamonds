import { PositionTracker, type LocationFix, type PlayerPosition, type TrackedFix } from './tracker';
import type { LocationFailure, LocationSubscription } from './client';
export type LocationSnapshot = { position:PlayerPosition|null; mapPosition:PlayerPosition|null; tracking:boolean; locating:boolean; message:string; fresh:number; focusRequest:number; status:'idle'|'locating'|'tracking'|'suspended'|'recovering'|'denied'; recoveries:number; rejected:number; receivedAt:number };
export const initialLocation:LocationSnapshot={position:null,mapPosition:null,tracking:false,locating:false,message:'Tap Me to find your location.',fresh:0,focusRequest:0,status:'idle',recoveries:0,rejected:0,receivedAt:0};
export type LocationWatch=(onFix:(fix:LocationFix)=>void,onError:(error:LocationFailure)=>void)=>Promise<LocationSubscription>;
/** Own one replaceable GPS subscription, independently of an adventure's lifetime. */
export class LocationSession {
  private subscription:LocationSubscription|null=null;
  private generation=0;
  private wanted=false;
  private visible=true;
  private lastValidAt=0;
  private lastAttemptAt=-Infinity;
  private latest:TrackedFix|null=null;
  private value:LocationSnapshot={...initialLocation};
  constructor(private watch:LocationWatch,private changed:(snapshot:LocationSnapshot)=>void,private onFix:(fix:TrackedFix)=>void,private clock=()=>Date.now()){}
  snapshot(){return {...this.value};}
  setOnFix(callback:(fix:TrackedFix)=>void){this.onFix=callback;}
  private publish(patch:Partial<LocationSnapshot>){this.value={...this.value,...patch};this.changed(this.snapshot());}
  async start(){this.wanted=true;await this.replace(false,true);}
  stop(notify=true){
    this.wanted=false;this.generation++;this.subscription?.remove();this.subscription=null;this.latest=null;
    const patch={tracking:false,locating:false,fresh:0,status:'idle' as const,message:'Location paused. Tap Me to locate yourself again.'};
    if(notify)this.publish(patch);else this.value={...this.value,...patch};
  }
  suspend(){this.visible=false;if(this.wanted)this.publish({fresh:0,status:'suspended',message:'Adventure stays active. Browser GPS may pause while the screen is locked.'});}
  resume(){const wasHidden=!this.visible;this.visible=true;if(this.wanted&&(wasHidden||this.clock()-this.lastValidAt>25000)&&this.clock()-this.lastAttemptAt>=2000)void this.replace(true,true);}
  tick(){
    if(!this.wanted||!this.visible)return;
    if(this.clock()-this.lastValidAt>25000&&this.clock()-this.lastAttemptAt>25000)void this.replace(true,false);
  }
  latestFix(now=this.clock()){
    const fix=this.latest;
    return this.wanted&&this.visible&&fix?.eligible&&this.value.fresh===fix.position.timestamp&&now-fix.position.timestamp>=0&&now-fix.position.timestamp<15000?fix:null;
  }
  private async replace(recovery:boolean,focus:boolean){
    this.generation++;const request=this.generation;this.subscription?.remove();this.subscription=null;
    const tracker=new PositionTracker();let focusNext=focus;
    this.lastAttemptAt=this.clock();if(!this.lastValidAt)this.lastValidAt=this.lastAttemptAt;
    this.latest=null;
    this.publish({tracking:true,locating:true,fresh:0,status:recovery?'recovering':'locating',recoveries:this.value.recoveries+(recovery?1:0),message:recovery?'Reconnecting GPS. Your adventure and progress are preserved.':'Allow location in the browser prompt. Finding your position…'});
    try{
      const watcher=await this.watch(raw=>{
        if(request!==this.generation||!this.wanted)return;
        const result=tracker.accept(raw,this.clock());
        if(!result){this.publish({rejected:this.value.rejected+1});return;}
        this.lastValidAt=this.clock();this.latest=result;
        const accuracy=Math.round(result.position.accuracy);
        const message=result.eligible?'GPS live · tile updates active.':
          result.reason==='outside'?`Location detected · ±${accuracy} m · outside the current playtest region.`:
          result.reason==='approximate'?'GPS tracking · waiting for 25 m accuracy or better before collection and rewards.':
          result.reason==='speed'?'Location shown. Walking-speed fixes are required for this playtest.':'Waiting for a steady GPS fix after a location jump.';
        this.publish({position:result.position,mapPosition:result.eligible?result.position:this.value.mapPosition || result.position,locating:false,fresh:result.eligible?result.position.timestamp:0,status:'tracking',message,receivedAt:this.clock(),focusRequest:this.value.focusRequest+(focusNext?1:0)});
        focusNext=false;
        if(result.eligible)this.onFix(result);
      },error=>{
        if(request!==this.generation)return;
        if(error.denied){this.stop(false);this.publish({status:'denied',message:error.message});}
        else this.publish({locating:false,fresh:0,status:'recovering',message:error.message+' The adventure remains active; GPS will retry.'});
      });
      if(request!==this.generation||!this.wanted)watcher.remove();else this.subscription=watcher;
    }catch(e){
      if(request!==this.generation)return;
      const message=(e as Error).message;
      if(/denied|permission/i.test(message)){this.stop(false);this.publish({status:'denied',message});}
      else this.publish({locating:false,fresh:0,status:'recovering',message});
    }
  }
}
