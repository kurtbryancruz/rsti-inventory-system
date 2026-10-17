Object.assign(I,{box:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>'});   // icon this page uses that only the dashboard defined
const dt=t=>t?new Date(t).toLocaleString('en',{dateStyle:'medium',timeStyle:'short'}):'-';
let wf='all';
let tf=sessionStorage.getItem('rsti_type')||'all';sessionStorage.removeItem('rsti_type');   // set by the Dashboard pie chart
const whList=()=>db.products.filter(p=>(wf==='all'||p.warehouse===wf)&&(tf==='all'||typeOf(p)===tf)&&(!q||[p.name,p.sku,p.code,p.item_type,p.description,p.warehouse,p.rack,p.floor,p.supplier,p.batch].join(' ').toLowerCase().includes(q.toLowerCase()))&&(tab==='all'||(tab==='low'?p.qty<=p.min:p.exp&&dleft(p.exp)<=60)));
const whEmpty=(t,sub)=>`<div class="empty"><span class="tic">${ic('box')}</span><b>${t}</b><span>${sub}</span></div>`;
// page banner: same look as the dashboard hero, text changes with the tab
function whHead(){const n=db.products.length;
 const H={all:['Warehouse',`${n} product${n===1?'':'s'} across ${WH.length} warehouses. Click a row to see everything about an item.`],
  low:['Low stock','Items at or below their low-stock alert level.'],
  exp:['Expiring soon','Items that expire within 60 days, or have already expired.'],
  reorder:['Reorder','What to order, based on usage over the last 90 days and the lead time set on each product.']}[tab]||['Warehouse',''];
 return `<section class="hero sm"><div class="hl"><p class="eyebrow">Warehouse</p><h2>${H[0]}</h2><p class="sub">${H[1]}</p></div></section>`}
function whSum(){const P=db.products,low=P.filter(p=>p.qty<=p.min).length,exp=P.filter(p=>p.exp&&dleft(p.exp)<=60).length,gone=P.filter(p=>p.exp&&dleft(p.exp)<0).length;
 return `<div class="txsum"><div><b data-n="${P.length}">${P.length}</b><span>Products</span></div><div class="w"><b data-n="${low}">${low}</b><span>Low stock</span></div><div class="w"><b data-n="${exp}">${exp}</b><span>Expiring within 60 days</span></div><div class="r"><b data-n="${gone}">${gone}</b><span>Expired</span></div></div>`}
function wh(){const adm=me.role==='admin';
 if(tab==='reorder'&&adm)return whHead()+reorderView();
 return whHead()+whSum()+`<div class="wtb card"><div class="wsr">${ic('search')}<input placeholder="Filter this list" value="${esc(q)}" oninput="q=this.value;whT()" aria-label="Filter stock list"></div><select id="wf" onchange="wf=this.value;whT()" aria-label="Warehouse"><option value="all">All warehouses</option>${WH.map(w=>`<option ${wf===w?'selected':''}>${w}</option>`).join('')}</select><select onchange="tf=this.value;whT()" aria-label="Type of item">${[['all','All types'],['Chemical','Chemical'],['Equipment','Equipment'],['Others','Others']].map(([v,l])=>`<option value="${v}" ${tf===v?'selected':''}>${l}</option>`).join('')}</select><button class="btn ghost sm" onclick="whCsv()" title="Download the products shown in this list as a CSV file">${ic('dl')} Export CSV</button><button class="btn ghost sm" onclick="rzAll()" title="Put every column back to its normal width">Reset column widths</button>${adm?'<button class="btn wtb-add" onclick="addStock()">Add stock (pull-in)</button>':''}</div><div class="card scroll flush" id="wht">${whTable(whList())}</div>`}
const DESC_MAX=90,cut=t=>t.length>DESC_MAX?t.slice(0,DESC_MAX).trimEnd()+'...':t;
// Columns: key, title, normal width (px). Drag the edge of a header to resize; widths are remembered in this browser.
const COLS=[['name','Name',190],['wh','Warehouse',120],['rack','Rack',90],['floor','Floor area',110],['sku','SKU',130],['code','Inventory code',125],['qr','QR code',80],['type','Type of item',120],['qty','Quantity',200],['desc','Description',300],['exp','Expiration date',130],['sup','Supplier',140],['batch','Batch / lot',110],['pd','Purchase date',120],['cost','Cost per unit',120,1],['by','Added by',120],['mod','Modified by',120],['da','Date added',195],['dm','Date modified',195]];
const ACT_W=140;
let cw={};try{cw=JSON.parse(localStorage.getItem('rsti_wh_cols')||'{}')||{}}catch(e){cw={}}
const saveCw=()=>{try{localStorage.setItem('rsti_wh_cols',JSON.stringify(cw))}catch(e){}};
const colsFor=adm=>COLS.filter(c=>!c[3]||adm);
const cwOf=c=>Math.max(60,Math.min(700,+cw[c[0]]||c[2]));
function rzStart(e,k){e.preventDefault();e.stopPropagation();
 const h=e.currentTarget,tbl=h.closest('table'),cols=[...tbl.querySelectorAll('col')];
 // freeze every column at the width it has now, so nothing jumps when the drag starts
 tbl.querySelectorAll('th[data-k]').forEach(t=>{cw[t.dataset.k]=t.offsetWidth;tbl.querySelector('col[data-k="'+t.dataset.k+'"]').style.width=t.offsetWidth+'px'});
 const col=tbl.querySelector('col[data-k="'+k+'"]'),x0=e.clientX,w0=cw[k];
 const total=()=>cols.reduce((a,c)=>a+parseFloat(c.style.width),0);
 h.classList.add('on');h.setPointerCapture(e.pointerId);
 const mv=ev=>{const w=Math.max(60,Math.min(700,w0+ev.clientX-x0));cw[k]=w;col.style.width=w+'px';tbl.style.width=total()+'px'};
 const up=()=>{h.classList.remove('on');h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);h.removeEventListener('pointercancel',up);saveCw()};
 h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);h.addEventListener('pointercancel',up)}
