Object.assign(I,{scan:'<path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M4 12h16"/>',check:'<path d="M20 6L9 17l-5-5"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'});   // icons this page uses that only the dashboard defined
let lines=[{p:'',q:'',into:''}];
const txs={t:'Trading',c:'',n:'',target:''};   // what has been typed so far, kept when the page redraws
const TCOL={Trading:'#2660a2',Repacking:'#1d7a4b',Blending:'#b26a00',Others:'#7a8aa0'};
const itemLine=i=>`${fmt(i.q)} ${esc(i.u)} ${esc(i.n)}${i.into?` → ${esc(i.into)}`:''}`;
const txEmpty=(icon,t,s)=>`<div class="empty"><span class="tic">${ic(icon)}</span><b>${t}</b><span>${s}</span></div>`;
function reqRows(list,adm){return list.map(r=>`<div class="txr"><span class="txr-ic" style="--c:${TCOL[r.type]||TCOL.Others}">${ic('tx')}</span><div class="txr-b"><div class="txr-t"><b>${esc(r.type)}</b></div><ul class="txr-i">${r.items.map(i=>`<li>${itemLine(i)}</li>`).join('')}</ul>${r.target?`<div class="mut txr-m">Blended into: <b>${esc(r.target)}</b></div>`:''}<div class="mut txr-m">${esc(r.by)}${r.c?' · '+esc(r.c):''}</div></div><div class="txr-a">${r.st==='pending'?(adm?`<button class="btn sm" onclick="decide(${r.id},1)">Approve</button> <button class="btn sm bad" onclick="decide(${r.id},0)">Reject</button>`:tag('Pending','warn')):tag(r.st==='approved'?'Approved':'Rejected',r.st==='approved'?'ok':'bad')}${r.st==='approved'&&r.rid?` <button class="btn ghost sm" onclick="receipt(${r.rid})">${ic('rcpt')} PDF</button>`:''}</div></div>`).join('')}
// page banner: same look as the dashboard hero, text changes with the tab
function txHead(adm){const n=db.req.filter(r=>r.st==='pending').length;
 const H={form:[adm?'Release stock':'Request stock pull-out',adm?'Choose what goes out and release it right away. A PDF is made for you.':'Pick the items you need. An admin reviews your request before the stock is released.'],
  mine:['Your transactions','Everything you requested or released, with its status and PDF.'],
  req:['Transaction requests',n?`${n} request${n===1?'':'s'} waiting for your decision.`:'No requests waiting right now.'],
  done:[adm?'Approved transactions':'My approved transactions','Released stock and the PDF for each one.']}[tab]||['Transaction',''];
 return `<section class="hero sm"><div class="hl"><p class="eyebrow">Transaction</p><h2>${H[0]}</h2><p class="sub">${H[1]}</p></div></section>`}
