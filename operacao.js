import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.4';
const db=createClient('https://jbblmzoihmkevztdwbds.supabase.co','sb_publishable_65EbQLsH-TO7sldvcG0QrQ_rHOnAgFP');
const $=id=>document.getElementById(id), msg=s=>$('message').textContent=s||'';
const roleLabel=r=>({developer:'Desenvolvedor',manager:'Supervisor',supervisor:'Líder',analyst:'Analista',viewer:'Visualizador'}[r]||r||'Acesso por HUB');
let me,workspace,hub,channel,epoch=0,subEpoch=0,audio,pendingSound=false,seen=new Map(),drafts=new Map();
const dualRole=()=>['developer','supervisor'].includes(hub?.role);
const workTeams=()=>dualRole()?['fleet','inventory']:['manager','analyst'].includes(hub?.role)&&['fleet','inventory'].includes(hub?.team)?[hub.team]:[];
const canWork=()=>workTeams().length>0;
let soundMuted=false;
const canMute=()=>dualRole();
const soundEnabled=()=>canWork()&&(!canMute()||!soundMuted);
const soundKey=()=> 'spxMuted:'+me?.id;
function readSound(){try{soundMuted=canMute()&&localStorage.getItem(soundKey())==='true';}catch{soundMuted=false;}}
function storeSound(){try{localStorage.setItem(soundKey(),String(soundMuted));}catch{}}
const teamLabel=t=>({fleet:'Fleet',inventory:'Inventário',both:'Fleet + Inventário'}[t]||'Sem equipe');
const other=t=>t==='fleet'?'inventory':'fleet';
function eligible(c,t){return workTeams().includes(t)&&c.status!=='done'&&(c.target_team===t||c.target_team==='both'||!!c[other(t)+'_validated']);}
function canClaim(c,t){return eligible(c,t)&&!c[t+'_analyst']&&(dualRole()||c[other(t)+'_analyst']!==me.id);}
const canManage=()=>['developer','manager','supervisor'].includes(hub?.role);
function el(tag,t,cls){const e=document.createElement(tag);if(t!=null)e.textContent=t;if(cls)e.className=cls;return e;}
function btn(t,fn){const b=el('button',t);b.type='button';b.onclick=async()=>{b.disabled=true;try{await fn();}catch(e){msg(e.message);}finally{b.disabled=false;}};return b;}
async function rpc(n,p={}){const r=await db.rpc(n,p);if(r.error)throw Error(r.error.message);return r.data;}
function form(id,fn){const f=$(id);f.onsubmit=async e=>{e.preventDefault();const b=f.querySelector('button[type="submit"],button:not([type])');if(b)b.disabled=true;try{await fn();msg('Alteração concluída.');}catch(e){msg(e.message);}finally{if(b)b.disabled=false;}};}
$('google').onclick=async()=>{const r=await db.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,queryParams:{hd:'shopee.com'}}});if(r.error)msg(r.error.message);};
$('logout').onclick=async()=>{await db.auth.signOut();location.reload();};
function soundStatus(){const button=$('sound');if(!canWork())return;const running=audio?.state==='running';button.dataset.muted=String(!soundEnabled());if(canMute()){button.textContent=soundMuted?'🔇 Som desativado · ativar':running?'🔔 Som ativo · desativar':'🔔 Liberar som';button.setAttribute('aria-pressed',String(soundEnabled()));}else{button.textContent=running?'🔔 Som sempre ativo · testar':'🔔 Liberar som (toque uma vez)';button.removeAttribute('aria-pressed');}}
function beep(){if(!soundEnabled()){pendingSound=false;return;}if(audio?.state!=='running'){pendingSound=true;return;}for(let i=0;i<2;i++){const o=audio.createOscillator(),g=audio.createGain(),at=audio.currentTime+i*.27;o.frequency.value=880;g.gain.setValueAtTime(.12,at);o.connect(g).connect(audio.destination);o.start(at);o.stop(at+.18);}}
function unlock(test=false){if(!soundEnabled())return;try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio ||= new AC();audio.onstatechange=soundStatus;audio.resume().then(()=>{soundStatus();if(soundEnabled()&&audio.state==='running'&&(pendingSound||test)){pendingSound=false;beep();}}).catch(soundStatus);soundStatus();}catch{soundStatus();}}
$('sound').onclick=()=>{if(!canWork())return;if(!canMute()){unlock(true);return;}if(soundMuted){soundMuted=false;storeSound();soundStatus();unlock(true);}else if(audio?.state!=='running'){unlock(true);}else{soundMuted=true;pendingSound=false;storeSound();audio.suspend().catch(()=>{});soundStatus();}};
document.addEventListener('pointerdown',e=>{if(e.target.closest?.('#sound'))return;if(soundEnabled()&&audio?.state!=='running')unlock();},{capture:true});
document.addEventListener('keydown',e=>{if(e.target.closest?.('#sound'))return;if(soundEnabled()&&audio?.state!=='running')unlock();},{capture:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){unlock();load().catch(e=>msg(e.message));}});
function duration(ms){let s=Math.max(0,Math.floor(ms/1000));return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(x=>String(x).padStart(2,'0')).join(':');}
function tick(){document.querySelectorAll('[data-clock]').forEach(e=>e.textContent=duration((e.dataset.end?Date.parse(e.dataset.end):Date.now())-Date.parse(e.dataset.clock)));}
function card(c,firstByTeam={},carry=false){
 const d=el('article',null,'card callcard');d.dataset.status=c.status;
 const top=el('div',null,'calltop');top.append(el('h3','Bancada '+String(c.dock).padStart(2,'0')),el('span',teamLabel(c.target_team),'team-pill'));d.append(top,el('p',c.shift+' · '+new Date(c.created).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+' · '+({waiting:'Aguardando',working:'Em atendimento',done:'Finalizado'}[c.status])));
 const t=el('strong');t.dataset.clock=c.created;if(c.finished)t.dataset.end=c.finished;d.append(el('small','Tempo total '),t);
 if(c.recall_count)d.append(el('p','🔔 Rechamadas: '+c.recall_count+' · '+teamLabel(c.last_recall_team)));
 const checks=el('div',null,'team-checks');
 for(const team of ['fleet','inventory']){const b=el('div',null,'team-check');b.dataset.valid=String(!!c[team+'_validated']);b.append(el('strong',teamLabel(team)),el('span',c[team+'_validated']?'Validado · '+c[team+'_removed']+' pacote(s)':c[team+'_analyst']?'Em atendimento':'Pendente'));if(c[team+'_name'])b.append(el('small',c[team+'_name']));checks.append(b);}d.append(checks);
 const mismatch=c.fleet_validated&&c.inventory_validated&&(c.fleet_removed!==c.inventory_removed||c.fleet_reason!==c.inventory_reason);
 if(mismatch)d.append(el('p','Divergência nas validações. Confira quantidade e motivo.','mismatch'));
 if(c.fleet_analyst&&c.fleet_analyst===c.inventory_analyst)d.append(el('p','Ambas as equipes assumidas pelo mesmo responsável (atuação de gestão).'));
 if(carry)d.append(el('p','Pendência de dia anterior','mismatch'));
 for(const team of workTeams()){
 if(firstByTeam[team]===c.id&&canClaim(c,team))d.append(btn('Assumir • '+teamLabel(team),async()=>{if(c[other(team)+'_analyst']===me.id&&!confirm('Você já assumiu a outra equipe. Confirme a atuação também em '+teamLabel(team)+'.'))return;await rpc('spx_team_claim_as',{p_id:c.id,p_team:team});await load();}));
 if(canWork()&&c.status==='working'&&c[team+'_analyst']===me.id&&(!c[team+'_validated']||mismatch)){
 const f=el('form'),n=el('input'),r=el('select'),notes=el('textarea'),b=el('button',mismatch?'Corrigir validação':'Validar • '+teamLabel(team));
 n.type='number';n.min='0';n.max='100000';n.step='1';n.required=true;
 for(const v of ['Volumetria','Capacidade do veículo','Divergência','Outros']){const o=el('option',v);o.value=v;r.append(o);}
 notes.maxLength=500;notes.placeholder='Observações (opcional)';
 const draftKey=c.id+':'+team;const old=drafts.get(draftKey);if(old){n.value=old.n;r.value=old.r;notes.value=old.notes;}else if(c[team+'_validated']){n.value=c[team+'_removed'];if(c[team+'_reason']!=='Sem remoção')r.value=c[team+'_reason'];notes.value=c[team+'_notes']||'';}
 f.oninput=()=>drafts.set(draftKey,{n:n.value,r:r.value,notes:notes.value});f.append(el('label','Pacotes removidos (informe zero se não houve)'),n,el('label','Motivo da remoção'),r,notes,b);f.onsubmit=async e=>{e.preventDefault();b.disabled=true;try{await rpc('spx_team_validate_as',{p_id:c.id,p_team:team,p_removed:Number(n.value),p_reason:r.value,p_notes:notes.value});drafts.delete(draftKey);await load();}catch(e){msg(e.message);}finally{b.disabled=false;}};d.append(f);}
 }
 if(c.status==='done')d.append(el('p','Removidos confirmados: '+(c.removed??0)+' · '+(c.reason||'')));
 return d;
}
const columns='id,seq,dock,shift,status,created,claimed,finished,removed,reason,recall_count,last_recall,last_recall_team,target_team,fleet_analyst,fleet_name,fleet_claimed,fleet_validated,fleet_removed,fleet_reason,fleet_notes,inventory_analyst,inventory_name,inventory_claimed,inventory_validated,inventory_removed,inventory_reason,inventory_notes';
function localDay(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function dayWindow(){const day=localDay(),from=day+'T00:00:00-03:00',end=new Date(from);end.setUTCDate(end.getUTCDate()+1);return {day,from,to:end.toISOString()};}
async function load(){if(!hub)return;const req=++epoch,h=hub.id,{day,from,to}=dayWindow();
 const activePromise=db.from('spx_calls').select(columns).eq('hub_id',h).eq('source','production').in('status',['waiting','working']).order('seq').limit(30);
 const historyPromise=(async()=>{let rows=[],cursor=0;for(;;){const r=await db.from('spx_calls').select(columns).eq('hub_id',h).eq('source','production').eq('status','done').gte('created',from).lt('created',to).gt('seq',cursor).order('seq').limit(500);if(r.error)throw Error(r.error.message);if(!r.data.length)break;rows.push(...r.data);cursor=r.data.at(-1).seq;if(req!==epoch||hub?.id!==h)return []; }return rows.reverse();})();
 const [a,history]=await Promise.all([activePromise,historyPromise]);if(req!==epoch||hub?.id!==h)return;if(a.error)throw Error(a.error.message);
 const active=a.data,teams=workTeams(),isToday=x=>Date.parse(x.created)>=Date.parse(from)&&Date.parse(x.created)<Date.parse(to),daily=active.filter(isToday),carry=active.filter(x=>!isToday(x)),w=daily.filter(x=>x.status==='waiting');
 const firstByTeam=Object.fromEntries(teams.map(t=>[t,active.find(c=>canClaim(c,t))?.id]));
 const actionable=c=>teams.some(t=>eligible(c,t)&&!c[t+'_validated']&&((!c[t+'_analyst']&&(dualRole()||c[other(t)+'_analyst']!==me.id))||c[t+'_analyst']===me.id));
 if(soundEnabled()&&active.some(c=>{const old=seen.get(c.id);return (actionable(c)&&!old?.actionable)||(old&&Number(c.recall_count)>old.recalls&&teams.some(t=>eligible(c,t)&&[t,'both'].includes(c.last_recall_team)));})){beep();unlock();}
 seen=new Map(active.map(c=>[c.id,{recalls:Number(c.recall_count||0),actionable:actionable(c)}]));
 $('queue').replaceChildren(...daily.map(c=>card(c,firstByTeam)));if(!daily.length)$('queue').append(el('p','Nenhum chamado ativo no D-0.'));
 const carryBox=$('carryover');if(carryBox){carryBox.hidden=!carry.length;$('carryqueue').replaceChildren(...carry.map(c=>card(c,firstByTeam,true)));}
 $('history').replaceChildren(...history.map(c=>card(c)));if(!history.length)$('history').append(el('p','Nenhum chamado finalizado no D-0.'));
 $('metrics').replaceChildren(...[['Aguardando · D-0',w.length],['Em atendimento · D-0',daily.length-w.length],['Finalizados · D-0',history.length],['Removidos · D-0',history.reduce((s,c)=>s+(c.removed||0),0)]].map(([t,n])=>{const d=el('div',t,'metric');d.append(el('strong',n));return d;}));
 if($('daylabel'))$('daylabel').textContent='D-0 · '+day.split('-').reverse().join('/')+' · Brasília';
 tick();}
async function management(){const h=hub?.id;if(!h||!canManage())return;const [members,devices]=await Promise.all([rpc('spx_members',{p_hub:h}),rpc('spx_devices_list',{p_hub:h})]);if(hub?.id!==h)return;$('members').replaceChildren(...members.map(m=>{const d=el('div',null,'card');d.append(el('p',m.email+' · '+roleLabel(m.role)+' · '+teamLabel(m.team)),btn('Revogar acesso',async()=>{await rpc('spx_set_member_team',{p_hub:h,p_email:m.email,p_role:null,p_team:null});await refreshWorkspace(h);}));return d;}));$('devices').replaceChildren(...devices.map(v=>{const d=el('div',null,'card');d.append(el('p',(v.label||'Computador')+' · '+({active:'Autorizado',pending:'Pendente',revoked:'Revogado'}[v.state]||v.state)),el('strong','Código: '+(v.machine_code||'Aguardando registro')),el('small','Última leitura: '+new Date(v.last_seen).toLocaleString('pt-BR')));if(v.state==='active')d.append(btn('Revogar instalação',async()=>{if(!confirm('Revogar o computador '+(v.machine_code||v.label||'selecionado')+'?'))return;await rpc('spx_revoke_device',{p_hub:h,p_device:v.id});await management();}));return d;}));}
async function selectHub(id){const sub=++subEpoch;++epoch;hub=workspace.hubs.find(x=>x.id===id)||null;seen.clear();drafts.clear();pendingSound=false;$('queue').replaceChildren();if($('carryover')){$('carryover').hidden=true;$('carryqueue').replaceChildren();}$('history').replaceChildren();$('metrics').replaceChildren();$('members').replaceChildren();$('devices').replaceChildren();$('manage').hidden=!canManage();$('sound').hidden=!canWork();readSound();soundStatus();$('hubrole').textContent=hub?hub.code+(hub.station_id?' · Estação '+hub.station_id:'')+' · '+roleLabel(hub.role)+' · '+teamLabel(dualRole()?'both':hub.team):'Nenhum HUB autorizado. Solicite acesso ao supervisor.';$('connection').dataset.live='false';$('connection').textContent=hub?'Conectando ao HUB…':'Sem HUB selecionado';if(channel){await db.removeChannel(channel);channel=null;}if(sub!==subEpoch||!hub)return;localStorage.setItem('spxHub',hub.id);const h=hub.id;if(canWork())unlock();channel=db.channel('hub-'+h+'-'+sub).on('postgres_changes',{event:'*',schema:'public',table:'spx_calls',filter:'hub_id=eq.'+h},()=>{if(sub===subEpoch)load().catch(e=>msg(e.message));}).subscribe(s=>{if(sub===subEpoch){$('connection').dataset.live=String(s==='SUBSCRIBED');$('connection').textContent=s==='SUBSCRIBED'?'Conectado em tempo real · '+hub.code:'Conexão: '+s;if(s==='SUBSCRIBED')load().catch(e=>msg(e.message));}});await Promise.all([load(),management()]);}
async function refreshWorkspace(preferred){workspace=await rpc('spx_team_workspace');if(!workspace.email)throw Error('Acesso corporativo verificado obrigatório.');$('profile').textContent=workspace.email+' · '+roleLabel(workspace.global_role);$('newhub').hidden=!['developer','manager'].includes(workspace.global_role);$('global').hidden=workspace.global_role!=='developer';const s=$('hubselect');s.replaceChildren(...workspace.hubs.map(h=>{const o=el('option',h.code+' — '+h.name);o.value=h.id;return o;}));const chosen=workspace.hubs.find(h=>h.id===(preferred||localStorage.getItem('spxHub')))||workspace.hubs[0];if(chosen)s.value=chosen.id;await selectHub(chosen?.id);}
$('hubselect').onchange=()=>selectHub($('hubselect').value).catch(e=>msg(e.message));
form('hubform',async()=>{const id=await rpc('spx_create_hub_station',{p_code:$('hubcode').value,p_name:$('hubname').value,p_station:$('hubstation').value.trim()});$('hubform').reset();await refreshWorkspace(id);});
form('globalform',()=>rpc('spx_set_global_manager',{p_email:$('manageremail').value,p_enabled:true}));
$('globalrevoke').onclick=async()=>{try{await rpc('spx_set_global_manager',{p_email:$('manageremail').value,p_enabled:false});msg('Permissão global revogada. Acessos locais são independentes.');}catch(e){msg(e.message);}};
form('memberform',async()=>{const h=hub.id;await rpc('spx_set_member_team',{p_hub:h,p_email:$('memberemail').value,p_role:$('memberrole').value,p_team:$('memberteam').value||null});await management();$('memberform').reset();});
async function start(){const {data}=await db.auth.getUser();if(!data?.user)return;me=data.user;const w=await rpc('spx_team_workspace');if(!w.email){await db.auth.signOut();msg('Acesso corporativo verificado obrigatório.');return;}$('login').hidden=true;$('panel').hidden=false;$('operator').hidden=true;await refreshWorkspace();}
start().catch(e=>msg('Não foi possível iniciar o painel multi-HUB: '+e.message));setInterval(()=>load().catch(e=>msg(e.message)),30000);setInterval(tick,1000);

const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
$('reportstart').value=today;$('reportend').value=today;
function csvCell(value){let s=value==null?'':String(value);if(typeof value==='string'&&/^[\s\u0000-\u001f]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
function saveCSV(rows,name){const blob=new Blob(['\ufeff',rows.map(row=>row.map(csvCell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8;'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000);}
function secs(a,b){return a&&b?Math.max(0,Math.round((Date.parse(b)-Date.parse(a))/1000)):null;}
function time(t){return t?new Date(t).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'';}
async function exportReport(summary){const status=$('reportstatus'),buttons=$('reportform').querySelectorAll('button');buttons.forEach(b=>b.disabled=true);try{
 if(!hub)throw Error('Selecione um HUB.');
 const h=hub.id,code=hub.code,from=$('reportstart').value,to=$('reportend').value,shift=$('reportshift').value;
 if(!from||!to||from>to)throw Error('Período inválido.');
 const end=new Date(to+'T00:00:00-03:00');end.setUTCDate(end.getUTCDate()+1);
 let rows=[],cursor=0;const cutoff=new Date().toISOString();
 for(;;){let q=db.from('spx_calls').select(columns).eq('hub_id',h).eq('source','production').gte('created',from+'T00:00:00-03:00').lt('created',end.toISOString()).lte('created',cutoff).gt('seq',cursor).order('seq').limit(500);if(shift)q=q.eq('shift',shift);const r=await q;if(r.error)throw Error(r.error.message);if(!r.data.length)break;rows.push(...r.data);cursor=r.data.at(-1).seq;status.textContent='Coletando '+rows.length+' chamados…';}
 if(hub?.id!==h)throw Error('HUB alterado durante a exportação. Tente novamente.');
 const filename='SPX_'+code+'_'+from+'_'+to+(shift?'_'+shift:'');
 if(summary){const head=['HUB','Turno','Chamados','Aguardando','Em atendimento','Finalizados','Rechamadas','Pacotes removidos confirmados','Validações Fleet','Validações Inventário','Divergências abertas','Média espera (s)','Média resolução (s)','Média total (s)'];
 const calc=(label,rs)=>{const done=rs.filter(x=>x.status==='done'),avg=values=>{const v=values.filter(x=>x!=null);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):'';};return [code,label,rs.length,rs.filter(x=>x.status==='waiting').length,rs.filter(x=>x.status==='working').length,done.length,rs.reduce((s,x)=>s+(x.recall_count||0),0),done.reduce((s,x)=>s+(x.removed||0),0),rs.filter(x=>x.fleet_validated).length,rs.filter(x=>x.inventory_validated).length,rs.filter(x=>x.status!=='done'&&x.fleet_validated&&x.inventory_validated&&(x.fleet_removed!==x.inventory_removed||x.fleet_reason!==x.inventory_reason)).length,avg(rs.map(x=>secs(x.created,x.claimed))),avg(done.map(x=>secs(x.claimed,x.finished))),avg(done.map(x=>secs(x.created,x.finished)))];};
 saveCSV([head,calc(shift||'Todos',rows),...(!shift?['AM','PM'].map(s=>calc(s,rows.filter(x=>x.shift===s))):[])],filename+'_resumo.csv');
 }else{const head=['HUB','Chamado','Bancada','Turno','Destino inicial/atual','Status','Solicitado','Primeiro atendimento','Finalizado','Espera (s)','Resolução (s)','Tempo total (s)','Rechamadas','Última rechamada','Equipe da rechamada','Analista Fleet','Fleet assumiu','Fleet validou','Fleet quantidade','Fleet motivo','Fleet observações','Analista Inventário','Inventário assumiu','Inventário validou','Inventário quantidade','Inventário motivo','Inventário observações','Removidos confirmados','Motivo confirmado'];
 saveCSV([head,...rows.map(x=>[code,x.id,x.dock,x.shift,teamLabel(x.target_team),({waiting:'Aguardando',working:'Em atendimento',done:'Finalizado'}[x.status]),time(x.created),time(x.claimed),time(x.finished),secs(x.created,x.claimed),secs(x.claimed,x.finished),secs(x.created,x.finished),x.recall_count,time(x.last_recall),x.last_recall_team?teamLabel(x.last_recall_team):'',x.fleet_name,time(x.fleet_claimed),time(x.fleet_validated),x.fleet_removed,x.fleet_reason,x.fleet_notes,x.inventory_name,time(x.inventory_claimed),time(x.inventory_validated),x.inventory_removed,x.inventory_reason,x.inventory_notes,x.removed,x.reason])],filename+'_detalhado.csv');}
 status.textContent='Relatório gerado: '+rows.length+' chamados.';
 }catch(e){status.textContent=e.message;}finally{buttons.forEach(b=>b.disabled=false);}}
$('reportform').onsubmit=e=>{e.preventDefault();exportReport(false);};
$('summaryexport').onclick=()=>exportReport(true);

if($('machineform'))form('machineform',async()=>{if(!hub||!canManage())throw Error('Acesso restrito');const code=$('machinecode').value.trim();if(!/^\d{5}$/.test(code))throw Error('Informe o código de cinco dígitos.');if(!confirm('Confirme que o código '+code+' está visível em um computador autorizado do HUB '+hub.code+'.'))return;await rpc('spx_approve_machine',{p_hub:hub.id,p_code:code,p_label:$('machinename').value});$('machineform').reset();await management();});
if($('machinerefresh'))$('machinerefresh').onclick=()=>management().catch(e=>msg(e.message));
