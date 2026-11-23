/* Device-local appearance preference; no account or financial data is changed. */
(()=>{
 const key='habbit-theme',root=document.documentElement,system=window.matchMedia('(prefers-color-scheme: dark)');
 let preference;try{preference=localStorage.getItem(key)}catch{}
 let theme=preference==='dark'||preference==='light'?preference:system.matches?'dark':'light';
 const moon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20.7 13.2A8.8 8.8 0 0 1 10.8 3.3a8.8 8.8 0 1 0 9.9 9.9Z"/></svg>';
 const sun='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>';
 let button;
 function apply(){root.dataset.theme=theme;root.style.colorScheme=theme;if(button){const label=theme==='dark'?'Ativar modo claro':'Ativar modo escuro';button.innerHTML=theme==='dark'?sun:moon;button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(theme==='dark'));}}
 apply();
 document.addEventListener('DOMContentLoaded',()=>{button=document.createElement('button');button.type='button';button.className='theme-toggle';button.onclick=()=>{theme=theme==='dark'?'light':'dark';preference=theme;try{localStorage.setItem(key,theme)}catch{}apply()};document.querySelector('header').insertBefore(button,document.querySelector('#date'));apply()});
 system.addEventListener('change',event=>{if(preference!=='light'&&preference!=='dark'){theme=event.matches?'dark':'light';apply()}});
 window.addEventListener('storage',event=>{if(event.key===key){preference=event.newValue;theme=preference==='dark'||preference==='light'?preference:system.matches?'dark':'light';apply()}});
})();
