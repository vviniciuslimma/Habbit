/* Publishable key only; account ownership is enforced by database RLS. */
(()=>{
 const client=supabase.createClient('https://lpjkznammgscespgizud.supabase.co','sb_publishable_79q4O123UaTkQJToI5UIfw_KFwJYh1s',{auth:{storageKey:'habbit-account-session',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 window.habbitUsesAccount=true;let unlock;window.habbitAuthReady=new Promise(resolve=>unlock=resolve);
 let active=false,activeUser=null,mode='login',entering=false;
 const gate=document.createElement('section');gate.id='authgate';gate.innerHTML=`<div class="authcard"><div class="eyebrow">SEU ESPAÇO PESSOAL</div><h1 id="auth-title">Bem-vindo ao Habbit.</h1><p id="auth-description">Pequenos passos. Uma vida com mais intenção.</p><div class="auth-tabs" role="group" aria-label="Acesso à conta"><button type="button" id="login-tab" aria-pressed="true">Entrar</button><button type="button" id="signup-tab" aria-pressed="false">Criar conta</button></div><form id="account-form"><label class="field" id="signup-name" hidden>Seu nome<input name="displayName" type="text" autocomplete="given-name" maxlength="60"></label><label class="field">E-mail<input name="email" type="email" autocomplete="username" required></label><label class="field">Senha<input name="password" type="password" autocomplete="current-password" required></label><label class="field" id="signup-confirm" hidden>Confirmar senha<input name="passwordConfirm" type="password" autocomplete="new-password"></label><p id="auth-message" role="status" aria-live="polite"></p><button id="auth-submit" class="primary" type="submit">Entrar</button></form><p class="sub" id="auth-note">Seus registros ficam privados e separados dos de outras pessoas.</p></div>`;
 document.body.append(gate);const form=gate.querySelector('form'),message=gate.querySelector('#auth-message');
 function setMode(value){mode=value;const signup=mode==='signup';gate.querySelector('#signup-name').hidden=!signup;gate.querySelector('#signup-confirm').hidden=!signup;form.displayName.required=signup;form.passwordConfirm.required=signup;form.password.autocomplete=signup?'new-password':'current-password';form.password.minLength=signup?8:1;form.passwordConfirm.value='';form.password.value='';gate.querySelector('#auth-submit').textContent=signup?'Criar minha conta':'Entrar';gate.querySelector('#auth-title').textContent=signup?'Seu próximo passo começa aqui.':'Bem-vindo ao Habbit.';gate.querySelector('#auth-description').textContent=signup?'Crie sua conta e organize sua rotina do seu jeito.':'Pequenos passos. Uma vida com mais intenção.';gate.querySelector('#login-tab').setAttribute('aria-pressed',String(!signup));gate.querySelector('#signup-tab').setAttribute('aria-pressed',String(signup));message.textContent='';}
 gate.querySelector('#login-tab').onclick=()=>setMode('login');gate.querySelector('#signup-tab').onclick=()=>setMode('signup');
 function lock(){document.body.classList.add('auth-locked');document.querySelector('main').inert=true;document.querySelector('aside').inert=true;gate.hidden=false;active=false;}
 function blank(){return {habits:JSON.parse(JSON.stringify(defaults)),plans:{},checks:{},sessions:[],events:[],money:[],workouts:[],goals:{reading:300,ratio:20},initial:0,created:today()};}
 async function unlockAccount(){
  if(entering)return;entering=true;
  try{
   const {data,error}=await client.auth.getUser();if(error||!data.user){lock();return;}const user=data.user;
   if(activeUser&&activeUser!==user.id){lock();location.reload();return;}
   const check=await client.rpc('habbit_account_initialize',{p_initial:blank()});
   if(check.error||!check.data){lock();message.textContent='Não foi possível abrir seu espaço. Tente entrar novamente.';return;}
   const key='habbit-v2:'+user.id,syncKey='habbit-account-sync-v2:'+user.id;let cached;try{cached=JSON.parse(localStorage.getItem(key))}catch{}
   // Never import an unscoped cache into another person's account.
   window.habbitStorageKey=key;window.habbitSyncKey=syncKey;
   db=cached||check.data.data;timer=db.timer||{habit:'2',elapsed:0,start:null};localStorage.setItem(key,JSON.stringify(db));
   activeUser=user.id;active=true;window.habbitDisplayName=String(user.user_metadata?.display_name||'').trim().slice(0,60);
   const profile=document.querySelector('.profile>span');if(profile){profile.replaceChildren(document.createTextNode(window.habbitDisplayName||'Meu espaço'));const small=document.createElement('small');small.textContent='Meu espaço pessoal';profile.append(small)}document.querySelector('.profile>b').textContent=(window.habbitDisplayName||'H').slice(0,1).toUpperCase();
   render();gate.hidden=true;document.body.classList.remove('auth-locked');document.querySelector('main').inert=false;document.querySelector('aside').inert=false;message.textContent='';unlock();
  }catch{lock();message.textContent='Não foi possível conectar. Tente novamente.'}finally{entering=false}
 }
 lock();
 function errorMessage(error,signup){if(error?.code==='signup_disabled')return 'Os cadastros estão temporariamente indisponíveis.';if(error?.code==='over_email_send_rate_limit'||error?.status===429)return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';if(error?.code==='weak_password')return 'Escolha uma senha mais forte, com pelo menos 8 caracteres.';if(error?.code==='email_not_confirmed')return 'Confirme seu e-mail para entrar.';if(signup&&error?.code==='user_already_exists')return 'Este e-mail já tem uma conta. Use a opção Entrar.';return signup?'Não foi possível criar a conta. Confira os dados e tente novamente.':'Não foi possível entrar. Confira seu e-mail e sua senha.';}
 form.onsubmit=async event=>{event.preventDefault();const b=gate.querySelector('#auth-submit'),signup=mode==='signup';if(signup&&form.password.value!==form.passwordConfirm.value){message.textContent='As senhas precisam ser iguais.';return;}b.disabled=true;gate.querySelectorAll('.auth-tabs button').forEach(x=>x.disabled=true);message.textContent=signup?'Criando sua conta…':'Entrando…';try{
   const email=form.email.value.trim(),password=form.password.value;let result;
   if(signup)result=await client.auth.signUp({email,password,options:{data:{display_name:form.displayName.value.trim()}}});
   else result=await client.auth.signInWithPassword({email,password});
   form.password.value='';form.passwordConfirm.value='';
   if(result.error){message.textContent=errorMessage(result.error,signup);return;}
   if(signup&&!result.data.session){setMode('login');message.textContent='Conta solicitada! Se houver confirmação pendente, confira seu e-mail e depois entre por aqui.';return;}
   await unlockAccount();
  }catch{message.textContent='Não foi possível conectar. Tente novamente.'}finally{b.disabled=false;gate.querySelectorAll('.auth-tabs button').forEach(x=>x.disabled=false)}};
 const logout=document.createElement('button');logout.className='tiny logout-button';logout.textContent='Sair';logout.onclick=async()=>{if(!confirm('Sair deste aparelho? Confira se aparece Sincronizado antes de sair.'))return;lock();await client.auth.signOut({scope:'local'});location.reload()};document.querySelector('header').append(logout);
 window.habbitRequestState=async(method,body)=>{
  const session=await client.auth.getSession();if(!active||session.data.session?.user.id!==activeUser){lock();throw Error('Entre na sua conta para sincronizar.');}
  const rpc=method==='GET'?'habbit_account_read':'habbit_account_write';const response=await fetch('https://lpjkznammgscespgizud.supabase.co/rest/v1/rpc/'+rpc,{method:'POST',headers:{'content-type':'application/json',apikey:'sb_publishable_79q4O123UaTkQJToI5UIfw_KFwJYh1s',Authorization:'Bearer '+session.data.session.access_token},body:JSON.stringify(method==='GET'?{}:{p_data:body.data,p_revision:body.revision}),signal:AbortSignal.timeout(25000)});if(!response.ok){if(response.status===401)lock();throw Error('Sem sincronização · dados preservados neste aparelho');}const data=await response.json();if(!data)throw Error('Não foi possível abrir seu espaço.');return data;
 };
 window.habbitTasksRequest=async(name,params={})=>{
  const allowed=['habbit_tasks_list','habbit_tasks_invite','habbit_tasks_accept','habbit_tasks_create','habbit_tasks_complete','habbit_tasks_disconnect'];
  if(!allowed.includes(name))throw Error('Operação inválida.');
  const session=await client.auth.getSession();if(!active||session.data.session?.user.id!==activeUser){lock();throw Error('Entre na sua conta para abrir as tarefas.');}
  const response=await fetch('https://lpjkznammgscespgizud.supabase.co/rest/v1/rpc/'+name,{method:'POST',headers:{'content-type':'application/json',apikey:'sb_publishable_79q4O123UaTkQJToI5UIfw_KFwJYh1s',Authorization:'Bearer '+session.data.session.access_token},body:JSON.stringify(params),signal:AbortSignal.timeout(25000)});
  if(!response.ok){if(name==='habbit_tasks_accept')throw Error('Código inválido, vencido ou já utilizado. Confira com quem enviou.');throw Error('Não foi possível atualizar as tarefas. Tente novamente.');}
  return response.json();
 };
 client.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT')lock();else if(activeUser&&session?.user.id!==activeUser){lock();location.reload()}});
 client.auth.getSession().then(({data})=>{if(data.session)unlockAccount()}).catch(()=>{message.textContent='Não foi possível verificar sua sessão.'});
})();