const rzReset=k=>{delete cw[k];saveCw();whT()},rzAll=()=>{cw={};saveCw();whT()};
const fx=t=>`<td class="fx" title="${esc(t)}">${esc(t)||'-'}</td>`;
const whTable=L=>{const adm=me.role==='admin';
 const C=colsFor(adm),W=C.reduce((a,c)=>a+cwOf(c),0)+(adm?ACT_W:0);
 return `<table class="wide" style="width:${W}px"><colgroup>${C.map(c=>`<col data-k="${c[0]}" style="width:${cwOf(c)}px">`).join('')}${adm?`<col style="width:${ACT_W}px">`:''}</colgroup><thead><tr>${C.map(c=>`<th data-k="${c[0]}" title="${c[1]}">${c[1]}<span class="rz" onpointerdown="rzStart(event,'${c[0]}')" ondblclick="rzReset('${c[0]}')" title="Drag to resize, double-click to reset" aria-hidden="true"></span></th>`).join('')}${adm?'<th class="stick-r">Actions</th>':''}</tr></thead><tbody>${L.map(p=>{const s=status(p),expd=p.exp&&dleft(p.exp)<0;
 return `<tr class="clk" onclick="openItem(${p.id})"><td class="fx" title="${esc(p.name)}"><a class="lnk" href="warehouse.html?inventory=${esc(p.code)}" onclick="return openItem(${p.id},event)"><b>${esc(p.name)}</b></a></td>${fx(p.warehouse)}${fx(p.rack)}${fx(p.floor)}${fx(p.sku)}${fx(p.code)}<td>${p.hasQr?`<img class="qrt" src="/api/products/${p.id}/qr?v=${p.modified_at}" alt="QR code of ${esc(p.name)}" onclick="event.stopPropagation();showQr(${p.id})">`:'-'}</td>${fx(p.item_type)}<td>${fmt(p.qty)} ${p.unit}${s[1]!=='ok'?' '+tag(...s):''}</td><td class="desc"><div class="dtxt" title="${esc(p.description)}">${esc(cut(p.description))||'-'}</div></td><td>${p.exp||'-'}</td>${fx(p.supplier)}${fx(p.batch)}<td>${p.purchase_date||'-'}</td>${adm?`<td>${peso(p.cost)}</td>`:''}<td>${esc(p.added_by)}</td><td>${esc(p.modified_by)}</td><td>${dt(p.added_at)}</td><td>${dt(p.modified_at)}</td>${adm?`<td class="stick-r" onclick="event.stopPropagation()"><div class="acts"><button class="iconbtn" onclick="pullIn(${p.id})" title="Pull-in (receive more stock)" aria-label="Pull-in for ${esc(p.name)}">${ic('plus')}</button><button class="iconbtn" onclick="editProd(${p.id})" title="Edit" aria-label="Edit ${esc(p.name)}">${ic('edit')}</button>${expd?`<button class="iconbtn${p.exc?' on':''}" onclick="excForm(${p.id})" title="Expiry exception" aria-label="Expiry exception for ${esc(p.name)}">${ic('shield')}</button>`:''}</div></td>`:''}</tr>`}).join('')||`<tr><td colspan="${adm?20:18}" class="whe">${whEmpty('No products match.',adm?'Change the filters, or use Add stock to create one.':'Try a different filter.')}</td></tr>`}</tbody></table>`};
