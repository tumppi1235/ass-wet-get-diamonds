/** Avoid retiling identical GeoJSON on UI clock/status renders. */
export class SourceUpdates {
  private signatures = new Map<string,string>();
  send<T>(id:string,value:T,write:(value:T)=>void){
    const signature=JSON.stringify(value);
    if(this.signatures.get(id)===signature)return false;
    write(value);this.signatures.set(id,signature);return true;
  }
}