function tx(){return txHead(me.role==='admin')+`<div class="txbody">${txBody()}</div>`}
function txBody(){
 const adm=me.role==='admin';
 if(tab==='req'){const L=db.req.filter(r=>adm?r.st==='pending':true);
  return `<div class="card"><div class="ph"><h3>${adm?'Pull-out requests waiting for approval':'My requests'}</h3></div><div class="txl">${reqRows(L,adm)||txEmpty('check',adm?'No requests waiting.':'You have not sent any requests yet.','New requests show up here.')}</div></div>`}
 if(tab==='mine')return mineView();
 if(tab==='done'){
  if(adm){const L=db.log.filter(x=>x.out);return `<div class="card flush"><div class="ph txph"><h3>Approved and released transactions</h3></div><div class="scroll"><table class="txtab"><thead><tr><th>When</th><th>Type</th><th>Released by</th><th>Details</th><th>PDF</th></tr></thead><tbody>${L.map(x=>`<tr><td style="white-space:nowrap">${new Date(x.t).toLocaleString()}</td><td>${tag(x.type,'n')}</td><td>${esc(x.by)}</td><td>${esc(x.detail)}</td><td>${x.rid?`<button class="btn ghost sm" onclick="receipt(${x.rid})">${ic('rcpt')} PDF</button>`:'-'}</td></tr>`).join('')||`<tr><td colspan="5">${txEmpty('rcpt','Nothing released yet.','Released transactions are listed here.')}</td></tr>`}</tbody></table></div></div>`}
  const L=db.req.filter(r=>r.st==='approved');return `<div class="card"><div class="ph"><h3>My approved transactions</h3></div><div class="txl">${reqRows(L,false)||txEmpty('rcpt','No approved requests yet.','Approved requests appear here with their PDF.')}</div></div>`}
 return `<div class="txg"><div class="card txf">
 <div class="txs"><span class="txn">1</span><h3>Details</h3></div>
 <div class="fgrid">
 <div><label for="tx_t">Transaction type</label><select id="tx_t" onchange="typeHint(true)"><option>Trading</option><option>Repacking</option><option>Blending</option><option>Others</option></select></div>
 <div><label for="tx_c">Client or reference</label><input id="tx_c" oninput="txs.c=this.value" placeholder="Client name, PO or job number"></div>
 <p class="mut txhint full" id="tx_h"></p>
 <div class="full" id="tx_tg"></div>
 <div class="full"><label id="tx_nl" for="tx_n">Notes</label><input id="tx_n" oninput="txs.n=this.value" placeholder="Optional"></div></div>
 <div class="txs"><span class="txn">2</span><label id="tx_il">Items</label></div>
 <div class="scanbar"><button type="button" class="btn" onclick="openScan()">${ic('scan')} Scan QR code</button><input id="tx_scan" autocomplete="off" inputmode="none" placeholder="Or click here and scan with a handheld scanner, or paste an item link or code" aria-label="Scan or paste an item link or inventory code" onkeydown="scanKey(event)"></div>
 <div id="lines"></div><button class="btn ghost sm txadd" id="tx_add" onclick="lines.push({p:'',q:'',into:''});drawLines(lines.length-1)">Add item</button>
 <div class="txbar"><button class="btn" onclick="submitTx()">${adm?'Release stock':'Send request'}</button></div></div>
 <aside class="card txi"><div class="ph"><h3>Transaction types</h3></div>${Object.entries(hints).map(([k,v])=>`<div class="txty" data-t="${k}"><i style="background:${TCOL[k]}"></i><div><b>${k}</b><span>${v}</span></div></div>`).join('')}</aside></div>`}
const hints={Trading:'Buy and resell as-is, including pumps and machines.',Repacking:'Split bulk material into smaller standard units, for example a drum into 20 kg bags. Pick the item, then type or choose what it is repacked into.',Blending:'Combine several raw materials into one new finished product. Add every ingredient, then name the finished product.',Others:'Any other reason. Say why in the notes.'};
const TXL={Trading:['Items','Add item','Notes (optional)'],Repacking:['Item to repack','Add another item','Notes (optional)'],Blending:['Ingredients (add every raw material)','Add ingredient','Notes (optional)'],Others:['Items','Add item','Reason *']};
function typeHint(changed){const t=$('#tx_t').value;txs.t=t;$('#tx_h').textContent=hints[t];
 document.querySelectorAll('.txty').forEach(e=>e.classList.toggle('on',e.dataset.t===t));
 $('#tx_il').textContent=TXL[t][0];$('#tx_add').textContent=TXL[t][1];$('#tx_nl').textContent=TXL[t][2];$('#tx_n').placeholder=t==='Others'?'Why is the stock going out?':'Optional';
 $('#tx_tg').innerHTML=t==='Blending'?'<label for="tx_target">Finished product (what you are blending into) *</label><div class="cbw"><input id="tx_target" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" placeholder="Type the name, or pick an existing product"></div>':'';
 if(t==='Blending'){const el=$('#tx_target');el.value=txs.target;cbAttach(el,{free:true,items:()=>nameList(),onType:v=>{txs.target=v},pick:it=>{txs.target=it.label;el.value=it.label}})}
 if(changed){
  if(t==='Blending'){while(lines.length<2)lines.push({p:'',q:'',into:''})}
  // Trading, Repacking and Others start with 1 item: drop the empty extra rows left over from Blending.
  else{const kept=lines.filter(l=>l.p||String(l.q)!==''||l.into);lines=kept.length?kept:[{p:'',q:'',into:''}]}
  drawLines()}}