const whT=()=>{$('#wht').innerHTML=whTable(whList())};
// Stock-on-hand export: exactly the rows in the list right now (tab, search, warehouse and type filters). Cost and stock value are admin-only, like on screen.
function whCsv(){const adm=me.role==='admin',L=whList();
 if(!L.length)return toast('Nothing to export. Change the filters first.');
 const rows=[['Name','SKU','Inventory code','Warehouse','Rack','Floor area','Type of item','Quantity','Unit','Status','Low-stock alert level','Expiration date','Days to expiry','Supplier','Batch / lot','Purchase date',...(adm?['Cost per unit (\u20b1)','Stock value (\u20b1)']:[]),'Description','Added by','Date added','Modified by','Date modified']];
 L.forEach(p=>rows.push([p.name,p.sku,p.code,p.warehouse,p.rack,p.floor,p.item_type,p.qty,p.unit,status(p)[0],p.min,p.exp,p.exp?dleft(p.exp):'',p.supplier,p.batch,p.purchase_date,
  ...(adm?[p.cost==null||p.cost===''?'':+p.cost,p.cost==null||p.cost===''?'':Math.round(p.qty*p.cost*100)/100]:[]),p.description,p.added_by,csvDate(p.added_at),p.modified_by,csvDate(p.modified_at)]));
 const part=[{all:'stock-on-hand',low:'low-stock',exp:'expiring-stock'}[tab]||'stock-on-hand',wf!=='all'?wf.toLowerCase().replace(/\s+/g,'-'):'',tf!=='all'?tf.toLowerCase():'',d0(0)].filter(Boolean).join('-');
 downloadCsv(part,rows);toast(`Exported ${fmt(L.length)} product${L.length===1?'':'s'}.`)}

