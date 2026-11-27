// Browser-side Web Push. Server sends messages; no private keys in this file.
export function setupPush({db,getHub,canWork,msg,unlock}) {
 const button=document.getElementById('background'),status=document.getElementById('backgroundstatus'),install=document.getElementById('installapp');
 let prompt=null,busy=false,revision=0,active=false;
 const supported=()=>window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
 const register=()=>navigator.serviceWorker.register('/spx-sw.js',{scope:'/'}).then(()=>navigator.serviceWorker.ready);
 const rpc=async(n,p)=>{const r=await db.rpc(n,p);if(r.error)throw Error(r.error.message);return r.data;};
 const label=(on,message)=>{active=on;button.textContent=on?'🔔 Segundo plano ativo':'🔔 Ativar segundo plano';button.setAttribute('aria-pressed',String(on));status.textContent=message||'';};
 const getSub=async()=>{const reg=await navigator.serviceWorker.getRegistration('/');return reg?reg.pushManager.getSubscription():null;};
 async function refresh(){const token=++revision,h=getHub()?.id;button.hidden=!canWork();status.hidden=!canWork();if(!canWork())return;label(false);if(!supported()){status.textContent='No iPhone, adicione o app à Tela de Início; em outros aparelhos, use um navegador compatível.';return;}if(Notification.permission==='denied'){status.textContent='Notificações bloqueadas nas permissões do navegador.';return;}try{const s=await getSub();if(token!==revision)return;if(s&&h){const v=await rpc('spx_push_status',{p_hub:h,p_endpoint:s.endpoint});if(token===revision)label(v===true,v?'Alertas deste HUB neste dispositivo.':'Ative para receber alertas neste dispositivo.');}}catch(e){if(token===revision)status.textContent='Segundo plano indisponível: '+e.message;}}
 function keyBytes(v){const raw=atob(v.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(v.length/4)*4,'='));return Uint8Array.from(raw,x=>x.charCodeAt(0));}
 async function disable(){const s=await getSub();if(!s)return;try{await rpc('spx_push_remove',{p_endpoint:s.endpoint});}finally{await s.unsubscribe();}}
 button.onclick=async()=>{if(busy||!canWork())return;busy=true;button.disabled=true;const h=getHub()?.id;try{if(!supported())throw Error('Navegador sem Web Push. No iPhone, instale o portal na Tela de Início.');if(active){await disable();await refresh();return;}unlock();const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Permita notificações nas configurações do navegador.');const key=await rpc('spx_push_public_key',{});if(typeof key!=='string'||!key)throw Error('Servidor de notificações ainda não configurado.');const reg=await register();let s=await reg.pushManager.getSubscription();if(s&&s.options.applicationServerKey&&String(new Uint8Array(s.options.applicationServerKey))!==String(keyBytes(key))){await s.unsubscribe();s=null;}if(!s)s=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(key)});if(getHub()?.id!==h||!canWork())throw Error('HUB alterado. Tente novamente.');const j=s.toJSON();await rpc('spx_push_save',{p_hub:h,p_endpoint:s.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth});await refresh();}catch(e){status.textContent=e.message;msg(e.message);}finally{busy=false;button.disabled=false;}};
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();prompt=e;install.hidden=false;});
 window.addEventListener('appinstalled',()=>{prompt=null;install.hidden=true;});
 if(!window.matchMedia('(display-mode: standalone)').matches&&!navigator.standalone)install.hidden=false;
 install.onclick=async()=>{if(prompt){await prompt.prompt();await prompt.userChoice;prompt=null;install.hidden=true;}else msg('Android/PC: menu do navegador → Instalar aplicativo. iPhone: Safari → Compartilhar → Adicionar à Tela de Início.');};
 if('serviceWorker' in navigator&&window.isSecureContext)navigator.serviceWorker.register('/spx-sw.js',{scope:'/'}).catch(()=>{});
 return {refresh,disable};
}