const freshLines=()=>txs.t==='Blending'?[{p:'',q:'',into:''},{p:'',q:'',into:''}]:[{p:'',q:'',into:''}];

// ---- searchable pick list: type part of a name or SKU and the matching items show up ----
const lbl=p=>p.name+(p.sku?' · '+p.sku:'');
const hay=(...a)=>a.join(' ').toLowerCase();
const nameList=()=>{const seen=new Set(),out=[];
 const add=(label,sub)=>{const k=label.trim().toLowerCase();if(!k||seen.has(k))return;seen.add(k);out.push({label:label.trim(),sub,hay:k})};
 db.products.forEach(p=>add(p.name,'Item in stock'));
 db.req.forEach(r=>{if(r.target)add(r.target,'Used before');r.items.forEach(i=>{if(i.into)add(i.into,'Used before')})});
 return out};
function prodItems(i){const taken=new Set(lines.filter((_,j)=>j!==i).map(l=>String(l.p)));
 return db.products.filter(p=>!taken.has(String(p.id))).map(p=>{const off=hold(p)?'On hold (expired)':p.qty<=0?'No stock':'';
  return {id:p.id,label:p.name,sub:[p.sku,p.warehouse,p.item_type].filter(Boolean).join(' · '),right:off||`${fmt(p.qty)} ${p.unit}`,off:!!off,hay:hay(p.name,p.sku,p.code,p.warehouse,p.item_type)}})}
function cbAttach(inp,o){
 const list=document.createElement('div');list.className='cb-list';list.setAttribute('role','listbox');list.hidden=true;list.id=inp.id+'_l';inp.parentElement.append(list);inp.setAttribute('aria-controls',list.id);
 let act=-1,cur=[];
 const rank=(it,q)=>{const l=it.label.toLowerCase();return l.startsWith(q)?3:(it.sub||'').toLowerCase().startsWith(q)?2:l.includes(q)?1:0};
 const draw=()=>{const q=inp.value.trim().toLowerCase(),toks=q.split(/\s+/).filter(Boolean);
  cur=o.items().filter(it=>toks.every(t=>it.hay.includes(t))).map(it=>[it,q?rank(it,q):0]).sort((a,b)=>b[1]-a[1]).map(x=>x[0]).slice(0,60);
  list.innerHTML=cur.length?cur.map((it,j)=>`<button type="button" role="option" id="${list.id}${j}" data-j="${j}" aria-selected="${j===act}" class="${j===act?'act':''}" ${it.off?'disabled':''}><span><b>${esc(it.label)}</b>${it.sub?`<small>${esc(it.sub)}</small>`:''}</span><span class="r${it.off?' off':''}">${esc(it.right||'')}</span></button>`).join(''):`<p class="mut" style="margin:0;padding:10px 12px;font-size:13px">${o.free?'No suggestions. Keep typing to use your own name.':'No item matches that.'}</p>`;
  list.hidden=false;inp.setAttribute('aria-expanded','true');if(act>=0)inp.setAttribute('aria-activedescendant',list.id+act);else inp.removeAttribute('aria-activedescendant')};
 const close=()=>{list.hidden=true;inp.setAttribute('aria-expanded','false');act=-1};
 const choose=j=>{const it=cur[j];if(!it||it.off)return;close();o.pick(it)};
 const step=d=>{const ok=cur.map((it,j)=>it.off?-1:j).filter(j=>j>=0);if(!ok.length)return;const k=ok.indexOf(act);act=ok[(k+d+ok.length)%ok.length]; if(k===-1&&d<0)act=ok[ok.length-1];draw();const el=$('#'+list.id+act);if(el)el.scrollIntoView({block:'nearest'})};
 inp.addEventListener('input',()=>{act=-1;if(o.onType)o.onType(inp.value);draw()});
 inp.addEventListener('focus',()=>{act=-1;draw();inp.select&&o.select&&inp.select()});
 inp.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'){e.preventDefault();if(list.hidden)draw();step(1)}
  else if(e.key==='ArrowUp'){e.preventDefault();if(list.hidden)draw();step(-1)}
  else if(e.key==='Enter'){if(!list.hidden){const open=cur.filter(it=>!it.off);if(act>=0){e.preventDefault();choose(act)}else if(open.length===1&&inp.value.trim()&&!o.free){e.preventDefault();choose(cur.indexOf(open[0]))}}}
  else if(e.key==='Escape'){if(!list.hidden){e.preventDefault();e.stopPropagation();close()}}});
 inp.addEventListener('blur',()=>setTimeout(()=>{close();if(o.blur)o.blur()},120));
 list.addEventListener('mousedown',e=>e.preventDefault());
 list.addEventListener('click',e=>{const b=e.target.closest('button[data-j]');if(b)choose(+b.dataset.j)})}