let qrNew;
const addStock=()=>prodForm(),editProd=id=>prodForm(db.products.find(p=>p.id===id));
function prodForm(p){qrNew=undefined;const isNew=!p;
 modal(`<h2>${isNew?'Add stock (pull-in)':'Edit product'}</h2><div class="fgrid">
 <div class="full fh">Product</div>
 <div><label for="pr_name">Name *</label><input id="pr_name"></div>
 <div><label for="pr_sku">SKU (master code) *</label><input id="pr_sku"></div>
 <div><label for="pr_wh">Warehouse *</label><select id="pr_wh">${WH.map(w=>`<option>${w}</option>`).join('')}</select></div>
 <div><label for="pr_type">Type of item *</label><select id="pr_type" onchange="typeSel()"><option>Chemical</option><option>Equipment</option><option value="other">Other…</option></select><input id="pr_type2" placeholder="Describe the type, for example Packaging" style="margin-top:5px;display:none" aria-label="Other type of item"></div>
 <div class="full fh">Location and stock</div>
 <div><label for="pr_rack">Rack</label><input id="pr_rack" placeholder="For example A3"></div>
 <div><label for="pr_floor">Floor area</label><input id="pr_floor" placeholder="For example Zone B"></div>
 <div><label for="pr_qty">Quantity *</label><div class="row"><input id="pr_qty" type="number" min="0" step="any"><select id="pr_unit" style="width:76px" aria-label="Unit"><option>kg</option><option>L</option><option>pcs</option></select></div></div>
 <div><label for="pr_exp">Expiration date (optional)</label><input id="pr_exp" type="date"></div>
 <div class="full fh">Reorder and supplier</div>
 <div><label for="pr_min">Low-stock alert level (optional)</label><input id="pr_min" type="number" min="0" step="any"></div>
 <div><label for="pr_lead">Lead time, days (optional)</label><input id="pr_lead" type="number" min="0" step="any" placeholder="Order to delivery"></div>
 <div><label for="pr_safe">Safety days (optional)</label><input id="pr_safe" type="number" min="0" step="any" placeholder="Spare days, default 0"></div>
 <div><label for="pr_sup">Supplier (optional)</label><input id="pr_sup"></div>
 <div class="full fh">Purchase details</div>
 <div><label for="pr_batch">Batch / lot number (optional)</label><input id="pr_batch"></div>
 <div><label for="pr_pd">Purchase date (optional)</label><input id="pr_pd" type="date"></div>
 <div><label for="pr_cost">Cost per unit, ₱ (optional)</label><input id="pr_cost" type="number" min="0" step="any"></div>
 <div class="span3"><label for="pr_qr">QR code photo (optional)</label><div class="row"><input id="pr_qr" type="file" accept="image/png,image/jpeg" onchange="pickQr(this)" style="max-width:340px"><img id="pr_qrp" class="qrt" style="display:none;cursor:default" alt="QR code preview"><button type="button" class="btn ghost sm" id="pr_qrx" onclick="rmQr()" style="display:none">Remove</button></div></div>
 <div class="full"><label for="pr_desc">Description (optional)</label><textarea id="pr_desc" rows="2"></textarea></div></div>
 <p class="mut" style="font-size:12px;margin:8px 0 0">Fields marked * are required; the rest can be filled in later. Cost is only visible to admins. Reorder: lead time is the days from ordering to delivery; if you fill in the alert level it is used instead of the calculated reorder point. ${isNew?'Saving records a pull-in: the quantity goes into stock, and added by, date added and the inventory code are filled in automatically.':`Added by ${esc(p.added_by)} on ${dt(p.added_at)}. Modified by ${esc(p.modified_by)}${p.modified_at?' on '+dt(p.modified_at):''}. To receive more of this product, use the Pull-in button in the table.`}</p>
 <div class="row" style="margin-top:10px;justify-content:flex-end"><button class="btn ghost" onclick="closeM()">Cancel</button><button class="btn" onclick="saveProd(${isNew?'0':p.id})">${isNew?'Add stock':'Save changes'}</button></div>`,'xl');
 if(p){const std=['Chemical','Equipment'].includes(p.item_type);
  $('#pr_name').value=p.name;$('#pr_sku').value=p.sku;$('#pr_wh').value=p.warehouse;$('#pr_type').value=std?p.item_type:'other';$('#pr_type2').value=std?'':p.item_type;
  $('#pr_rack').value=p.rack;$('#pr_floor').value=p.floor;
  $('#pr_qty').value=p.qty;$('#pr_unit').value=p.unit;$('#pr_exp').value=p.exp;$('#pr_min').value=p.min||'';$('#pr_lead').value=p.lead==null?'':p.lead;$('#pr_safe').value=p.safety||'';$('#pr_desc').value=p.description;
  $('#pr_sup').value=p.supplier;$('#pr_batch').value=p.batch;$('#pr_pd').value=p.purchase_date;$('#pr_cost').value=p.cost==null?'':p.cost;
  if(p.hasQr){$('#pr_qrp').src=`/api/products/${p.id}/qr?v=${p.modified_at}`;$('#pr_qrp').style.display='block';$('#pr_qrx').style.display='inline-block'}}
 typeSel()}
