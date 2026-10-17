const K='rsti_inv_v1',day=864e5,now=()=>Date.now();
const d0=n=>new Date(now()+n*day).toISOString().slice(0,10);
let db={users:[],products:[],log:[],req:[]},me=null,PAGE='',tab='all',q='';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const I={bell:'<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',dash:'<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',wh:'<path d="M3 9l9-6 9 6v11H3z"/><path d="M8 20v-7h8v7"/>',tx:'<path d="M7 4L3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7"/>',his:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',acc:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M17 4.5a3.5 3.5 0 010 7M18 14c2.2.5 3.5 2.4 3.5 6"/>',me:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>',out:'<path d="M9 4H4v16h5M16 8l4 4-4 4M20 12H9"/>',plus:'<path d="M12 5v14M5 12h14"/>',shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',rcpt:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 015 1c0 1.7-2.5 2.2-2.5 3.7M12 17.5h.01"/>'};
const ic=n=>`<svg class="i" viewBox="0 0 24 24">${I[n]}</svg>`;
I.dl='<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>';
I.cal='<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>';
// ---- CSV export, shared by the Warehouse, Reorder, History and Dashboard report ----
// A cell that starts with = + @ or a tab could run as a formula when opened in Excel, so it gets a leading apostrophe. Numbers stay numbers.
const csvCell=v=>{if(v==null)return '';if(typeof v==='number')return Number.isFinite(v)?String(v):'';let s=String(v);if(/^[=+@\t\r]/.test(s)||/^-(?!\d)/.test(s))s="'"+s;return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
const csvDate=t=>t?new Date(t-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,16).replace('T',' '):'';
function downloadCsv(name,rows){const csv=rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
 a.href=url;a.download=name+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}
const NAV={admin:[['dash','Dashboard'],['cal','Calendar'],['wh','Warehouse'],['tx','Transaction'],['his','History'],['acc','Accounts'],['me','Profile'],['help','Help']],
basic:[['dash','Dashboard'],['cal','Calendar'],['wh','Warehouse'],['tx','Transaction'],['me','User settings'],['help','Help']],
view:[['dash','Dashboard'],['cal','Calendar'],['wh','Warehouse'],['me','User settings'],['help','Help']]};
const ROLE={admin:'Admin',basic:'Basic user',view:'View-only'};
const fmt=n=>Number(n).toLocaleString();
const WH=['Warehouse 1','Warehouse 2'],COMPANY='Roentgen Separation Technologie Inc.';
const peso=n=>n==null||n===''?'-':'\u20b1'+Number(n).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2});
const dleft=e=>e?Math.ceil((new Date(e)-new Date(d0(0)))/day):null;
const hold=p=>{const d=dleft(p.exp);return d!==null&&d<0&&!p.exc};
const status=p=>{const d=dleft(p.exp);if(d!==null&&d<0)return p.exc?['Expired \u00b7 exception','warn']:['On hold \u00b7 expired','bad'];if(d!==null&&d<=45)return[`Expires in ${d}d`,'warn'];if(p.qty<=p.min)return['Low stock','warn'];return['In stock','ok']};
// ---- reorder points (admin only data) ----
// Reorder point = average daily usage x (lead time + safety days). A typed-in alert level overrides it.
const COVER_DAYS=30,MIN_USES=3;
function reorderInfo(p){
 const lead=p.lead==null?null:+p.lead,safe=+p.safety||0,use=+p.use_day||0,n=p.use_n||0,enough=n>=MIN_USES;
 const calc=lead!=null&&enough?use*(lead+safe):null,manual=p.min>0?+p.min:null,point=manual!=null?manual:calc;
 const st=point!=null?(p.qty<=point?'now':'ok'):(lead==null?'lead':'data');
 return{lead,safe,use,n,enough,calc,manual,point,basis:manual!=null?'Manual':calc!=null?'Calculated':'',
  daysLeft:enough&&use>0?p.qty/use:null,st,
  // order enough to get back above the reorder point plus COVER_DAYS of usage
  order:st==='now'&&enough&&use>0?Math.max(0,Math.ceil(point+use*COVER_DAYS-p.qty)):null}}
