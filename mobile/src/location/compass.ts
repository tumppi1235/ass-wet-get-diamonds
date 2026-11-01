export type HeadingReading={degrees:number;timestamp:number;reference:'magnetic'|'absolute'};
export type HeadingSample={alpha?:number|null;beta?:number|null;gamma?:number|null;absolute?:boolean;webkitCompassHeading?:number;webkitCompassAccuracy?:number};
export const normalizeHeading=(angle:number)=>((angle%360)+360)%360;
export const headingDelta=(from:number,to:number)=>normalizeHeading(to-from+180)-180;
export const relativeBearing=(bearing:number,heading:number|null)=>heading===null?normalizeHeading(bearing):headingDelta(heading,bearing);
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);

/** Project the rendered screen's top edge through the W3C Z-X-Y earth rotation. */
export function readHeading(sample:HeadingSample,screenAngle:number,now:number):HeadingReading|null{
  if(!finite(screenAngle)||!finite(now))return null;
  if(finite(sample.webkitCompassHeading)){
    if(sample.webkitCompassHeading<0||sample.webkitCompassHeading>=360||!finite(sample.webkitCompassAccuracy)||sample.webkitCompassAccuracy<0||sample.webkitCompassAccuracy>35)return null;
    return{degrees:normalizeHeading(sample.webkitCompassHeading+screenAngle),timestamp:now,reference:'magnetic'};
  }
  if(!sample.absolute||!finite(sample.alpha)||!finite(sample.beta)||!finite(sample.gamma))return null;
  if(sample.alpha<0||sample.alpha>=360||Math.abs(sample.beta)>180||Math.abs(sample.gamma)>90)return null;
  const rad=Math.PI/180,a=sample.alpha*rad,b=sample.beta*rad,g=sample.gamma*rad,t=screenAngle*rad;
  const east=(Math.cos(a)*Math.cos(g)-Math.sin(a)*Math.sin(b)*Math.sin(g))*Math.sin(t)-Math.sin(a)*Math.cos(b)*Math.cos(t);
  const north=(Math.sin(a)*Math.cos(g)+Math.cos(a)*Math.sin(b)*Math.sin(g))*Math.sin(t)+Math.cos(a)*Math.cos(b)*Math.cos(t);
  if(Math.hypot(east,north)<.2)return null; // Screen top is nearly vertical: no usable horizontal bearing.
  return{degrees:normalizeHeading(Math.atan2(east,north)/rad),timestamp:now,reference:'absolute'};
}

export type CompassStatus='off'|'starting'|'live'|'waiting'|'stale'|'paused'|'denied'|'unavailable';
export type CompassSnapshot={status:CompassStatus;heading:number|null;reference:HeadingReading['reference']|null;message:string};
export const compassOff:CompassSnapshot={status:'off',heading:null,reference:null,message:'North-up guidance. Enable compass to turn the arrow with your phone.'};
export type HeadingWatch=(reading:(value:HeadingReading|null)=>void)=>Promise<{remove():void}>;
export class CompassSession{
  private generation=0;private wanted=false;private visible=true;private subscription:{remove():void}|null=null;
  private last:HeadingReading|null=null;private filtered:number|null=null;private publishedAt=-Infinity;private startedAt=0;
  private value={...compassOff};
  constructor(private watch:HeadingWatch,private changed:(s:CompassSnapshot)=>void,private clock=()=>Date.now()){}
  snapshot(){return{...this.value};}
  private publish(patch:Partial<CompassSnapshot>){const next={...this.value,...patch};if(JSON.stringify(next)!==JSON.stringify(this.value)){this.value=next;this.changed(this.snapshot());}}
  async start(){
    if(this.wanted&&(this.subscription||this.value.status==='starting'))return;
    this.wanted=true;const generation=++this.generation;this.startedAt=this.clock();
    this.last=null;this.filtered=null;this.publishedAt=-Infinity;
    this.publish({status:'starting',heading:null,reference:null,message:'Allow motion/orientation if asked. Waiting for compass…'});
    try{
      const subscription=await this.watch(reading=>{
        if(generation!==this.generation||!this.wanted||!this.visible)return;
        const now=this.clock();
        if(!reading||!finite(reading.degrees)||reading.degrees<0||reading.degrees>=360||!finite(reading.timestamp)||now-reading.timestamp>8000||reading.timestamp>now){
          this.last=null;this.filtered=null;this.publish({status:'waiting',heading:null,reference:null,message:'Hold the phone flatter and away from magnets. North-up guidance until the compass is reliable.'});return;
        }
        if(this.last&&reading.timestamp<=this.last.timestamp)return;
        if(this.last?.reference!==reading.reference)this.filtered=null;
        this.last=reading;
        this.filtered=this.filtered===null?reading.degrees:normalizeHeading(this.filtered+headingDelta(this.filtered,reading.degrees)*.4);
        if(now-this.publishedAt<150)return;
        this.publishedAt=now;
        this.publish({status:'live',heading:this.filtered,reference:reading.reference,message:reading.reference==='magnetic'?'Magnetic heading · approximate direction. Hold the phone flat; local magnetic variation can offset the arrow.':'Live heading · arrow turns with the top of your screen.'});
      });
      if(generation!==this.generation||!this.wanted||!this.visible)subscription.remove();else this.subscription=subscription;
    }catch(error){if(generation!==this.generation)return;this.wanted=false;const denied=(error as Error).name==='NotAllowedError';this.publish({status:denied?'denied':'unavailable',heading:null,reference:null,message:denied?'Compass permission denied. North-up guidance remains available. Retry after allowing motion/orientation.':'Compass is unavailable here. North-up guidance remains available.'});}
  }
  tick(){if(this.wanted&&this.visible&&this.clock()-(this.last?.timestamp??this.startedAt)>8000){this.filtered=null;this.publish({status:'stale',heading:null,reference:null,message:'No fresh compass reading. North-up guidance; move the phone gently or retry compass.'});}}
  stop(notify=true){this.wanted=false;this.generation++;this.subscription?.remove();this.subscription=null;this.last=null;this.filtered=null;if(notify)this.publish(compassOff);}
  suspend(){if(!this.visible)return;this.visible=false;this.generation++;this.subscription?.remove();this.subscription=null;this.last=null;this.filtered=null;if(this.wanted)this.publish({status:'paused',heading:null,reference:null,message:'Compass paused. North-up guidance until the app is visible.'});}
  resume(){if(this.visible)return;this.visible=true;if(this.wanted)void this.start();}
}
