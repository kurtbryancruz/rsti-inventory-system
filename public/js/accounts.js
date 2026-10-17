// Accounts (admin): create, manage (name, username, department, role), reset password, disable or enable.
// Look and feel follows the other pages: banner, summary tiles, toolbar, modern list.
Object.assign(I,{
 key:'<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2"/>',
 ban:'<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
 ucheck:'<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M16 11l2 2 4-4"/>',
 users:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8"/>'
});
let af='all',sf='all';   // department filter, role/status filter (tiles)
const ROLE_OPTS=sel=>Object.entries(ROLE).map(([k,v])=>`<option value="${k}" ${sel===k?'selected':''}>${v}</option>`).join('');
const ROLE_DESC={admin:'Adds and releases stock, approves pull-out requests, manages accounts.',basic:'Views the warehouse and sends pull-out requests.',view:'Views the dashboard and warehouse only.'};
const AC_COL=['#2660a2','#1d7a4b','#b26a00','#7a4fb0','#c2410c','#0f766e'];
const acCol=n=>AC_COL[[...String(n)].reduce((a,c)=>a+c.charCodeAt(0),0)%AC_COL.length];
const acIni=n=>(String(n).trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('')||'?').toUpperCase();
const avatar=u=>`<span class="av" style="background:${acCol(u.name)}" aria-hidden="true">${esc(acIni(u.name))}</span>`;

function accHead(){const U=db.users,off=U.filter(u=>!u.active).length;
 const H={create:['Create account','Add a person, set their department and role, and give them a temporary password.'],
  list:['All accounts',`${U.length} account${U.length===1?'':'s'}, ${U.length-off} active${off?`, ${off} disabled`:''}. Manage names, departments, roles and passwords.`]}[tab]||['Accounts',''];
 return `<section class="hero sm"><div class="hl"><p class="eyebrow">Accounts</p><h2>${H[0]}</h2><p class="sub">${H[1]}</p></div></section>`}

// ---------- list ----------
const accFilter=()=>db.users.filter(u=>(sf==='all'||(sf==='off'?!u.active:u.role===sf))&&(af==='all'||(af==='none'?!u.dept:u.dept===af))&&(!q||[u.name,u.user,ROLE[u.role],u.dept].join(' ').toLowerCase().includes(q.toLowerCase())));
function accRow(u){const self=u.id===me.id;
 return `<div class="acr${u.active?'':' off'}">${avatar(u)}
  <div class="acn"><b>${esc(u.name)}${self?'<span class="you">You</span>':''}</b><small>@${esc(u.user)}</small></div>
  <div class="acd">${u.dept?esc(u.dept):'<span class="mut">No department</span>'}</div>
  <div class="acrole"><span class="rl ${u.role}">${ROLE[u.role]}</span></div>
  <div class="acs">${u.active?tag('Active','ok'):tag('Disabled','bad')}${u.must_change?'<small class="chg">New password pending</small>':''}</div>
  <div class="aca"><button class="btn ghost sm ab" onclick="editUser(${u.id})" aria-label="Manage ${esc(u.name)}">${ic('edit')}Manage</button>${self?'':`<button class="btn ghost sm ab" onclick="resetPw(${u.id})" aria-label="Reset password for ${esc(u.name)}">${ic('key')}Reset password</button><button class="btn ghost sm ab ${u.active?'dng':'okb'}" onclick="${u.active?`disableUser(${u.id})`:`setActive(${u.id},true)`}" aria-label="${u.active?'Disable':'Enable'} ${esc(u.name)}">${ic(u.active?'ban':'ucheck')}${u.active?'Disable':'Enable'}</button>`}</div></div>`}
function accRows(){const L=accFilter();
 return L.map(accRow).join('')||`<div class="empty"><span class="tic">${ic('users')}</span><b>No accounts match</b><span>Try another department or clear the search.</span></div>`}
function accT(){const L=accFilter();$('#acl').innerHTML=accRows();$('#acn').textContent=`${L.length} shown`}
function setSf(k){sf=sf===k?'all':k;render()}
function accList(){const U=db.users,c=f=>U.filter(f).length,depts=[...new Set([...DEPTS,...U.map(u=>u.dept).filter(Boolean)])];
 const T=(k,n,l,cls='')=>`<div class="sf ${cls}${sf===k?' on':''}" role="button" tabindex="0" aria-pressed="${sf===k}" onclick="setSf('${k}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();setSf('${k}')}"><b>${n}</b><span>${l}</span></div>`;
 return `<div class="txsum">${T('all',U.length,'All accounts')}${T('admin',c(u=>u.role==='admin'),'Admins')}${T('basic',c(u=>u.role==='basic'),'Basic users','g')}${T('view',c(u=>u.role==='view'),'View-only','w')}${T('off',c(u=>!u.active),'Disabled','r')}</div>
 <div class="wtb card"><div class="wsr">${ic('search')}<input placeholder="Search name, username or department" value="${esc(q)}" oninput="q=this.value;accT()" aria-label="Search accounts"></div>
  <select onchange="af=this.value;accT()" aria-label="Filter by department"><option value="all">All departments</option>${depts.map(d=>`<option ${af===d?'selected':''}>${esc(d)}</option>`).join('')}<option value="none" ${af==='none'?'selected':''}>No department</option></select>
  <span class="mut" id="acn" style="font-size:13px">${accFilter().length} shown</span><button class="btn wtb-add" onclick="setTab('create')">${ic('plus')} Create account</button></div>
 <div class="card flush" style="padding:0;overflow:hidden"><div class="ach"><span></span><span>Account</span><span>Department</span><span>Role</span><span>Status</span><span class="aca">Manage</span></div><div id="acl">${accRows()}</div></div>`}

