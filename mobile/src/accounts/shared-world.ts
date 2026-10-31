import type {Storage,User} from './local-accounts';
import type {DevEvent,DevReceipt,DevWorld} from '../game/dev-world';
export type SharedSnapshot={world:DevWorld;revision:number};
type Pending={id:string;revision:number;event:DevEvent};
/** Shared dev identity is supplied by Sites; never send local profile passwords. */
export class SharedWorldClient{
  private owner='';private inFlight=false;
  constructor(private storage:Storage,private request:typeof fetch=globalThis.fetch.bind(globalThis)){}
  private async api<T>(path:string,method='GET',input?:unknown):Promise<T>{
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
    try{const response=await this.request('/api/trail/'+path,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{}),signal:abort.signal});const data=await response.json();if(!response.ok)throw new Error(data.error||'Shared dev request failed');return data as T;}finally{clearTimeout(timer);}
  }
  async profile(){const result=await this.api<{user:User}>('me');this.owner=result.user.id;return result.user;}
  async join(displayName:string){const result=await this.api<{user:User}>('me','POST',{displayName});this.owner=result.user.id;return result.user;}
  load(){return this.api<SharedSnapshot>('world');}
  visits(){return this.api<{visits:{tile:string;players:number}[]}>('visits');}
  claims(){return this.api<{claims:{tile:string;owner:string;price:number;updated_at:number;display_name:string}[]}>('claims');}
  private key(){if(!this.owner)throw new Error('Open your shared profile first');return'trail-relics.dev.shared.pending.v1:'+this.owner;}
  async pending(){return!!(await this.storage.getItem(this.key()));}
  async dispatch(event:DevEvent,revision:number){
    if(this.inFlight)throw new Error('An action is still syncing');
    this.inFlight=true;
    try{
      if(await this.pending())throw new Error('Retry the pending action before continuing');
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
