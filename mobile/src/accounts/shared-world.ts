import type {Storage,User} from './local-accounts';
import type {DevEvent,DevReceipt,DevWorld} from '../game/dev-world';
import type {EncounterAction,EncounterReceipt,EncounterView} from '../game/encounters';
import type {Boss} from '../game/bosses';
import type {ClaimPage,ClaimRecord,ClaimWindow} from '../map/claim-window';
export type SharedSnapshot={world:DevWorld;revision:number};
export type EncounterResult={view:EncounterView|null;receipt:EncounterReceipt;replayed:boolean;world?:SharedSnapshot};
export type CompletedActivity={id:string;endedAt:number;startedAt:number;movement:'foot'|'bicycle'};
export type ActivityPreview={id:string;movement:'foot'|'bicycle';meters:number;bossTileVisited:boolean;observedSeconds:number;eligibleStartedAt:number;endedAt:number};
type Pending={id:string;revision:number;event:DevEvent};
class SharedApiError extends Error{constructor(message:string,public status:number){super(message);}}
/** Shared dev identity is supplied by Sites; never send local profile passwords. */
export class SharedWorldClient{
  private owner='';private inFlight=false;
  constructor(private storage:Storage,private request:typeof fetch=globalThis.fetch.bind(globalThis)){}
  private async api<T>(path:string,method='GET',input?:unknown,signal?:AbortSignal):Promise<T>{
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
    const cancel=()=>abort.abort();if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
    try{const response=await this.request('/api/trail/'+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{}),signal:abort.signal});const data=await response.json();if(!response.ok)throw new SharedApiError(data.error||'Shared dev request failed',response.status);return data as T;}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
  }
  async profile(){const result=await this.api<{user:User}>('me');this.owner=result.user.id;return result.user;}
  async join(displayName:string){const result=await this.api<{user:User}>('me','POST',{displayName});this.owner=result.user.id;return result.user;}
  load(){return this.api<SharedSnapshot>('world');}
  visits(){return this.api<{visits:{tile:string;players:number}[]}>('visits');}
  claims(){return this.api<{claims:{tile:string;owner:string;price:number;updated_at:number;display_name:string}[]}>('claims');}
  async claimTile(tile:string,signal?:AbortSignal){const result=await this.api<ClaimPage>('claims?tile='+encodeURIComponent(tile),'GET',undefined,signal);if(result.mode!=='tile'||!Array.isArray(result.claims)||result.claims.length>1||result.claims.some(row=>row.tile!==tile))throw new Error('Tile price service changed; reload the app');return result;}
  async claimMap(window:ClaimWindow,signal?:AbortSignal){
    const claims=new Map<string,ClaimRecord>();let after='';const cursors=new Set<string>();
    for(let page=0;page<5;page++){
      const result=await this.api<ClaimPage>('claims?'+new URLSearchParams({south:String(window.south),north:String(window.north),west:String(window.west),east:String(window.east),limit:'100',...(after?{after}:{})}),'GET',undefined,signal);
      if(!['tiles','clusters'].includes(result.mode)||!Array.isArray(result.claims)||!Array.isArray(result.clusters))throw new Error('Ownership service changed; reload the app');
      for(const row of result.claims)claims.set(row.tile,row);if(!result.next)return{...result,claims:[...claims.values()]};
      if(cursors.has(result.next))throw new Error('Ownership map page repeated; refresh the view');cursors.add(result.next);after=result.next;
    }
    throw new Error('Zoom in to load complete tile ownership');
  }
  bosses(bounds:{west:number;east:number;south:number;north:number}){return this.api<{bosses:{boss:Boss;retired:boolean}[];truncated:boolean}>('bosses?'+new URLSearchParams(Object.entries(bounds).map(([key,value])=>[key,String(value)])));}
  encounters(){return this.api<{encounters:EncounterView[]}>('encounters');}
  activities(){return this.api<{activities:CompletedActivity[]}>('activities');}
  partyPlayers(q:string){return this.api<{players:{id:string;name:string}[]}>('party-players?q='+encodeURIComponent(q));}
  activityPreview(encounter:string,activity:string){return this.api<{activity:ActivityPreview}>('activity-preview?'+new URLSearchParams({encounter,activity}));}
  private encounterKey(){return'trail-relics.dev.shared.encounters.pending.v1:'+this.ownerKey();}
  private ownerKey(){if(!this.owner)throw new Error('Open your shared profile first');return this.owner;}
  async pendingEncounter(){return!!(await this.storage.getItem(this.encounterKey()));}
  async encounter(action:EncounterAction){
    if(this.inFlight)throw new Error('An action is still syncing');this.inFlight=true;
    try{if(await this.pendingEncounter()||await this.pending())throw new Error('Retry your pending action before continuing');
      const input={id:'enc:'+crypto.randomUUID(),action};await this.storage.setItem(this.encounterKey(),JSON.stringify(input));return await this.submitEncounter(input);
    }finally{this.inFlight=false;}
  }
  async retryEncounter(){
    if(this.inFlight)throw new Error('An action is still syncing');this.inFlight=true;
    try{const raw=await this.storage.getItem(this.encounterKey());if(!raw)throw new Error('No pending encounter action');return await this.submitEncounter(JSON.parse(raw));}finally{this.inFlight=false;}
  }
  private async submitEncounter(input:{id:string;action:EncounterAction}){
    try{const result=await this.api<EncounterResult>('encounter-actions','POST',input);await this.storage.removeItem(this.encounterKey());return result;}
    catch(e){
      // A definite validation/conflict response did not commit this action. Unknown outcomes stay journalled.
      if(e instanceof SharedApiError&&[400,403,404,409,413].includes(e.status))await this.storage.removeItem(this.encounterKey());throw e;
    }
  }
  async discardEncounterPending(){const result=await this.encounters();await this.storage.removeItem(this.encounterKey());return result;}
  private key(){if(!this.owner)throw new Error('Open your shared profile first');return'trail-relics.dev.shared.pending.v1:'+this.owner;}
  async pending(){return!!(await this.storage.getItem(this.key()));}
  async dispatch(event:DevEvent,revision:number){
    if(this.inFlight)throw new Error('An action is still syncing');
    this.inFlight=true;
    try{
      if(await this.pending()||await this.pendingEncounter())throw new Error('Retry the pending action before continuing');
      const pending:Pending={id:'web:'+crypto.randomUUID(),revision,event};
      await this.storage.setItem(this.key(),JSON.stringify(pending));return await this.submit(pending);
    }finally{this.inFlight=false;}
  }
  async retry(){
    if(this.inFlight)throw new Error('An action is still syncing');
    this.inFlight=true;
    try{const raw=await this.storage.getItem(this.key());if(!raw)throw new Error('No pending action');return await this.submit(JSON.parse(raw)as Pending);}finally{this.inFlight=false;}
  }
  private async submit(pending:Pending){const result=await this.api<SharedSnapshot&{receipt:DevReceipt;replayed:boolean}>('events','POST',pending);await this.storage.removeItem(this.key());return result;}
  async discardStalePending(){
    // Explicit recovery: re-read authoritative progress first, then remove this device's unsynced envelope.
    const result=await this.load();await this.storage.removeItem(this.key());return result;
  }
}