const RO_ST={now:['Reorder now','bad'],ok:['OK','ok'],lead:['Set lead time','warn'],data:['Not enough data','n']};
const typeOf=p=>['Chemical','Equipment'].includes(p.item_type)?p.item_type:'Others';
// ---- departments (a user's department is set by an admin; "Other..." lets you type a new one) ----
const DEPTS=['Operations Department','Sales Department','Finance Department','Engineering Department'];
const deptField=(p,cur='')=>{const std=!cur||DEPTS.includes(cur);return `<label for="${p}_d">Department</label><select id="${p}_d" onchange="deptSel('${p}')"><option value="">No department</option>${DEPTS.map(d=>`<option ${cur===d?'selected':''}>${d}</option>`).join('')}<option value="other" ${std?'':'selected'}>Other...</option></select><input id="${p}_d2" placeholder="Type the department" value="${std?'':esc(cur)}" ${std?'hidden':''} style="margin-top:8px" aria-label="Department name">`};
const deptSel=p=>{const o=$('#'+p+'_d').value==='other';$('#'+p+'_d2').hidden=!o;if(o)$('#'+p+'_d2').focus()};
const deptVal=p=>{const v=$('#'+p+'_d').value;return v==='other'?$('#'+p+'_d2').value.trim():v};
// After an admin resets a password the user must choose their own before using the system.
function forcePw(){if($('#fp'))return;const m=document.createElement('div');m.className='modal';m.id='fp';
 m.innerHTML=`<div class="card"><h2>Choose a new password</h2><p class="mut" style="margin:6px 0 0">An admin set a temporary password for your account. Choose your own password to continue.</p><label for="fp_a">New password (6+ characters)</label><input id="fp_a" type="password" autocomplete="new-password"><label for="fp_b">Type it again</label><input id="fp_b" type="password" autocomplete="new-password" onkeydown="if(event.key==='Enter')savePw()"><div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost" onclick="logout()">Sign out</button><button class="btn" onclick="savePw()">Save password</button></div></div>`;
 document.body.append(m);setTimeout(()=>$('#fp_a').focus(),50)}
async function savePw(){const a=$('#fp_a').value;if(a.length<6)return toast('Password needs 6+ characters.');if(a!==$('#fp_b').value)return toast('The two passwords do not match.');
 if(await api('/api/me','PUT',{pw:a})){$('#fp').remove();me.must_change=false;toast('Password saved.')}}
const tag=(t,c)=>`<span class="tag t-${c}">${esc(t)}</span>`;
function toast(m){const t=document.createElement('div');t.className='toast';t.textContent=m;document.body.append(t);setTimeout(()=>t.remove(),2400)}
function modal(html,cls=''){closeM();const m=document.createElement('div');m.className='modal '+cls;m.id='m';m.innerHTML=`<div class="card">${html}</div>`;document.body.append(m)}
const closeM=()=>{const m=$('#m');if(m)m.remove()};
async function api(url,method='GET',body){
 const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const j=await r.json().catch(()=>({}));
 if(r.status===401){location.href='login.html';return null}
 if(!r.ok){toast(j.error||'Something went wrong.');return null}
 if(method!=='GET'&&me&&me.role!=='view'&&typeof noteLoad==='function')noteLoad();   // a saved action shows up in the bell right away
 return j}