const typeSel=()=>{$('#pr_type2').style.display=$('#pr_type').value==='other'?'block':'none'};
function pickQr(el){const f=el.files[0];if(!f)return;if(f.size>400000){el.value='';return toast('The photo must be under 400 KB.')}
 const r=new FileReader();r.onload=()=>{qrNew=r.result;$('#pr_qrp').src=qrNew;$('#pr_qrp').style.display='block';$('#pr_qrx').style.display='inline-block'};r.readAsDataURL(f)}
function rmQr(){qrNew='';$('#pr_qr').value='';$('#pr_qrp').style.display='none';$('#pr_qrx').style.display='none'}
async function saveProd(id){
 const t=$('#pr_type').value==='other'?$('#pr_type2').value.trim():$('#pr_type').value;
 if(!$('#pr_name').value.trim())return toast('Enter the product name.');
 if(!$('#pr_sku').value.trim())return toast('Enter the SKU (master code).');
 if(!t)return toast('Describe the type of item.');
 if($('#pr_qty').value==='')return toast('Enter the quantity.');
 const b={name:$('#pr_name').value.trim(),warehouse:$('#pr_wh').value,rack:$('#pr_rack').value.trim(),floor:$('#pr_floor').value.trim(),sku:$('#pr_sku').value.trim(),item_type:t,qty:$('#pr_qty').value,unit:$('#pr_unit').value,exp:$('#pr_exp').value,min:$('#pr_min').value,lead:$('#pr_lead').value,safety:$('#pr_safe').value,
  supplier:$('#pr_sup').value.trim(),batch:$('#pr_batch').value.trim(),purchase_date:$('#pr_pd').value,cost:$('#pr_cost').value,description:$('#pr_desc').value};
 if(qrNew!==undefined)b.qr=qrNew;
 const r=await api(id?'/api/products/'+id:'/api/products',id?'PUT':'POST',b);
 if(r){await load();closeM();toast(id?(r.unchanged?'No changes to save.':'Product updated.'):'Pull-in recorded. Stock added.');render()}}

// ---- pull-in for a product that is already in the list ----
function pullIn(id){const p=db.products.find(x=>x.id===id);
 modal(`<h2>Pull-in: ${esc(p.name)}</h2><p class="mut" style="margin:2px 0 0">${esc(p.warehouse)} · on hand now ${fmt(p.qty)} ${p.unit}</p><div class="fgrid">
 <div><label for="pi_qty">Quantity received (${p.unit}) *</label><input id="pi_qty" type="number" min="0" step="any"></div>
 <div><label for="pi_sup">Supplier (optional)</label><input id="pi_sup" value="${esc(p.supplier)}"></div>
 <div><label for="pi_batch">Batch / lot number (optional)</label><input id="pi_batch"></div>
 <div><label for="pi_pd">Purchase date (optional)</label><input id="pi_pd" type="date"></div>
 <div><label for="pi_exp">New expiration date (optional)</label><input id="pi_exp" type="date"></div>
 <div><label for="pi_cost">Cost per unit, ₱ (optional)</label><input id="pi_cost" type="number" min="0" step="any"></div></div>
 <p class="mut" style="font-size:13px;margin:12px 0 0">The quantity is added to the stock on hand. A product keeps one batch, expiry date and cost at a time, so anything you fill in here replaces the current value.</p>
 <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost" onclick="closeM()">Cancel</button><button class="btn" onclick="savePullIn(${id})">Record pull-in</button></div>`)}
async function savePullIn(id){
 if(!(+$('#pi_qty').value>0))return toast('Enter the quantity received.');
 const r=await api('/api/products/'+id+'/pullin','POST',{qty:$('#pi_qty').value,supplier:$('#pi_sup').value.trim(),batch:$('#pi_batch').value.trim(),purchase_date:$('#pi_pd').value,exp:$('#pi_exp').value,cost:$('#pi_cost').value});
 if(r){await load();closeM();toast('Pull-in recorded.');render()}}

