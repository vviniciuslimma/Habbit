/* Responsive navigation and presentation. Records and desktop structure stay shared. */
(()=>{
 const phone=window.matchMedia('(max-width:850px)');let toggle,bottom,backdrop;
 const items=[['inicio','⌂','Hoje'],['habitos','▦','Hábitos'],['agenda','▢','Agenda'],['treinos','◇','Treinos']];
 function menu(open){document.body.classList.toggle('mobile-menu-open',open);toggle?.setAttribute('aria-expanded',String(open));if(toggle){toggle.textContent=open?'✕':'☰';toggle.setAttribute('aria-label',open?'Fechar menu':'Abrir menu')}if(backdrop)backdrop.hidden=!open;}
 function update(){
  if(!bottom)return;const current=location.hash.slice(1)||'inicio';
  bottom.querySelectorAll('a').forEach(a=>{const selected=a.hash==='#'+current;a.classList.toggle('active',selected);if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  bottom.querySelector('button').classList.toggle('active',!items.some(i=>i[0]===current));
  document.querySelectorAll('.table').forEach(table=>{const labels=[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim());table.querySelectorAll('tbody tr').forEach(row=>[...row.cells].forEach((td,i)=>{td.dataset.label=labels[i]||'Ações';if(i===row.cells.length-1)td.classList.add('table-actions')}))});
  document.querySelectorAll('.habitgrid').forEach(table=>{const wrap=table.closest('.gridwrap');wrap.tabIndex=0;wrap.setAttribute('aria-label','Quadro mensal de hábitos. Deslize para os lados para ver todos os dias.');if(!wrap.previousElementSibling?.classList.contains('scroll-hint')){const hint=document.createElement('p');hint.className='scroll-hint';hint.textContent='Deslize o quadro para ver todos os dias do mês.';wrap.before(hint)}});
  const calendar=document.querySelector('.calendar');if(calendar&&!calendar.nextElementSibling?.classList.contains('calendar-hint')){const hint=document.createElement('p');hint.className='calendar-hint';hint.textContent='Os pontos indicam compromissos e contas. Toque no dia para ver os detalhes.';calendar.after(hint)}
 }
 window.habbitUpdateLayout=update;
 document.addEventListener('DOMContentLoaded',()=>{
  const aside=document.querySelector('aside');toggle=document.createElement('button');toggle.className='mobile-menu-toggle';toggle.type='button';toggle.textContent='☰';toggle.setAttribute('aria-label','Abrir menu');toggle.setAttribute('aria-controls','nav');toggle.setAttribute('aria-expanded','false');toggle.onclick=()=>menu(!document.body.classList.contains('mobile-menu-open'));aside.insertBefore(toggle,document.querySelector('#nav'));
  bottom=document.createElement('nav');bottom.className='mobile-tabs';bottom.setAttribute('aria-label','Navegação principal');bottom.innerHTML=items.map(([id,icon,label])=>`<a href="#${id}"><span aria-hidden="true">${icon}</span><span>${label}</span></a>`).join('')+'<button type="button" aria-label="Mais opções"><span aria-hidden="true">☰</span><span>Mais</span></button>';bottom.querySelector('button').onclick=()=>menu(!document.body.classList.contains('mobile-menu-open'));document.body.append(bottom);
  backdrop=document.createElement('button');backdrop.className='mobile-backdrop';backdrop.hidden=true;backdrop.setAttribute('aria-label','Fechar menu');backdrop.onclick=()=>menu(false);document.body.append(backdrop);
  aside.addEventListener('click',e=>{if(e.target.closest('a, .sidebottom button, .import'))menu(false)});
  function placeTheme(){const theme=document.querySelector('.theme-toggle');if(theme){if(phone.matches)aside.insertBefore(theme,toggle);else document.querySelector('header').insertBefore(theme,document.querySelector('#date'))}if(!phone.matches)menu(false)}
  placeTheme();phone.addEventListener('change',placeTheme);update();
 });
 window.addEventListener('hashchange',()=>{menu(false);update()});document.addEventListener('keydown',e=>{if(e.key==='Escape')menu(false)});
})();