// ---- scan an item QR code: the code holds the item link (/warehouse.html/inventory=CODE), so scanning finds the item and adds it as a line ----
const shortTxt=s=>{s=String(s).replace(/\s+/g,' ').trim();return s.length>70?s.slice(0,67)+'...':s};
// What a scan can contain: the item link, the link with encoded characters, or just the code. Lastly, any known inventory code found inside the text.
function productFromScan(raw){let s=String(raw||'').trim();if(!s)return null;
 const forms=[s];try{forms.push(decodeURIComponent(s))}catch(e){}
 for(const f of forms){const m=/inventory\s*[=\/:]\s*([A-Za-z0-9-]{1,40})/i.exec(f)||/^([A-Za-z0-9-]{1,40})$/.exec(f.trim());
  if(m){const p=db.products.find(x=>String(x.code)===m[1]);if(p)return {p}}}
 for(const f of forms){const p=db.products.find(x=>x.code&&new RegExp('(^|[^0-9])'+x.code+'([^0-9]|$)').test(f));if(p)return {p}}
 return null}
function addScanned(raw){const r=productFromScan(raw);if(!r){toast(/^https?:\/\//i.test(String(raw).trim())||/inventory/i.test(raw)?'No item matches this QR code. It says: '+shortTxt(raw):'This QR code is not an item link. It says: '+shortTxt(raw));return false}
 const p=r.p;
 if(hold(p)){toast(p.name+' is expired and on hold.');return false}
 if(p.qty<=0){toast('No stock of '+p.name+'.');return false}
 let i=lines.findIndex(l=>String(l.p)===String(p.id));
 if(i>=0)toast(p.name+' is already in the list. Enter its quantity.');
 else{i=lines.findIndex(l=>!l.p);if(i<0){lines.push({p:'',q:'',into:''});i=lines.length-1}lines[i].p=p.id;toast(p.name+' added. Enter the quantity.')}
 drawLines();const q=$('#ln_q'+i);if(q){q.focus();q.scrollIntoView({block:'center'})}return true}
// handheld scanners type the link and press Enter; pasting a link or typing the inventory code works the same way
function scanKey(e){if(e.key!=='Enter')return;e.preventDefault();const el=e.target,v=el.value.trim();if(!v)return;if(addScanned(v))el.value=''}
let scanRun=0,scanStream=null;
const loadJsQR=()=>window.jsQR?Promise.resolve():new Promise((ok,no)=>{const s=document.createElement('script');s.src='js/jsQR.js';s.onload=ok;s.onerror=()=>no(new Error('load'));document.head.append(s)});
function stopScan(){scanRun++;if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null}closeM()}
function decodeFrame(src,w,h){const max=720,k=Math.min(1,max/Math.max(w,h)),cw=Math.round(w*k),ch=Math.round(h*k);
 const cv=decodeFrame.cv||(decodeFrame.cv=document.createElement('canvas'));cv.width=cw;cv.height=ch;
 const cx=cv.getContext('2d',{willReadFrequently:true});cx.drawImage(src,0,0,cw,ch);
 const r=jsQR(cx.getImageData(0,0,cw,ch).data,cw,ch,{inversionAttempts:'attemptBoth'});return r?r.data:null}
async function openScan(){
 modal(`<h2>Scan item QR code</h2><p class="mut" style="margin:2px 0 12px">Point the camera at the QR code on the item. The item is added to your list.</p>
 <div class="scanbox"><video id="scan_v" playsinline muted autoplay></video><i class="scanfr"></i></div>
 <p class="mut scanmsg" id="scan_m" role="status">Starting the camera...</p>
 <div class="row" style="margin-top:12px;justify-content:space-between"><label class="btn ghost" style="margin:0;cursor:pointer">Take or choose a photo<input id="scan_f" type="file" accept="image/*" capture="environment" hidden></label><button class="btn" onclick="stopScan()">Close</button></div>`);
 const msg=t=>{const m=$('#scan_m');if(m)m.textContent=t},my=++scanRun;
 const done=raw=>{if(addScanned(raw)){stopScan();return true}msg('Not an item QR code. It says: '+shortTxt(raw));return false};
 try{await loadJsQR()}catch(e){return msg('The scanner could not load. Use the scan field instead.')}
 $('#scan_f').onchange=async e=>{const f=e.target.files[0];if(!f)return;
  try{const bm=await createImageBitmap(f),raw=decodeFrame(bm,bm.width,bm.height);if(!raw)msg('No QR code found in that photo. Try again, closer and in focus.');else done(raw)}catch(x){msg('That photo could not be read.')}e.target.value=''};
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return msg('Live camera needs a secure (https) connection. Use "Take or choose a photo" below, or the scan field.');
 try{scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false})}
 catch(e){return msg(e&&e.name==='NotAllowedError'?'Camera access was blocked. Allow the camera for this site, or use "Take or choose a photo" below.':'No camera could be started. Use "Take or choose a photo" below, or the scan field.')}
 if(my!==scanRun||!$('#scan_v')){scanStream.getTracks().forEach(t=>t.stop());scanStream=null;return}
 const v=$('#scan_v');v.srcObject=scanStream;try{await v.play()}catch(e){}
 msg('Looking for a QR code...');let last='',lastAt=0;
 const tick=()=>{if(my!==scanRun)return;if(!$('#scan_v')){stopScan();return}   // dialog was closed some other way
  if(v.readyState>=2&&v.videoWidth){const raw=decodeFrame(v,v.videoWidth,v.videoHeight);
   if(raw&&!(raw===last&&Date.now()-lastAt<2500)){last=raw;lastAt=Date.now();if(done(raw))return}}
  setTimeout(()=>requestAnimationFrame(tick),90)};
 tick()}