// ---- expired items are on hold until an admin approves an exception ----
function excForm(id){const p=db.products.find(x=>x.id===id);
 modal(`<h2>Expiry exception: ${esc(p.name)}</h2><p class="mut" style="margin:2px 0 0">${esc(p.warehouse)} · expired ${esc(p.exp)}</p>
 ${p.exc?`<p style="margin:12px 0 0">This item is on an approved exception, so it can be released. Approved by ${esc(p.exc_by)} on ${dt(p.exc_at)}.</p><p class="mut" style="margin:6px 0 0">Reason: ${esc(p.exc_reason)}</p>
 <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost" onclick="closeM()">Cancel</button><button class="btn bad" onclick="saveExc(${id},0)">Put back on hold</button></div>`
 :`<p style="margin:12px 0 0">Expired items are on hold and cannot be released. Approve an exception only if this item may still go out.</p><label for="ex_r">Reason for the exception *</label><textarea id="ex_r" rows="3"></textarea>
 <p class="mut" style="font-size:13px;margin:8px 0 0">The exception only covers this expiration date. It is recorded in History.</p>
 <div class="row" style="margin-top:16px;justify-content:flex-end"><button class="btn ghost" onclick="closeM()">Cancel</button><button class="btn" onclick="saveExc(${id},1)">Approve exception</button></div>`}`)}
async function saveExc(id,ok){
 const reason=ok?$('#ex_r').value.trim():'';
 if(ok&&!reason)return toast('Enter the reason for the exception.');
 if(await api('/api/products/'+id+'/exception','POST',{approve:!!ok,reason})){await load();closeM();toast(ok?'Exception approved.':'Item is on hold again.');render()}}

// ---- item details: opens from a row, or from the item link / QR code ----
const itemUrl=p=>location.origin+'/warehouse.html/inventory='+p.code;
const closeItem=()=>{closeM();history.replaceState(null,'',location.pathname+location.hash)};
function openItem(id,e){
 if(e){if(e.ctrlKey||e.metaKey||e.shiftKey||e.button===1)return true;e.preventDefault();e.stopPropagation()}
 const p=db.products.find(x=>x.id===id);if(!p)return false;
 const adm=me.role==='admin',s=status(p),expd=p.exp&&dleft(p.exp)<0,dv=(l,v,c='')=>`<div class="dv ${c}"><span>${l}</span><b>${v}</b></div>`;
 history.replaceState(null,'','?inventory='+p.code+location.hash);
 modal(`<div class="row sp" style="align-items:flex-start"><div><h2>${esc(p.name)}</h2><div class="mut">${esc(p.sku)||'No SKU'} · ${esc(p.warehouse)}</div></div><div>${tag(...s)}</div></div>
 <div class="linkbox"><div style="white-space:nowrap"><span class="mut" style="font-size:11.5px;display:block">Inventory code</span><b>${esc(p.code)}</b></div><input id="it_url" readonly value="${esc(itemUrl(p))}" onfocus="this.select()" aria-label="Item link for the QR code"><button class="btn ghost sm" onclick="copyItemUrl()">Copy link</button></div>
 <p class="mut" style="font-size:12px;margin:0 0 6px">Put this link in a QR code. Scanning it opens this item here, after sign-in.</p>
 <div class="fgrid">
 ${dv('Type of item',esc(p.item_type))}${dv('Quantity',`${fmt(p.qty)} ${esc(p.unit)}`)}${dv('Low-stock alert level',p.min?`${fmt(p.min)} ${esc(p.unit)}`:'-')}${dv('Expiration date',esc(p.exp)||'-')}
 ${adm?dv('Lead time',p.lead==null?'-':`${fmt(p.lead)} days${p.safety?` + ${fmt(p.safety)} safety`:''}`)+dv('Reorder point',(()=>{const r=reorderInfo(p);return r.point==null?'-':`${fmt(Math.ceil(r.point))} ${esc(p.unit)} (${r.basis.toLowerCase()})`})()):''}
 ${dv('Rack',esc(p.rack)||'-')}${dv('Floor area',esc(p.floor)||'-')}${dv('Supplier',esc(p.supplier)||'-')}${dv('Batch / lot number',esc(p.batch)||'-')}
 ${dv('Purchase date',esc(p.purchase_date)||'-')}${adm?dv('Cost per unit',peso(p.cost)):''}${dv('Added by',`${esc(p.added_by)}<br><span style="display:inline">${dt(p.added_at)}</span>`)}${dv('Modified by',p.modified_at?`${esc(p.modified_by)}<br><span style="display:inline">${dt(p.modified_at)}</span>`:'-')}
 ${dv('QR code photo',p.hasQr?`<img class="qrt" src="/api/products/${p.id}/qr?v=${p.modified_at}" alt="QR code of ${esc(p.name)}" style="cursor:default">`:'-')}
 ${adm&&p.exc?dv('Expiry exception',`Approved by ${esc(p.exc_by)} on ${dt(p.exc_at)}. Reason: ${esc(p.exc_reason)}`,'span2'):''}
 <div class="dv full"><span>Description</span><b style="font-weight:500;white-space:pre-wrap;display:block;max-height:84px;overflow:auto">${esc(p.description)||'-'}</b></div></div>
 <div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn ghost" onclick="closeItem()">Close</button>${adm?`${expd?`<button class="btn ghost" onclick="closeItem();excForm(${id})">Expiry exception</button>`:''}<button class="btn ghost" onclick="closeItem();pullIn(${id})">Pull-in</button><button class="btn" onclick="closeItem();editProd(${id})">Edit</button>`:''}</div>`,'xl');
 return false}
