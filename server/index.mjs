// Identity is supplied by Sites dispatch, never by the browser body.
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
export function makeWorker(assets){return {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/api/health')return json({ok:true,storage:'supabase',configured:Boolean(env.HABBIT_SYNC_SECRET&&env.HABBIT_SYNC_URL)});
 if(url.pathname==='/api/state'){
  const owner=request.headers.get('oai-authenticated-user-id');
  if(!owner)return json({error:'Entre com sua conta do ChatGPT para sincronizar.'},401);
  if(!env.HABBIT_SYNC_SECRET||!env.HABBIT_SYNC_URL)return json({error:'Sincronização ainda não configurada.'},503);
  if(!['GET','PUT'].includes(request.method))return json({error:'Método não permitido.'},405);
  if(request.method==='PUT'&&request.headers.get('origin')!==url.origin)return json({error:'Origem inválida.'},403);
  let body={owner,action:'read'};
  if(request.method==='PUT'){
   const raw=await request.text();if(raw.length>1500000)return json({error:'Limite de dados excedido.'},413);
   try{const v=JSON.parse(raw);if(!Number.isSafeInteger(v.revision)||v.revision<0||!v.data||!Array.isArray(v.data.habits)||!Array.isArray(v.data.sessions))return json({error:'Dados inválidos.'},400);body={owner,action:'write',data:v.data,revision:v.revision};}catch{return json({error:'JSON inválido.'},400)}
  }
  try{
   const response=await fetch(env.HABBIT_SYNC_URL,{method:'POST',headers:{'content-type':'application/json','x-habbit-secret':env.HABBIT_SYNC_SECRET},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
   if(!response.ok&&response.status!==409)return json({error:'Banco indisponível. Seus dados locais estão preservados.'},503);
   return json(await response.json(),response.status);
  }catch{return json({error:'Sem conexão com o banco. Tente novamente.'},503)}
 }
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 const asset=assets[url.pathname];if(!asset)return new Response('Not found',{status:404});
 return new Response(request.method==='HEAD'?null:asset.body,{headers:{'content-type':asset.type,'cache-control':'no-cache','x-content-type-options':'nosniff','referrer-policy':'same-origin'}});
}}}
