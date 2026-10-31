const methods=new Set(['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']);
/** Deliberately coarse and allowlisted. Never emit URLs, query values, identities, headers, bodies, stacks or exception messages. */
export function diagnosticOperation(request:Request){
  const path=new URL(request.url).pathname,root=path.slice('/api/trail/'.length).split('/')[0];
  return path.startsWith('/api/trail/')&&['world','claims','spawns','visits','encounters','encounter','encounter-actions','activities','activity-preview','ideas','me','balance','admin'].includes(root)?root:'other';
}
export function unexpectedApiFailure(request:Request,error:unknown,logger:(message:string)=>void=message=>console.error(message)){
  const reference=crypto.randomUUID(),operation=diagnosticOperation(request),errorKind=error instanceof TypeError?'type':error instanceof SyntaxError?'syntax':error instanceof RangeError?'range':'unexpected';
  const record={service:'trail-shared-dev',event:'request-failure',reference,operation,method:methods.has(request.method)?request.method:'OTHER',status:500,errorKind};
  try{logger(JSON.stringify(record));}catch{/* Diagnostics must never prevent a bounded safe response. */}
  return new Response(JSON.stringify({error:`The shared dev service could not complete this request. Reference: ${reference}`,reference}),{status:500,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Trail-Reference':reference}});
}