async function load(){const r=await fetch('/api/state');if(!r.ok)return false;const s=await r.json();me=s.me;db={users:s.users||[],products:s.products,log:s.log,req:s.requests,top:s.top||[],rel:s.rel||[]};return true}
const FILES={dash:'dashboard.html',wh:'warehouse.html',tx:'transaction.html',cal:'calendar.html',his:'history.html',acc:'accounts.html',me:'profile.html',help:'help.html'};
const PAGES={};
const TABS={
 dash:()=>[],
 wh:()=>[['all','All products'],['low','Low stock'],['exp','Expiring'],...(me.role==='admin'?[['reorder','Reorder']]:[])],
 tx:()=>[['form',me.role==='admin'?'Transaction form':'Request form'],['mine','Your Transaction'],...(me.role==='admin'?[['req','Transaction requests']]:[]),['done','Approved transactions']],
 cal:()=>[['month','Month'],['list','Upcoming']],
 his:()=>[['all','All activity'],['out','Releases'],['in','Pull-ins'],['mod','Other changes']],
 acc:()=>[['create','Create account'],['list','All accounts']],
 me:()=>[['profile','Profile'],['sig','E-signature']],
 help:()=>[['start','Quick start'],['guides','How-to guides'],['faq','FAQ']]
};
const setTab=id=>{tab=id;q='';history.replaceState(null,'','#'+id);render()};
const logout=async()=>{await fetch('/api/logout',{method:'POST'});location.href='login.html'};
function render(){
 const nav=NAV[me.role];
 const titles={dash:'Dashboard',wh:'Warehouse',tx:'Transaction',cal:'Calendar',his:'History',acc:'Accounts',me:me.role==='admin'?'Profile':'User settings',help:'Help'};
 const rail=`<nav class="rail" aria-label="Main"><div class="logo"><img src="img/favicon-192.png" alt="RSTI" width="34" height="34"></div>${nav.map(([k,l])=>`<button class="${k===PAGE?'on':''}" onclick="location.href='${FILES[k]}'" aria-label="${l}">${ic(k)}<span>${l}</span></button>`).join('')}<button onclick="logout()" aria-label="Sign out">${ic('out')}<span>Sign out</span></button></nav>`;
 document.title=titles[PAGE]+' · RSTI Inventory';
 const T=TABS[PAGE]();
 $('#app').innerHTML=`${rail}<main><header class="topbar"><h1>${titles[PAGE]}</h1>${T.length?`<div class="topnav" role="tablist" aria-label="${titles[PAGE]} sections">${T.map(([k,l])=>`<button role="tab" aria-selected="${k===tab}" class="${k===tab?'on':''}" onclick="setTab('${k}')">${l}</button>`).join('')}</div>`:''}<div class="gsearch" role="search">${ic('search')}<input id="gs" type="search" placeholder="${me.role==='admin'?'Search stock, users, history':'Search stock'}" oninput="gsearch(this.value)" onfocus="gsearch(this.value)" onkeydown="if(event.key==='Escape'){this.value='';gsearch('')}" autocomplete="off" aria-label="Search the system"><div id="gs_res" hidden></div></div><div class="bellw"><button class="bell" id="bell" onclick="toggleNotes(event)" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">${ic('bell')}<span id="bell_n" class="bn" hidden></span></button><div id="notes" class="notes" hidden></div></div><div class="who">${esc(me.name)} <span class="pill">${ROLE[me.role]}</span></div></header><div id="pg"></div></main>`;
 $('#pg').innerHTML=PAGES[PAGE]();
 noteBadge();if(me.role!=='view'&&(!NOTE.loaded||now()-NOTE.loaded>20000))noteLoad();
 fitTabs();
 if(window.afterRender)afterRender();
}
// when the tabs do not fit next to the title and search box, they move to their own row instead of being cut off
function fitTabs(){const b=$('.topbar'),n=$('.topnav');if(!b||!n)return;b.classList.remove('two');if(n.scrollWidth>n.clientWidth+1)b.classList.add('two')}
let _ft=0;addEventListener('resize',()=>{cancelAnimationFrame(_ft);_ft=requestAnimationFrame(fitTabs)});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>fitTabs());
async function boot(key){PAGE=key;
 if(!await load()){try{if(/^\?inventory=[A-Za-z0-9-]+$/.test(location.search))sessionStorage.setItem('rsti_next',location.pathname+location.search)}catch(e){}location.href='login.html';return}
 if(!NAV[me.role].some(n=>n[0]===key)){location.href='dashboard.html';return}
 const T=TABS[key](),h=location.hash.slice(1);tab=T.some(t=>t[0]===h)?h:(T[0]?T[0][0]:'');q=sessionStorage.getItem('rsti_q')||'';sessionStorage.removeItem('rsti_q');
 render();if(me.must_change)forcePw();if(typeof afterBoot==='function')afterBoot()}

// ---- search across the whole system (stock, users, requests, history) ----
let _gs=[];
function gsearch(v){const box=$('#gs_res');if(!box)return;const t=v.trim(),l=t.toLowerCase();
 if(l.length<2){box.hidden=true;box.innerHTML='';return}
 const has=(...a)=>a.join(' ').toLowerCase().includes(l),out=[];
 db.products.filter(p=>has(p.name,p.sku,p.code,p.item_type,p.description,p.warehouse,p.rack,p.floor,p.supplier,p.batch)).slice(0,6).forEach(p=>out.push({g:'Stock',t:p.name,s:`${p.sku?p.sku+' · ':''}${p.warehouse} · ${p.item_type} · ${fmt(p.qty)} ${p.unit}`,page:'warehouse.html#all',q:p.name}));
 if(me.role==='admin'){
  db.users.filter(u=>has(u.name,u.user,ROLE[u.role],u.dept)).slice(0,5).forEach(u=>out.push({g:'Users',t:u.name,s:`${u.user} · ${ROLE[u.role]}${u.dept?' · '+u.dept:''}`,page:'accounts.html#list',q:u.user}));
  db.log.filter(x=>has(x.by,x.action,x.detail)).slice(0,4).forEach(x=>out.push({g:'History',t:x.action,s:`${x.by} · ${x.detail}`.slice(0,90),page:'history.html#all',q:t}));
 }
 db.req.filter(r=>(me.role!=='admin'||r.st!=='rejected')&&has(r.type,r.by,r.c,r.n,r.items.map(i=>i.n).join(' '))).slice(0,4).forEach(r=>out.push({g:'Requests',t:`${r.type}: ${r.items.map(i=>i.n).join(', ')}`,s:`${r.by} · ${r.st}`,page:'transaction.html#'+(me.role!=='admin'?'mine':r.st==='approved'?'done':'req'),q:''}));
 _gs=out;box.hidden=false;let g='';
 box.innerHTML=out.length?out.map((r,i)=>(r.g!==g?(g=r.g,`<div class="gh">${g}</div>`):'')+`<button onclick="pickGs(${i})"><b>${esc(r.t)}</b><br><span class="mut" style="font-size:12.5px">${esc(r.s)}</span></button>`).join(''):'<p class="mut" style="padding:10px;margin:0">No matches.</p>'}
