import type {LocationWatch} from './session';
import type {LocationFix} from './tracker';
import type {LocationSubscription} from './client';
/** Transport recovery only. The server decides movement, tile and reward eligibility. */
export class RawLocationSession{
  private wanted=false;private visible=true;private generation=0;private subscription:LocationSubscription|null=null;private received=0;private attempted=-Infinity;
  constructor(private watch:LocationWatch,private onFix:(fix:LocationFix)=>void,private onError:(message:string)=>void,private clock=()=>Date.now()){}
  start(){this.wanted=true;return this.replace();}
  stop(){this.wanted=false;this.generation++;this.subscription?.remove();this.subscription=null;}
  suspend(){this.visible=false;}
  resume(){const hidden=!this.visible;this.visible=true;if(this.wanted&&(hidden||this.clock()-this.received>25000)&&this.clock()-this.attempted>=2000)void this.replace();}
  tick(){if(this.wanted&&this.visible&&this.clock()-this.received>25000&&this.clock()-this.attempted>25000)void this.replace();}
  private async replace(){
    const generation=++this.generation;this.subscription?.remove();this.subscription=null;this.attempted=this.clock();
    try{const watcher=await this.watch(fix=>{if(generation!==this.generation||!this.wanted||!this.visible)return;this.received=this.clock();this.onFix(fix);},error=>{if(generation!==this.generation||!this.wanted)return;if(error.denied)this.stop();this.onError(error.message);});if(generation!==this.generation||!this.wanted)watcher.remove();else this.subscription=watcher;}
    catch(error){if(generation===this.generation&&this.wanted){if(/permission|denied/i.test((error as Error).message))this.stop();this.onError((error as Error).message);}}
  }
}
