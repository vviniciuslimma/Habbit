/* Server-authorized synchronization. No database secrets are sent to the browser. */
(()=>{
 const META='habbit-sync-v1',KEY='habbit-v1';let meta;try{meta=JSON.parse(localStorage.getItem(META))}catch{}meta??={revision:0,pending:false};
 let ready=false,busy=false,conflict=false,debounce=null,remote=null,sequence=0;const cachedAtStart=localStorage.getItem(KEY);
 const status=document.createElement('div');status.className='syncstatus';status.setAttribute('role','status');document.querySelector('header').append(status);
 function show(message,action){status.replaceChildren();const label=document.createElement('span');label.textContent=message;status.append(label);if(action){let b=document.createElement('button');b.className='tiny';b.textContent=action==='conflict'?'Revisar':'Tentar novamente';b.onclick=action==='conflict'?resolveConflict:()=>ready?flush():init();status.append(b)}}
 function persist(){localStorage.setItem(META,JSON.stringify(meta))}
 function payload(){let copy=JSON.parse(JSON.stringify(db));delete copy.timer;return copy}
 function backupLocal(){localStorage.setItem('habbit-before-cloud-'+Date.now(),JSON.stringify(db))}
 function adopt(data){db=data;db.timer=timer;localStorage.setItem(KEY,JSON.stringify(db));render()}
 async function request(method,body){const r=await fetch('/api/state',{method,credentials:'same-origin',headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});if(r.status===401)throw Error('Entre com sua conta para sincronizar.');if(r.status===409){conflict=true;show('Alteração em outro dispositivo','conflict');return null}if(!r.ok)throw Error('Sem sincronização · dados salvos neste aparelho');return r.json()}
 window.habbitOnSave=()=>{sequence++;meta.pending=true;persist();clearTimeout(debounce);if(ready&&!conflict){show('Salvando…');debounce=setTimeout(flush,700)}};
 async function init(){if(busy)return;busy=true;show('Conectando ao banco…');try{
  const value=await request('GET');if(!value)return;remote=value;
  if(value.data){
   if(meta.pending){if(meta.revision!==value.revision){conflict=true;show('Há dados diferentes neste aparelho','conflict');ready=true;return;}}
   else{if(cachedAtStart&&JSON.stringify(payload())!==JSON.stringify(value.data))backupLocal();adopt(value.data)}
   meta.revision=value.revision;
  }else{meta.revision=0;meta.pending=true;}
  ready=true;persist();show(meta.pending?'Salvando…':'Sincronizado');
 }catch(e){show(e.message,'retry')}finally{busy=false;if(ready&&meta.pending&&!conflict)flush()}}
 async function flush(){if(!ready||busy||conflict||!meta.pending)return;busy=true;const sent=sequence;show('Salvando…');try{const result=await request('PUT',{data:payload(),revision:meta.revision});if(!result)return;meta.revision=result.revision;meta.pending=sequence!==sent;persist();show(meta.pending?'Salvando…':'Sincronizado')}catch(e){show(e.message,'retry')}finally{busy=false;if(meta.pending&&!conflict&&sequence!==sent)setTimeout(flush,800)}}
 async function resolveConflict(){if(busy)return;busy=true;try{remote=await request('GET');if(!remote)return;modalForm('Conciliar seus registros',`<p>Há versões diferentes neste aparelho e no banco. Uma cópia local será preservada antes de trocar.</p><p>Exporte seus dados antes se quiser guardar uma cópia em arquivo.</p><button type="button" id="use-cloud">Carregar versão do banco</button><button type="button" id="use-local" style="margin-top:12px">Enviar versão deste aparelho</button>`,()=>false);
  document.querySelector('#use-cloud').onclick=()=>{backupLocal();adopt(remote.data);meta={revision:remote.revision,pending:false};persist();conflict=false;document.querySelector('#modal').close();show('Sincronizado')};
  document.querySelector('#use-local').onclick=()=>{if(!confirm('Substituir a versão do banco pelos registros deste aparelho?'))return;backupLocal();meta={revision:remote.revision,pending:true};persist();conflict=false;document.querySelector('#modal').close();flush()};
 }catch(e){show(e.message,'retry')}finally{busy=false}}
 async function refresh(){if(!ready||busy||conflict)return;if(meta.pending){flush();return}busy=true;try{const value=await request('GET');if(value&&value.data&&value.revision!==meta.revision){if(meta.pending){conflict=true;show('Alteração em outro dispositivo','conflict');return;}adopt(value.data);meta.revision=value.revision;persist();show('Sincronizado')}}catch(e){show(e.message,'retry')}finally{busy=false}}
 window.addEventListener('online',()=>ready?refresh():init());window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 setInterval(()=>{if(!document.hidden)refresh()},45000);init();
})();
