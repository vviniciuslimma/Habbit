const EXPECTED_HASH = "7bf13f90006ff36e2e691d4ef6bb42fa484e418a99adffee13dfde5124e02125";
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
Deno.serve(async(req)=>{
 if(req.method!=="POST")return response({error:"Method not allowed"},405);
 const provided=req.headers.get("x-habbit-secret")||"";
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(provided)))).map(n=>n.toString(16).padStart(2,"0")).join("");
 if(digest!==EXPECTED_HASH)return response({error:"Unauthorized"},401);
 try{
  const raw=await req.text();if(raw.length>1500000)return response({error:"Too large"},413);
  const input=JSON.parse(raw);
  if(typeof input.owner!=="string"||input.owner.length<1||input.owner.length>200)return response({error:"Invalid owner"},400);
  if(!["read","write"].includes(input.action))return response({error:"Invalid action"},400);
  if(input.action==="write"&&(!Number.isSafeInteger(input.revision)||input.revision<0||!input.data||typeof input.data!=="object"||!Array.isArray(input.data.habits)||!Array.isArray(input.data.sessions)))return response({error:"Invalid payload"},400);
  const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const key=keys.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!key)return response({error:"Configuration unavailable"},503);
  const headers={"content-type":"application/json",apikey:key};if(key.startsWith("eyJ"))headers.Authorization="Bearer "+key;
  const body={p_owner:input.owner};if(input.action==="write"){body.p_data=input.data;body.p_revision=input.revision;}
  const r=await fetch(Deno.env.get("SUPABASE_URL")+"/rest/v1/rpc/habbit_"+input.action,{method:"POST",headers,body:JSON.stringify(body)});
  if(!r.ok){console.error("Habbit RPC failed",r.status);return response({error:"Database unavailable"},503)}
  const result=await r.json();return response(result,result.conflict?409:200);
 }catch{return response({error:"Invalid request"},400)}
});
