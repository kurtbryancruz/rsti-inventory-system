// Profile / User settings: your details and password, and your e-signature.
// Look and feel follows the other pages: banner, numbered form card, info side card, drag-and-drop upload.
Object.assign(I,{up:'<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'});
const PF_COL=['#2660a2','#1d7a4b','#b26a00','#7a4fb0','#c2410c','#0f766e'];
const pfCol=n=>PF_COL[[...String(n)].reduce((a,c)=>a+c.charCodeAt(0),0)%PF_COL.length];
const pfIni=n=>(String(n).trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('')||'?').toUpperCase();
const PF_ROLE={admin:'Adds and releases stock, approves pull-out requests and manages accounts.',basic:'Views the warehouse and sends pull-out requests.',view:'Views the dashboard and warehouse only.'};

function pfHead(){const sig=tab==='sig',
 H=sig?['E-signature','Upload an image of your signature. It is printed on the pull-out PDFs you request or approve.']:['Your profile','Update your name and choose a new password whenever you like.'];
 return `<section class="hero sm"><span class="pfav" style="background:${pfCol(me.name)}" aria-hidden="true">${esc(pfIni(me.name))}</span><div class="hl"><p class="eyebrow">${esc(me.name)}</p><h2>${H[0]}</h2><p class="sub">${H[1]}</p>
  <div class="chips"><span class="hchip"><i></i>${ROLE[me.role]}</span><span class="hchip"><i class="a"></i>${esc(me.dept)||'No department'}</span><span class="hchip"><i class="${me.sig?'':'r'}"></i>${me.sig?'Signature uploaded':'No signature yet'}</span></div></div></section>`}

// ---------- profile tab ----------
function pfMain(){
 return `<div class="txg"><div class="card txf">
  <div class="txs"><span class="txn">1</span><h3>Your details</h3></div>
  <label for="pf_n">Full name</label><input id="pf_n" value="${esc(me.name)}" autocomplete="name" onkeydown="if(event.key==='Enter')saveProf()">
  <div class="txs"><span class="txn">2</span><h3>Password</h3></div>
  <p class="mut" style="margin:0 0 4px;font-size:13.5px">Leave these blank to keep your current password.</p>
  <label for="pf_p">New password (6+ characters)</label>
  <div class="row" style="gap:8px"><input id="pf_p" type="password" autocomplete="new-password" oninput="pfMeter()" style="flex:1"><button class="btn ghost" type="button" id="pf_s" onclick="pfShow()" aria-pressed="false">Show</button></div>
  <div class="pwm" aria-hidden="true"><i id="pf_b"></i></div><small class="mut" id="pf_m" style="display:block;min-height:18px"></small>
  <label for="pf_c">Type it again</label><input id="pf_c" type="password" autocomplete="new-password" onkeydown="if(event.key==='Enter')saveProf()">
  <div class="txbar"><button class="btn" onclick="saveProf()">Save changes</button></div></div>
  <aside class="card txi"><div class="ph"><h3>Account</h3></div>
   <div class="pfr"><span>Username</span><b>@${esc(me.user)}</b></div>
   <div class="pfr"><span>Role</span><b><span class="rl ${me.role}">${ROLE[me.role]}</span></b></div>
   <div class="pfr"><span>Department</span><b>${esc(me.dept)||'<span class="mut" style="font-weight:400">Not set</span>'}</b></div>
   <p class="mut" style="margin:14px 0 0;font-size:13.5px">${PF_ROLE[me.role]}</p>
   <p class="mut" style="margin:10px 0 0;font-size:13px">Your username, role and department are set by an admin.</p></aside></div>`}

function pfMeter(){const v=$('#pf_p').value,b=$('#pf_b'),m=$('#pf_m');
 let s=0;if(v.length>=6)s++;if(v.length>=10)s++;if(/[a-z]/.test(v)&&/[A-Z]/.test(v))s++;if(/\d/.test(v)&&/[^A-Za-z0-9]/.test(v))s++;
 if(!v){b.style.width='0';m.textContent='';return}
 b.style.width=(v.length<6?10:25*Math.max(1,s))+'%';b.style.background=v.length<6||s<=1?'var(--bad)':s===2?'#e0a030':'var(--ok)';
 m.textContent=v.length<6?'Too short: use at least 6 characters.':s<=1?'Weak. A longer password is safer.':s===2?'Fair.':'Strong.'}
function pfShow(){const p=$('#pf_p'),c=$('#pf_c'),on=p.type==='password';p.type=c.type=on?'text':'password';$('#pf_s').textContent=on?'Hide':'Show';$('#pf_s').setAttribute('aria-pressed',on)}
async function saveProf(){const n=$('#pf_n').value.trim(),p=$('#pf_p').value;
 if(!n)return toast('Enter your name.');
 if(p&&p!==$('#pf_c').value)return toast('The two passwords do not match.');
 const b={name:n};if(p)b.pw=p;
 if(await api('/api/me','PUT',b)){await load();toast(p?'Profile and password saved.':'Profile saved.');render()}}

// ---------- e-signature tab ----------
function pfSig(){
 const prev=me.sig?`<div class="sigp"><img src="${me.sig}" alt="Your signature"><div class="sigl"><span>${esc(me.name)}</span></div></div>`
  :`<div class="sigp none"><span class="mut">No signature uploaded yet.</span></div>`;
 return `<div class="txg"><div class="card txf">
  <div class="txs"><span class="txn">1</span><h3>${me.sig?'Your signature':'Preview'}</h3></div>${prev}
  <div class="txs"><span class="txn">2</span><h3>${me.sig?'Replace it':'Upload it'}</h3></div>
  <label class="dz" id="dz" ondragover="event.preventDefault();this.classList.add('over')" ondragleave="this.classList.remove('over')" ondrop="event.preventDefault();this.classList.remove('over');sigFile(event.dataTransfer.files[0])">
   <span class="tic">${ic('up')}</span><b>Drop an image here, or click to choose</b><span class="mut">PNG or JPG, under 500 KB</span>
   <input type="file" accept="image/png,image/jpeg" onchange="upSig(this)" aria-label="Choose a signature image"></label>
  <p class="mut" style="font-size:13px;margin:10px 0 0">Tip: sign in dark ink on white paper, take a straight photo, and crop close to the signature.</p></div>
  <aside class="card txi"><div class="ph"><h3>Where it is used</h3></div>
   <div class="txty"><i style="background:#2660a2"></i><div><b>Requested by</b><span>Printed above your name on the pull-out PDF when you made the request.</span></div></div>
   <div class="txty"><i style="background:#1d7a4b"></i><div><b>Approved by</b><span>Printed above your name when you approve or release stock as an admin.</span></div></div>
   <div class="txty"><i style="background:#b26a00"></i><div><b>No signature</b><span>Nothing is printed there. Upload a new image any time to replace this one.</span></div></div></aside></div>`}

function sigFile(f){if(!f)return;if(!/^image\/(png|jpeg)$/.test(f.type))return toast('Use a PNG or JPG image.');if(f.size>500000)return toast('Image must be under 500 KB.');
 const r=new FileReader();r.onload=async()=>{if(await api('/api/me','PUT',{sig:r.result})){await load();toast('Signature uploaded.');render()}};r.readAsDataURL(f)}
const upSig=el=>{sigFile(el.files[0]);el.value=''};

function prof(){return pfHead()+(tab==='sig'?pfSig():pfMain())}
PAGES.me=prof;