// ---------- create ----------
function accCreate(){
 const roles=Object.entries(ROLE).map(([k,v])=>`<label class="rpo"><input type="radio" name="a_rr" value="${k}" ${k==='basic'?'checked':''}><b>${v}</b><span>${ROLE_DESC[k]}</span></label>`).join('');
 return `<div class="txg"><div class="card txf">
  <div class="txs"><span class="txn">1</span><h3>Who is it for?</h3></div>
  <div class="fgrid"><div><label for="a_n">Full name</label><input id="a_n" placeholder="For example Maria Santos"></div><div><label for="a_u">Username</label><input id="a_u" autocomplete="off" placeholder="They sign in with this"></div><div class="full">${deptField('a')}</div></div>
  <div class="txs"><span class="txn">2</span><h3>What can they do?</h3></div>
  <div class="rpg" role="radiogroup" aria-label="Role">${roles}</div>
  <div class="txs"><span class="txn">3</span><h3>First sign-in</h3></div>
  <label for="a_p">Temporary password</label><div class="row" style="gap:8px"><input id="a_p" type="text" autocomplete="off" style="flex:1" placeholder="6 or more characters"><button class="btn ghost" type="button" onclick="genPw('a_p')">Generate</button></div>
  <label class="row chk"><input type="checkbox" id="a_f" checked> Ask them to choose their own password at first sign-in</label>
  <div class="txbar"><button class="btn" onclick="mkUser()">Create account</button></div></div>
  <aside class="card txi"><div class="ph"><h3>Good to know</h3></div>
   <div class="txty"><i style="background:#2660a2"></i><div><b>Department</b><span>Optional. Pick one from the list, or choose Other to type a new one. You can change it later.</span></div></div>
   <div class="txty"><i style="background:#1d7a4b"></i><div><b>Temporary password</b><span>Tell the person in person. It is not shown again. You can reset it any time from the list.</span></div></div>
   <div class="txty"><i style="background:#b26a00"></i><div><b>Admin role</b><span>Admins can approve requests and manage accounts. Give it only to people who need it.</span></div></div></aside></div>`}

function acc(){return accHead()+(tab==='create'?accCreate():accList())}

// ---------- actions ----------
// a random password that is easy to read out loud (no 0/O or 1/l/I)
function genPw(id){const c='abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789',a=new Uint32Array(10);crypto.getRandomValues(a);$('#'+id).value=[...a].map(n=>c[n%c.length]).join('')}
const mhd=(u,title,sub)=>`<div class="mhd">${avatar(u)}<div><h2>${title}</h2><small>${sub}</small></div></div>`;
async function mkUser(){const rr=document.querySelector('input[name=a_rr]:checked'),b={name:$('#a_n').value.trim(),user:$('#a_u').value.trim(),dept:deptVal('a'),pw:$('#a_p').value,role:rr?rr.value:'basic',force:$('#a_f').checked};
 if(await api('/api/users','POST',b)){await load();toast('Account created.');sf='all';af='all';q='';setTab('list')}}
function editUser(id){const u=db.users.find(x=>x.id===id),self=id===me.id;
 modal(`${mhd(u,'Manage account','@'+esc(u.user))}<label for="e_n">Full name</label><input id="e_n" value="${esc(u.name)}"><label for="e_u">Username</label><input id="e_u" value="${esc(u.user)}" autocomplete="off">${deptField('e',u.dept)}<label for="e_r">Role</label><select id="e_r" ${self?'disabled':''}>${ROLE_OPTS(u.role)}</select>${self?'<p class="mut" style="margin:6px 0 0;font-size:13px">You cannot change your own role.</p>':''}
 <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost" onclick="closeM()">Cancel</button><button class="btn" onclick="saveUser(${id})">Save changes</button></div>`)}
async function saveUser(id){const b={name:$('#e_n').value.trim(),user:$('#e_u').value.trim(),dept:deptVal('e')};if(!$('#e_r').disabled)b.role=$('#e_r').value;
 if(await api('/api/users/'+id,'PUT',b)){closeM();await load();toast('Account updated.');render()}}
function resetPw(id){const u=db.users.find(x=>x.id===id);
 modal(`${mhd(u,'Reset password','@'+esc(u.user))}<p class="mut" style="margin:10px 0 0">Set a new password for <b>${esc(u.name)}</b> and tell them in person. It is not shown again, and they will be signed out everywhere.</p><label for="rp">New password (6+ characters)</label><div class="row" style="gap:8px"><input id="rp" type="text" autocomplete="off" style="flex:1"><button class="btn ghost" type="button" onclick="genPw('rp')">Generate</button></div>
 <label class="row chk"><input type="checkbox" id="rp_f" checked> Ask them to choose their own password at next sign-in</label>
 <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost" onclick="closeM()">Cancel</button><button class="btn" onclick="doReset(${id})">Reset password</button></div>`);setTimeout(()=>genPw('rp'),0)}
async function doReset(id){if(await api('/api/users/'+id+'/reset-password','POST',{pw:$('#rp').value,force:$('#rp_f').checked})){closeM();await load();toast('Password reset.');render()}}
function disableUser(id){const u=db.users.find(x=>x.id===id);
 modal(`${mhd(u,'Disable account?','@'+esc(u.user))}<p class="mut" style="margin:10px 0 0"><b>${esc(u.name)}</b> will be signed out and cannot sign in until you enable the account again. Their history and signature stay in the system.</p><div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost" onclick="closeM()">Cancel</button><button class="btn bad" onclick="setActive(${id},false)">Disable account</button></div>`)}
async function setActive(id,on){if(await api('/api/users/'+id+'/active','PUT',{active:on})){closeM();await load();toast(on?'Account enabled.':'Account disabled.');render()}}
PAGES.acc=acc;
