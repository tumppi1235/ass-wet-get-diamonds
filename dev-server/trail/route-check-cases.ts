// Fixed public catalog pairs only. Never substitute GPS or a player's private route.
export const ROUTE_CHECK_CASES=[
  {id:'rantalantie',name:'Rantalantie baseline',from:'haukivuori-rantalantie-1156889836-3942162041',to:'haukivuori-rantalantie-1156889836-10758372075'},
  {id:'helsinki',name:'Helsinki dense centre',from:'fi-path-1435114662-310034280',to:'fi-path-1155329754-4435014144'},
  {id:'haukkala',name:'Kirkkopuisto to Haukkala',from:'church-park',to:'haukkala-gate'},
  {id:'sippulanniemi',name:'Kirkkopuisto to Sippulanniemi',from:'church-park',to:'sippula-trail'},
  {id:'cross-city',name:'Haukkala to Sippulanniemi',from:'haukkala-gate',to:'sippula-trail'},
  {id:'long-public',name:'Kirkkopuisto to long public path',from:'church-park',to:'fi-path-1288950165-11952246089'},
  {id:'metro-long',name:'Helsinki to Espoo',from:'fi-path-1435114662-310034280',to:'fi-path-1376483460-12744781149'},
]as const;