function lineInfo(i){const p=db.products.find(x=>x.id==lines[i].p);
 const a=$('#ln_a'+i),u=$('#ln_u'+i);if(a)a.textContent=p?`Available: ${fmt(p.qty)} ${p.unit} · ${p.warehouse}`:'';if(u)u.textContent=p?p.unit:''}
function drawLines(focusLine){const rep=txs.t==='Repacking';
 $('#lines').innerHTML=lines.map((l,i)=>{const p=db.products.find(x=>x.id==l.p);
  return `<div class="ln"><span class="ln-n" aria-hidden="true">${i+1}</span><div class="ln-b"><div class="row"><div class="cbw"><input id="ln_p${i}" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" placeholder="Search by name or SKU" aria-label="${rep?'Item to repack':'Item'} ${i+1}" value="${esc(p?lbl(p):'')}"></div><div class="ln-q"><input id="ln_q${i}" type="number" min="0" step="any" placeholder="Qty" value="${esc(l.q)}" oninput="lines[${i}].q=this.value" aria-label="Quantity ${i+1}"><span class="mut" id="ln_u${i}"></span></div>${lines.length>1?`<button class="iconbtn ln-x" onclick="lines.splice(${i},1);drawLines()" aria-label="Remove line ${i+1}">✕</button>`:''}</div>
  <div class="mut ln-a" id="ln_a${i}"></div>
  ${rep?`<label for="ln_i${i}">Repack into *</label><div class="cbw"><input id="ln_i${i}" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" placeholder="Type what it becomes, for example 20 kg bags, or pick an item" value="${esc(l.into||'')}"></div>`:''}</div></div>`}).join('');
 lines.forEach((l,i)=>{
  const el=$('#ln_p'+i);lineInfo(i);
  cbAttach(el,{items:()=>prodItems(i),
   onType:v=>{const p=db.products.find(x=>x.id==l.p);if(p&&v!==lbl(p)){l.p='';lineInfo(i)}},
   pick:it=>{l.p=it.id;const p=db.products.find(x=>x.id==it.id);el.value=lbl(p);lineInfo(i);const q=$('#ln_q'+i);if(q)q.focus()},
   blur:()=>{const p=db.products.find(x=>x.id==l.p);el.value=p?lbl(p):''}});
  if(rep){const ii=$('#ln_i'+i);cbAttach(ii,{free:true,items:()=>nameList(),onType:v=>{l.into=v},pick:it=>{l.into=it.label;ii.value=it.label}})}});
 if(focusLine!==undefined){const f=$('#ln_p'+focusLine);if(f)f.focus()}}
function readLines(){const out=[],rep=txs.t==='Repacking';
 for(const l of lines){if(!l.p||!(+l.q>0))return toast('Pick an item from the list and enter a quantity for every line.'),null;
  const p=db.products.find(x=>x.id==l.p);if(hold(p))return toast(p.name+' is expired and on hold.'),null;
  if(+l.q>p.qty)return toast(`Only ${fmt(p.qty)} ${p.unit} of ${p.name} in stock.`),null;
  if(out.find(o=>o.id===p.id))return toast('Each item can appear once.'),null;
  const into=rep?String(l.into||'').trim():'';if(rep&&!into)return toast(`Say what ${p.name} is repacked into.`),null;
  out.push({id:p.id,n:p.name,u:p.unit,q:+l.q,into})}
 return out}
async function submitTx(){const type=$('#tx_t').value,items=readLines();if(!items)return;
 const c=$('#tx_c').value.trim(),n=$('#tx_n').value.trim(),target=type==='Blending'?String(txs.target||'').trim():'',adm=me.role==='admin';
 if(type==='Others'&&!n)return toast('Add a reason in the notes.');
 if(type==='Blending'){if(!target)return toast('Enter the finished product name.');if(items.length<2)return toast('Blending needs at least two ingredients.')}
 const r=await api(adm?'/api/release':'/api/requests','POST',{type,c,n,target,items:items.map(i=>({id:i.id,q:i.q,...(i.into?{into:i.into}:{})}))});if(!r)return;
 lines=freshLines();txs.c='';txs.n='';txs.target='';mine=null;await load();render();
 if(adm&&r.rid)relDone(r.rid);else toast(adm?'Stock released.':'Request sent to admin.')}
function relDone(rid){modal(`<div class="txok"><span class="tic ok">${ic('check')}</span><div><h2>Stock released</h2><p class="mut" style="margin:6px 0 0">The stock was taken out and the transaction is in History. The A4 PDF lists the items, purpose, transaction type, who requested it and who approved it. You can also get it later from Your Transaction or Approved transactions.</p></div></div><div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost" onclick="closeM()">Done</button><a class="btn ghost" href="${pdfUrl(rid,1)}">Download PDF</a><button class="btn" onclick="receipt(${rid})">Open PDF</button></div>`)}
async function decide(id,ok){const r=await api('/api/requests/'+id+'/decide','POST',{approve:!!ok});if(r){mine=null;await load();render();if(ok&&r.rid)relDone(r.rid);else toast(ok?'Stock released.':'Request rejected.')}}

// ---- A4 PDF of a release, made by the server ----
const pdfUrl=(id,dl)=>`/api/releases/${id}/pdf${dl?'?download=1':''}`;
function receipt(id){if(!window.open(pdfUrl(id),'_blank'))location.href=pdfUrl(id)}

// ---- Your Transaction: everything you requested or released, with status and PDF ----
let mine=null,mineBusy=false,lastTab='';
async function loadMine(){if(mineBusy)return;mineBusy=true;const r=await api('/api/my-transactions');mineBusy=false;mine=r?r.rows:[];if(tab==='mine')render()}
const ST={pending:['Pending','warn'],approved:['Approved','ok'],rejected:['Rejected','bad']};
function mineView(){
 const adm=me.role==='admin';
 if(mine===null)return '';
 const n=k=>mine.filter(r=>r.st===k).length;
 const rows=mine.map(r=>{const [lb,cl]=ST[r.st]||[r.st,'n'];
  const who=r.st==='pending'?'Waiting for an admin':r.st==='approved'?(r.dec_by===r.by?'Approved by '+esc(r.dec_by)+' (admin)':'Approved by '+esc(r.dec_by)):'Rejected by '+esc(r.dec_by||'admin');
  return `<tr><td style="white-space:nowrap">${r.t?new Date(r.t).toLocaleString():'-'}</td><td>${tag(r.type,'n')}</td>
  <td>${r.items.map(i=>itemLine(i)).join('<br>')}${r.target?`<br><span class="mut" style="font-size:13px">Blended into: <b>${esc(r.target)}</b></span>`:''}
   ${r.c?`<br><span class="mut" style="font-size:12.5px">Client / ref: ${esc(r.c)}</span>`:''}${r.n?`<br><span class="mut" style="font-size:12.5px">Notes: ${esc(r.n)}</span>`:''}</td>
  <td>${tag(lb,cl)}<br><span class="mut" style="font-size:12.5px">${who}</span></td>
  <td>${r.st==='approved'&&r.rid?`<button class="btn ghost sm" onclick="receipt(${r.rid})">${ic('rcpt')} PDF</button>`:'<span class="mut">-</span>'}</td></tr>`}).join('');
 return `<div class="txsum"><div><b data-n="${mine.length}">${mine.length}</b><span>Total</span></div><div class="w"><b data-n="${n('pending')}">${n('pending')}</b><span>Pending</span></div><div class="g"><b data-n="${n('approved')}">${n('approved')}</b><span>Approved</span></div><div class="r"><b data-n="${n('rejected')}">${n('rejected')}</b><span>Rejected</span></div></div>
 <div class="card flush"><div class="scroll"><table class="txtab"><thead><tr><th>When</th><th>Type</th><th>Details</th><th>Status</th><th>PDF</th></tr></thead><tbody>${rows||`<tr><td colspan="5">${txEmpty('tx',adm?'You have not released any stock yet.':'You have not sent any requests yet.','Your transactions will be listed here.')}</td></tr>`}</tbody></table></div></div>`}
PAGES.tx=tx;
window.afterRender=()=>{if(tab!==lastTab){lastTab=tab;if(tab==='mine')loadMine()}
 if(tab==='mine'&&mine===null)loadMine();
 if(tab==='form'){$('#tx_t').value=txs.t;$('#tx_c').value=txs.c;$('#tx_n').value=txs.n;typeHint();drawLines()}};