async function copyItemUrl(){const i=$('#it_url');try{await navigator.clipboard.writeText(i.value)}catch(e){i.select();document.execCommand('copy')}toast('Link copied.')}
// Opened from a QR code link: /warehouse.html/inventory=CODE becomes ?inventory=CODE
function afterBoot(){const c=new URLSearchParams(location.search).get('inventory');if(!c)return;
 const p=db.products.find(x=>x.code===c);if(p)openItem(p.id);else toast('No item found for code '+c+'.')}
function showQr(id){const p=db.products.find(x=>x.id===id);
 modal(`<h2>${esc(p.name)}</h2><p class="mut" style="margin:2px 0 12px">${esc(p.sku)||'No SKU'}</p><img src="/api/products/${id}/qr?v=${p.modified_at}" alt="QR code of ${esc(p.name)}" style="max-width:100%;max-height:60vh;display:block;margin:auto;background:#fff"><div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn" onclick="closeM()">Close</button></div>`)}
PAGES.wh=wh;
window.afterRender=()=>{};

// ---- Reorder tab (admin): what to order, based on usage over the last 90 days and the lead time set on each product ----
const roList=()=>db.products.filter(p=>(wf==='all'||p.warehouse===wf)&&(!q||[p.name,p.sku,p.code,p.item_type,p.supplier].join(' ').toLowerCase().includes(q.toLowerCase())))
 .map(p=>({p,r:reorderInfo(p)})).sort((a,b)=>{const o={now:0,lead:1,data:2,ok:3};return o[a.r.st]-o[b.r.st]||(a.r.daysLeft??1e9)-(b.r.daysLeft??1e9)||a.p.name.localeCompare(b.p.name)});
