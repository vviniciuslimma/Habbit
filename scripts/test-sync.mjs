import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
const source=fs.readFileSync('dist/sync.js','utf8');
async function scenario({cached,cloud,pending=false,revision=0}){
 const store=new Map();if(cached)store.set('habbit-v1',JSON.stringify(cached));store.set('habbit-sync-v1',JSON.stringify({revision,pending}));let writes=[];let state=structuredClone(cached||{habits:[],sessions:[]});
 const element=()=>({className:'',setAttribute(){},append(){},replaceChildren(){},textContent:''});
 const context=vm.createContext({db:state,timer:{start:null},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},document:{querySelector:()=>element(),createElement:element,addEventListener(){},hidden:false},window:{addEventListener(){}},JSON,Date,AbortSignal,setTimeout:fn=>{fn();return 0},setInterval(){},clearTimeout(){},render(){},fetch:async(_,options)=>{if(options.method==='GET')return Response.json(cloud);writes.push(JSON.parse(options.body));return Response.json({revision:1})},modalForm(){},confirm:()=>true});
 vm.runInContext(source,context);await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));return {store,writes,context};
}
const local={habits:[{id:'reading'}],sessions:[{id:'local'}]},remote={habits:[{id:'reading'}],sessions:[{id:'remote'}]};
let s=await scenario({cached:local,cloud:{data:null,revision:0}});assert.equal(s.writes[0].data.sessions[0].id,'local');assert.equal(JSON.parse(s.store.get('habbit-sync-v1')).pending,false);
s=await scenario({cloud:{data:remote,revision:4}});assert.equal(s.context.db.sessions[0].id,'remote');assert.equal(s.writes.length,0);
s=await scenario({cached:local,pending:true,revision:2,cloud:{data:remote,revision:4}});assert.equal(s.context.db.sessions[0].id,'local');assert.equal(s.writes.length,0);
s=await scenario({cached:local,pending:true,revision:4,cloud:{data:remote,revision:4}});assert.equal(s.writes[0].revision,4);assert.equal(s.writes[0].data.sessions[0].id,'local');
console.log('PASS: first migration, new device download, conflict protection, offline queue retry.');