function pickGs(i){const r=_gs[i],[f,h]=r.page.split('#');
 if(location.pathname.endsWith('/'+f)){q=r.q||'';tab=h||tab;history.replaceState(null,'','#'+tab);render()}
 else{sessionStorage.setItem('rsti_q',r.q||'');location.href=r.page}}
document.addEventListener('click',e=>{const b=$('#gs_res');if(b&&!e.target.closest('.gsearch'))b.hidden=true});
const qChip=()=>q?`<div class="row" style="margin-bottom:10px"><span class="pill">Showing results for “${esc(q)}” <button class="x" onclick="q='';render()" aria-label="Clear filter">✕</button></span></div>`:'';

// ---- notification bell: the button is on every page for every role; what it lists depends on the role ----
// admin: everything happening in the system. basic: their requests approved or declined. view-only: nothing.
let NOTE={items:[],unread:0,seen:0,prevSeen:0,loaded:0},_noteTimer=0;
const ago=t=>{const s=Math.max(0,(now()-t)/1e3);return s<60?'just now':s<3600?Math.floor(s/60)+' min ago':s<86400?Math.floor(s/3600)+' h ago':s<604800?Math.floor(s/86400)+' d ago':new Date(t).toLocaleDateString()};
function noteBadge(){const b=$('#bell_n');if(!b)return;b.hidden=!NOTE.unread;b.textContent=NOTE.unread>99?'99+':NOTE.unread;$('#bell').setAttribute('aria-label','Notifications'+(NOTE.unread?', '+NOTE.unread+' new':''))}
async function noteLoad(){if(me.role==='view')return;const r=await fetch('/api/notifications');if(!r.ok)return;NOTE={...NOTE,...(await r.json()),loaded:now()};noteBadge()}
function noteDraw(){const box=$('#notes');if(!box)return;
 const empty={admin:'No activity yet.',basic:'You will be notified here when your pull-out requests are approved or declined.',view:'Your account type does not receive notifications.'}[me.role];
 box.innerHTML=`<div class="nh">Notifications</div>`+(NOTE.items.length?NOTE.items.map(i=>`<a class="nit${i.t>NOTE.prevSeen?' new':''}" href="${esc(i.link)}"><span class="row sp" style="align-items:flex-start"><b><i class="dot ${esc(i.kind&&i.kind!=='n'?i.kind:'')}"></i>${esc(i.text)}</b><span class="mut" style="font-size:12px;white-space:nowrap">${ago(i.t)}</span></span><span class="mut" style="font-size:12.5px;display:block;margin:2px 0 0 17px">${esc(String(i.sub||'').slice(0,140))}</span></a>`).join(''):`<p class="mut" style="padding:14px 16px;margin:0">${empty}</p>`)}
async function toggleNotes(e){e.stopPropagation();const box=$('#notes'),btn=$('#bell');
 if(!box.hidden){box.hidden=true;btn.setAttribute('aria-expanded','false');return}
 await noteLoad();NOTE.prevSeen=NOTE.seen;noteDraw();box.hidden=false;btn.setAttribute('aria-expanded','true');
 if(me.role!=='view'&&NOTE.unread){NOTE.unread=0;noteBadge();fetch('/api/notifications/seen',{method:'POST'})}}
document.addEventListener('click',e=>{const box=$('#notes');if(box&&!box.hidden&&!box.contains(e.target)){box.hidden=true;$('#bell').setAttribute('aria-expanded','false')}});
document.addEventListener('keydown',e=>{const box=$('#notes');if(e.key==='Escape'&&box&&!box.hidden){box.hidden=true;$('#bell').setAttribute('aria-expanded','false');$('#bell').focus()}});
if(!_noteTimer)_noteTimer=setInterval(()=>{const box=$('#notes');if(document.visibilityState==='visible'&&box&&box.hidden&&me&&me.role!=='view')noteLoad()},45000);