const num1=n=>Number(n).toLocaleString('en',{maximumFractionDigits:1});
function roTable(L){
 const row=({p,r})=>`<tr class="clk" onclick="openItem(${p.id})"><td><b>${esc(p.name)}</b><br><span class="mut" style="font-size:12.5px">${esc(p.sku)}</span></td><td>${esc(p.warehouse)}</td>
 <td>${fmt(p.qty)} ${esc(p.unit)}</td><td>${r.enough?`${num1(r.use)} ${esc(p.unit)}/day`:'<span class="mut">-</span>'}</td><td>${r.daysLeft!=null?num1(r.daysLeft)+' days':'-'}</td>
 <td>${r.lead!=null?`${fmt(r.lead)} d${r.safe?` + ${fmt(r.safe)} d`:''}`:'-'}</td>
 <td>${r.point!=null?`${fmt(Math.ceil(r.point))} ${esc(p.unit)}<br><span class="mut" style="font-size:12.5px">${r.basis}</span>`:'-'}</td>
 <td>${r.order!=null?`<b>${fmt(r.order)} ${esc(p.unit)}</b>`:'-'}</td>
 <td style="overflow:visible;text-overflow:clip;white-space:nowrap">${tag(...RO_ST[r.st])}${r.st==='data'?`<br><span class="mut" style="font-size:12px">${r.n} of ${MIN_USES} releases</span>`:''}</td>
 <td onclick="event.stopPropagation()"><button class="iconbtn" onclick="editProd(${p.id})" title="Edit lead time" aria-label="Edit ${esc(p.name)}">${ic('edit')}</button></td></tr>`;
 return `<table class="wide" style="width:1250px"><thead><tr><th style="white-space:normal;overflow:visible;text-overflow:clip">Item</th><th style="white-space:normal;overflow:visible;text-overflow:clip">Warehouse</th><th style="white-space:normal;overflow:visible;text-overflow:clip">In stock</th><th style="white-space:normal;overflow:visible;text-overflow:clip">Average use</th><th style="white-space:normal;overflow:visible;text-overflow:clip">Days of stock left</th><th style="white-space:normal;overflow:visible;text-overflow:clip">Lead time (+ safety)</th><th style="white-space:normal;overflow:visible;text-overflow:clip">Reorder point</th><th style="white-space:normal;overflow:visible;text-overflow:clip">Suggested order</th><th style="white-space:normal;overflow:visible;text-overflow:clip">Status</th><th style="white-space:normal;overflow:visible;text-overflow:clip"></th></tr></thead><tbody>${L.map(row).join('')||`<tr><td colspan="10" class="whe">${whEmpty('No products match.','Try a different filter.')}</td></tr>`}</tbody></table>`}
const roT=()=>{$('#rot').innerHTML=roTable(roList())};
function reorderView(){
 const all=db.products.map(p=>reorderInfo(p)),c=k=>all.filter(r=>r.st===k).length;
 return `<div class="txsum"><div class="r"><b data-n="${c('now')}">${c('now')}</b><span>To reorder now</span></div><div class="w"><b data-n="${c('lead')}">${c('lead')}</b><span>Need a lead time</span></div><div><b data-n="${c('data')}">${c('data')}</b><span>Not enough usage data yet</span></div><div class="g"><b data-n="${c('ok')}">${c('ok')}</b><span>Fine</span></div></div>
 <div class="wtb card"><div class="wsr">${ic('search')}<input placeholder="Filter this list" value="${esc(q)}" oninput="q=this.value;roT()" aria-label="Filter reorder list"></div><select onchange="wf=this.value;roT()" aria-label="Warehouse"><option value="all">All warehouses</option>${WH.map(w=>`<option ${wf===w?'selected':''}>${w}</option>`).join('')}</select><button class="btn ghost wtb-add" onclick="roCsv()">${ic('dl')} Export CSV</button></div>
 <div class="card scroll flush" id="rot">${roTable(roList())}</div>
 <p class="mut" style="font-size:12.5px;margin:10px 0 0">Average use = units released over the last 90 days (or since the item was added) divided by the days counted; it needs at least ${MIN_USES} releases. Reorder point = average use × (lead time + safety days). A typed-in alert level on the product overrides the calculation. Suggested order = enough to get back above the reorder point plus ${COVER_DAYS} days of usage. Set the lead time with the edit button.</p>`}
function roCsv(){
 const rows=[['Item','SKU','Warehouse','In stock','Unit','Average use per day','Days of stock left','Lead time (days)','Safety days','Reorder point','Basis','Suggested order','Status']];
 roList().forEach(({p,r})=>rows.push([p.name,p.sku,p.warehouse,p.qty,p.unit,r.enough?+num1(r.use):'',r.daysLeft!=null?+num1(r.daysLeft):'',r.lead??'',r.safe||'',r.point!=null?Math.ceil(r.point):'',r.basis,r.order??'',RO_ST[r.st][0]]));
 downloadCsv('reorder-list-'+d0(0),rows);toast('Reorder list exported.')}
