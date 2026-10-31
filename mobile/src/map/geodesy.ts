const R=6371008.8,rad=Math.PI/180;
export type Geographic={latitude:number;longitude:number};
export function groundDistance(a:Geographic,b:Geographic){
  const dl=(b.latitude-a.latitude)*rad,dn=(b.longitude-a.longitude)*rad;
  const h=Math.sin(dl/2)**2+Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dn/2)**2;
  return 2*R*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
}
export function groundBearing(a:Geographic,b:Geographic){
  const d=(b.longitude-a.longitude)*rad,x=Math.sin(d)*Math.cos(b.latitude*rad),y=Math.cos(a.latitude*rad)*Math.sin(b.latitude*rad)-Math.sin(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.cos(d);
  return(Math.atan2(x,y)/rad+360)%360;
}
export function groundDestination(a:Geographic,meters:number,bearing:number):Geographic{
  const delta=meters/R,theta=bearing*rad,lat=a.latitude*rad,lon=a.longitude*rad;
  const targetLat=Math.asin(Math.sin(lat)*Math.cos(delta)+Math.cos(lat)*Math.sin(delta)*Math.cos(theta));
  const targetLon=lon+Math.atan2(Math.sin(theta)*Math.sin(delta)*Math.cos(lat),Math.cos(delta)-Math.sin(lat)*Math.sin(targetLat));
  return{latitude:targetLat/rad,longitude:(targetLon/rad+540)%360-180};
}
