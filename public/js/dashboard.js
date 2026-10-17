// Dashboard (v17): greeting + stock health, KPI cards, interactive release chart, one "Needs attention" panel,
// role-aware side card, usage and activity. Every card, row and chart slice still links to the page where you can act on it.
Object.assign(I,{
 box:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
 alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
 refresh:'<path d="M21 12a9 9 0 01-15.5 6.2M3 12a9 9 0 0115.5-6.2"/><path d="M21 4v5h-5M3 20v-5h5"/>',
 hourglass:'<path d="M6 2h12M6 22h12M7 2v4l5 5-5 5v4M17 2v4l-5 5 5 5v4"/>',
 check:'<path d="M20 6L9 17l-5-5"/>',
 trend:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
});
const TYPE_COL={Chemical:'#2660a2',Equipment:'#1d7a4b',Others:'#b26a00'};
const MIX_COL={Trading:'#2660a2',Repacking:'#1d7a4b',Blending:'#b26a00',Others:'#7a8aa0'};
const goItem=c=>{location.href='warehouse.html?inventory='+encodeURIComponent(c)};
const goType=t=>{sessionStorage.setItem('rsti_type',t);location.href='warehouse.html#all'};
let RANGE=30,ATT='';

// ---------- release data, bucketed by local day ----------
const dstart=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
function seriesOf(n,back=0){
 const end=new Date(dstart(now()));end.setDate(end.getDate()-back);
 const S=[...Array(n)].map((_,i)=>{const d=new Date(end);d.setDate(d.getDate()-(n-1-i));return{s:d.getTime(),v:0,c:0}});
 (db.rel||[]).forEach(([t,v])=>{const k=Math.round((dstart(t)-S[0].s)/day);if(k>=0&&k<n){S[k].v+=+v||0;S[k].c++}});
 return S}
const niceMax=v=>{if(v<=0)return 4;const e=Math.pow(10,Math.floor(Math.log10(v))),f=v/e;return(f<=1?1:f<=2?2:f<=5?5:10)*e};
const sum=S=>S.reduce((a,d)=>a+d.v,0);
const pctTxt=(a,b)=>b>0?`${a>=b?'▲':'▼'} ${Math.abs(Math.round((a-b)/b*100))}%`:a>0?'▲ new':'';

// ---------- interactive area chart ----------
function trendBody(){
 const S=seriesOf(RANGE),tot=sum(S),cnt=S.reduce((a,d)=>a+d.c,0),avg=tot/RANGE,prev=RANGE<=30?sum(seriesOf(RANGE,RANGE)):null;
 const W=760,H=250,pl=46,pr=14,pt=14,pb=28,iw=W-pl-pr,ih=H-pt-pb,mx=niceMax(Math.max(...S.map(d=>d.v)));
 const X=i=>pl+(S.length===1?iw/2:i*iw/(S.length-1)),Y=v=>pt+ih-v/mx*ih,P=S.map((d,i)=>[X(i),Y(d.v)]);
 let path=`M${P[0][0]},${P[0][1]}`;for(let i=1;i<P.length;i++){const m=(P[i-1][0]+P[i][0])/2;path+=` C${m},${P[i-1][1]} ${m},${P[i][1]} ${P[i][0]},${P[i][1]}`}
 const area=`${path} L${P[P.length-1][0]},${pt+ih} L${P[0][0]},${pt+ih} Z`;
 const grid=[0,1,2,3,4].map(k=>{const v=mx*k/4,y=Y(v);return`<line class="gl" x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}"/><text class="ax" x="${pl-8}" y="${y+4}" text-anchor="end">${fmt(Math.round(v*10)/10)}</text>`}).join('');
 const step=RANGE===7?1:RANGE===30?5:15;
 const xl=S.map((d,i)=>(S.length-1-i)%step?'':`<text class="ax" x="${X(i)}" y="${H-8}" text-anchor="${i===S.length-1?'end':i===0?'start':'middle'}">${new Date(d.s).toLocaleDateString('en',RANGE===7?{weekday:'short'}:{month:'short',day:'numeric'})}</text>`).join('');
 window._tg={W,H,pl,iw,S,X,Y};
 const dl=prev==null?'':`<div><b class="dl">${pctTxt(tot,prev)||'–'}</b><span>vs previous ${RANGE} days</span></div>`;
 return `<div class="cs"><div><b>${fmt(Math.round(tot))}</b><span>units released</span></div><div><b>${fmt(Math.round(avg*10)/10)}</b><span>per day</span></div><div><b>${cnt}</b><span>transaction${cnt===1?'':'s'}</span></div>${dl}</div>
 <div class="chartw"><svg id="tsvg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Units released per day, last ${RANGE} days: ${fmt(Math.round(tot))} units in total" onmousemove="trendHover(event)" onmouseleave="trendLeave()" ontouchstart="trendHover(event.touches[0])" ontouchmove="trendHover(event.touches[0])">
 <defs><linearGradient id="ag" x1="0" x2="0" y1="0" y2="1"><stop offset="0" style="stop-color:var(--acc);stop-opacity:.3"/><stop offset="1" style="stop-color:var(--acc);stop-opacity:0"/></linearGradient></defs>
 ${grid}<path class="ar" d="${area}"/><path class="al" d="${path}"/>${tot?'':`<text class="ax" x="${W/2}" y="${H/2}" text-anchor="middle" font-size="14">No releases in this period</text>`}
 <line id="tg" class="gd" y1="${pt}" y2="${pt+ih}"/><circle id="tp" class="gp" r="5"/>${xl}</svg><div class="tip" id="tip"></div></div>`}
function trendHover(e){const sv=$('#tsvg'),g=window._tg;if(!sv||!g)return;
 const r=sv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*g.W,i=Math.max(0,Math.min(g.S.length-1,Math.round((x-g.pl)/g.iw*(g.S.length-1)))),d=g.S[i],px=g.X(i),py=g.Y(d.v);
 const l=$('#tg'),p=$('#tp'),t=$('#tip');l.setAttribute('x1',px);l.setAttribute('x2',px);l.style.opacity=1;p.setAttribute('cx',px);p.setAttribute('cy',py);p.style.opacity=1;
 t.innerHTML=`<b>${new Date(d.s).toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'})}</b><br>${fmt(d.v)} units · ${d.c} transaction${d.c===1?'':'s'}`;
 t.style.left=px/g.W*100+'%';t.style.top=py/g.H*r.height+'px';t.style.opacity=1}
function trendLeave(){['#tg','#tp','#tip'].forEach(s=>{const el=$(s);if(el)el.style.opacity=0})}
function setRange(n){RANGE=n;$('#trendBox').innerHTML=trendBody();document.querySelectorAll('#rseg button').forEach(b=>{const on=+b.dataset.n===n;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)})}

// ---------- needs attention (one panel, three lists) ----------
function attData(){const P=db.products,adm=me.role==='admin';
 return{reorder:adm?P.map(p=>({p,r:reorderInfo(p)})).filter(x=>x.r.st==='now'):[],exp:P.filter(p=>p.exp&&dleft(p.exp)<=60).sort((a,b)=>a.exp>b.exp?1:-1),low:P.filter(p=>p.qty<=p.min)}}
const attTabs=()=>me.role==='admin'?[['reorder','Reorder'],['exp','Expiring'],['low','Low stock']]:[['exp','Expiring'],['low','Low stock']];
function attRows(k,D){
 const row=(p,sub,right,bar)=>`<a class="arow" href="warehouse.html?inventory=${encodeURIComponent(p.code)}"><div class="nm"><b>${esc(p.name)}</b><small>${sub}</small>${bar?`<div class="mbar"><i class="${bar.c}" data-w="${bar.w}"></i></div>`:''}</div><div class="rt">${right}</div></a>`;
 if(k==='reorder')return D.reorder.map(({p,r})=>row(p,`${esc(p.warehouse)} · reorder point ${fmt(Math.ceil(r.point))}`,`<b>${fmt(p.qty)} ${esc(p.unit)}</b>${r.order!=null?`<br><span class="mut">order ${fmt(r.order)}</span>`:''}`,{c:'bb',w:r.point>0?Math.min(100,p.qty/r.point*100):0})).join('');
 if(k==='exp')return D.exp.map(p=>row(p,`${esc(p.warehouse)} · ${fmt(p.qty)} ${esc(p.unit)}`,`${tag(...status(p))}<br><span class="mut">${p.exp}</span>`,null)).join('');
 return D.low.map(p=>row(p,`${esc(p.warehouse)} · minimum ${fmt(p.min)}`,`<b>${fmt(p.qty)} ${esc(p.unit)}</b>`,{c:'bw',w:p.min>0?Math.min(100,p.qty/p.min*100):0})).join('')}
function attBox(){const D=attData(),T=attTabs();
 if(!T.some(t=>t[0]===ATT))ATT=(T.find(t=>D[t[0]].length)||T[0])[0];
 const rows=attRows(ATT,D);
 return `<div class="seg" role="tablist" aria-label="Needs attention">${T.map(([k,l])=>`<button role="tab" aria-selected="${k===ATT}" class="${k===ATT?'on':''}" onclick="setAtt('${k}')">${l}${D[k].length?`<span class="nb">${D[k].length}</span>`:''}</button>`).join('')}</div>
 <div class="alst">${rows||`<div class="empty"><span class="tic ok">${ic('check')}</span><b>All clear</b><span>Nothing in this list right now.</span></div>`}</div>`}
function setAtt(k){ATT=k;$('#attBox').innerHTML=attBox();growBars()}

// ---------- cards ----------
function donutCard(P){
 const T=['Chemical','Equipment','Others'].map(t=>({t,n:P.filter(p=>typeOf(p)===t).length})),tot=P.length;
 if(!tot)return `<div class="ph"><h3>Products by type</h3></div><div class="empty"><span class="tic">${ic('box')}</span><b>No products yet</b><span>Add stock in the Warehouse.</span></div>`;
 const R=60,C=2*Math.PI*R,gap=T.filter(x=>x.n).length>1?3:0;let off=0;
 const arcs=T.filter(x=>x.n).map(x=>{const len=x.n/tot*C,d=Math.max(0,len-gap),a=`<circle class="sl" cx="90" cy="90" r="${R}" fill="none" stroke="${TYPE_COL[x.t]}" stroke-width="24" stroke-dasharray="${d} ${C-d}" stroke-dashoffset="${-off}" transform="rotate(-90 90 90)" onclick="goType('${x.t}')"><title>${x.t}: ${x.n} (click to see them)</title></circle>`;off+=len;return a}).join('');
 return `<div class="ph"><h3>Products by type</h3></div><div class="pie"><svg viewBox="0 0 180 180" width="168" height="168" role="img" aria-label="Products by type: ${T.map(x=>x.n+' '+x.t).join(', ')}"><circle cx="90" cy="90" r="${R}" fill="none" class="dtr" stroke-width="24"/>${arcs}<text x="90" y="90" text-anchor="middle" font-size="30" font-weight="700" class="dn">${tot}</text><text x="90" y="110" text-anchor="middle" font-size="12" class="ax">products</text></svg>
 <div class="lgs">${T.map(x=>`<a class="lg" href="warehouse.html#all" onclick="goType('${x.t}');return false"><i class="sw" style="background:${TYPE_COL[x.t]}"></i>${x.t}<span class="ct">${x.n}</span><span class="mut" style="font-size:12.5px;width:38px;text-align:right">${Math.round(x.n/tot*100)}%</span></a>`).join('')}</div></div>`}

function sideCard(P){
 const adm=me.role==='admin',bas=me.role==='basic';
 if(adm){const pr=db.req.filter(r=>r.st==='pending');
  return `<div class="ph"><h3>Waiting for your approval</h3><a class="lnk lk" href="transaction.html#req">Review all</a></div>
  ${pr.slice(0,5).map(r=>`<a class="arow" href="transaction.html#req"><span class="av">${esc((r.by||'?')[0].toUpperCase())}</span><div class="nm"><b>${esc(r.by)}</b><small>${esc(r.type)}: ${esc(r.items.map(i=>i.n).join(', '))}</small></div><div class="rt mut">${r.t?ago(r.t):''}</div></a>`).join('')||`<div class="empty"><span class="tic ok">${ic('check')}</span><b>No pending requests</b><span>New pull-out requests show up here.</span></div>`}`}
 if(bas){const c=s=>db.req.filter(r=>r.st===s).length;
  return `<div class="ph"><h3>My requests</h3><a class="lnk lk" href="transaction.html#mine">Open</a></div>
  <div class="trio"><div><b>${c('pending')}</b><span>Pending</span></div><div><b>${c('approved')}</b><span>Approved</span></div><div><b>${c('rejected')}</b><span>Declined</span></div></div>
  ${db.req.slice(0,4).map(r=>`<a class="arow" href="transaction.html#mine"><div class="nm"><b>${esc(r.type)}</b><small>${esc(r.items.map(i=>i.n).join(', '))}</small></div><div class="rt">${tag(r.st==='pending'?'Pending':r.st==='approved'?'Approved':'Declined',r.st==='pending'?'warn':r.st==='approved'?'ok':'bad')}</div></a>`).join('')||'<p class="mut" style="margin:10px 0 0">You have not sent any requests yet.</p>'}`}
 const mxw=Math.max(1,...WH.map(w=>P.filter(p=>p.warehouse===w).length));
 return `<div class="ph"><h3>Warehouses</h3><a class="lnk lk" href="warehouse.html#all">Browse</a></div>${WH.map(w=>{const L=P.filter(p=>p.warehouse===w),lo=L.filter(p=>p.qty<=p.min).length;
  return `<div class="wrow"><div class="row sp"><b>${w}</b><span class="mut">${L.length} product${L.length===1?'':'s'}${lo?` · ${lo} low`:''}</span></div><div class="mbar"><i class="bp" data-w="${L.length/mxw*100}"></i></div></div>`}).join('')}`}

function activityCard(P){
 let rows=[],more='';
 const kind=a=>/^Released/.test(a)?['ok','out']:/rejected|declined/i.test(a)?['bad','alert']:/requested/i.test(a)?['warn','hourglass']:/^Pull-in/.test(a)?['','box']:['','edit'];
 if(me.role==='admin'){rows=db.log.slice(0,8).map(x=>{const[k,i]=kind(x.action);return{t:x.t,k,i,a:`<b>${esc(x.by)}</b> · ${esc(x.action)}`,s:x.detail}});more='history.html#all'}
 else if(me.role==='basic'){rows=db.req.map(r=>({t:r.dec_at||r.t||0,k:r.st==='approved'?'ok':r.st==='rejected'?'bad':'warn',i:r.st==='approved'?'check':r.st==='rejected'?'alert':'hourglass',
  a:r.st==='pending'?'You requested a pull-out':r.st==='approved'?'Your request was approved':'Your request was declined',s:`${r.type}: ${r.items.map(i=>i.n).join(', ')}${r.dec_by?' · by '+r.dec_by:''}`})).filter(x=>x.t).sort((a,b)=>b.t-a.t).slice(0,8);more='transaction.html#mine'}
 else{rows=P.map(p=>({t:p.modified_at||p.added_at||0,k:'',i:p.modified_at?'edit':'box',a:`<b>${esc(p.modified_at?p.modified_by:p.added_by)}</b> · ${p.modified_at?'updated':'added'} ${esc(p.name)}`,s:`${p.warehouse} · ${fmt(p.qty)} ${p.unit}`,code:p.code}))
  .filter(x=>x.t).sort((a,b)=>b.t-a.t).slice(0,8)}
 return `<div class="ph"><h3>Recent activity</h3>${more?`<a class="lnk lk" href="${more}">View all</a>`:''}</div>
 <div class="tl">${rows.map(x=>`<div class="tli"><span class="tic ${x.k}">${ic(x.i)}</span><div style="flex:1;min-width:0">${x.code?`<a class="lnk" href="warehouse.html?inventory=${esc(x.code)}">`:''}<div>${x.a}</div>${x.code?'</a>':''}<div class="mut" style="font-size:12.5px;overflow-wrap:anywhere">${esc(String(x.s||'').slice(0,140))}</div></div><span class="mut" style="font-size:12px;white-space:nowrap">${ago(x.t)}</span></div>`).join('')||'<div class="empty"><span class="tic">'+ic('clock')+'</span><b>Nothing yet</b><span>Activity will appear here.</span></div>'}</div>`}

const kpi=(icon,tone,n,label,sub,href,extra)=>`<${href?'a':'div'} class="kpi ${href?'clk ':''}tone-${tone}"${href?` href="${href}"`:''}><span class="kic">${ic(icon)}</span><div class="kv"><b data-n="${n}">${fmt(n)}</b><span>${label}</span></div><small><span>${sub}</span>${extra||''}</small></${href?'a':'div'}>`;
const spark=S=>{const mx=Math.max(1,...S.map(d=>d.v)),pts=S.map((d,i)=>`${2+i*(80/(S.length-1))},${24-d.v/mx*20}`).join(' ');return`<svg class="spark" viewBox="0 0 84 26" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`};

function dash(){
 const P=db.products,adm=me.role==='admin',bas=me.role==='basic',D=attData();
 const pend=db.req.filter(r=>r.st==='pending').length,expired=P.filter(p=>dleft(p.exp)!==null&&dleft(p.exp)<0).length;
 const bad=P.filter(p=>status(p)[1]!=='ok'||(adm&&reorderInfo(p).st==='now')).length,health=P.length?Math.round((P.length-bad)/P.length*100):null;
 const na=(adm?D.reorder.length+pend:0)+D.exp.length+D.low.length,h=new Date().getHours(),first=String(me.name||'').split(' ')[0];
 const msg=adm?(na?`${na} thing${na===1?'':'s'} need${na===1?'s':''} your attention today.`:'All clear. Nothing needs your attention right now.'):bas?(pend?`You have ${pend} pending request${pend===1?'':'s'}.`:'Welcome back. Request stock any time from the Transaction page.'):`${P.length} product${P.length===1?'':'s'} across ${WH.length} warehouses.`;
 const chips=[adm&&D.reorder.length?['b',`${D.reorder.length} to reorder`,'warehouse.html#reorder']:null,D.exp.length?['r',`${D.exp.length} expiring`,'warehouse.html#exp']:null,D.low.length?['a',`${D.low.length} low on stock`,'warehouse.html#low']:null,adm&&pend?['b',`${pend} pending request${pend===1?'':'s'}`,'transaction.html#req']:null].filter(Boolean);
 const acts=adm?[['New transaction','transaction.html#form',1],['Open warehouse','warehouse.html#all',0]]:bas?[['Request stock','transaction.html#form',1],['My transactions','transaction.html#mine',0]]:[['Browse warehouse','warehouse.html#all',1]];
 const C=2*Math.PI*40;
 const hero=`<section class="hero"><div class="hl"><p class="eyebrow">${new Date().toLocaleDateString('en',{weekday:'long',month:'long',day:'numeric'})}</p><h2>${h<12?'Good morning':h<18?'Good afternoon':'Good evening'}${first?', '+esc(first):''}</h2><p class="sub">${msg}</p>
  ${chips.length?`<div class="chips">${chips.map(c=>`<a class="hchip" href="${c[2]}"><i class="${c[0]}"></i>${c[1]}</a>`).join('')}</div>`:''}
  <div class="hbtns">${acts.map(a=>`<a class="hbtn${a[2]?' pri':''}" href="${a[1]}">${a[0]}</a>`).join('')}<button type="button" class="hbtn" onclick="dashCsv()" title="Download this dashboard as a CSV report">${ic('dl')} Export report</button></div></div>
  <div class="ringw"><svg viewBox="0 0 100 100" width="118" height="118" role="img" aria-label="Stock health ${health==null?'not available':health+' percent'}"><circle class="rt2" cx="50" cy="50" r="40" fill="none" stroke-width="9"/><circle class="rg" cx="50" cy="50" r="40" fill="none" stroke-width="9" transform="rotate(-90 50 50)" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${health==null?C:C*(1-health/100)}"/><text x="50" y="55" text-anchor="middle" class="rn">${health==null?'–':health+'%'}</text></svg><span>Stock health</span></div></section>`;

 const S7=seriesOf(7),r7=sum(S7),p7=sum(seriesOf(7,7));
 const kpis=[kpi('box','b',P.length,'Products',WH.map(w=>`${P.filter(p=>p.warehouse===w).length} in ${w.replace('Warehouse ','WH ')}`).join(' · '),'warehouse.html#all'),
  kpi('trend','b',Math.round(r7),'Released · 7 days',pctTxt(r7,p7)?`${pctTxt(r7,p7)} vs last wk`:'No releases yet',adm?'history.html#out':null,spark(S7)),
  kpi('alert','a',D.low.length,'Low stock',`of ${P.length} products`,'warehouse.html#low'),
  kpi('clock','r',D.exp.length,'Expiring soon',expired?`${expired} already expired`:'none expired','warehouse.html#exp'),
  adm?kpi('refresh','b',D.reorder.length,'Need to reorder',D.reorder.length?'order soon':'all above reorder point','warehouse.html#reorder'):'',
  adm?kpi('hourglass','a',pend,'Pending requests',pend?'awaiting your review':'nothing waiting','transaction.html#req'):bas?kpi('hourglass','a',pend,'My pending requests','waiting for approval','transaction.html#mine'):''].join('');

 const tu=db.top||[],tmx=Math.max(1,...tu.map(x=>x.n));
 const usedC=`<div class="ph"><h3>Top 10 most used items</h3><span class="mut" style="font-size:12.5px">last 90 days</span></div>${tu.map((x,i)=>`<div class="urow"><span class="rkc">${i+1}</span><div style="flex:1;min-width:0"><div class="row sp" style="gap:10px"><a class="lnk" href="warehouse.html?inventory=${encodeURIComponent(x.code)}"><b>${esc(x.name)}</b></a><span class="mut" style="white-space:nowrap;font-size:13px">${x.n} release${x.n===1?'':'s'} · ${fmt(x.q)} ${esc(x.unit)}</span></div><div class="mbar"><i class="bp" data-w="${x.n/tmx*100}"></i></div></div></div>`).join('')||'<div class="empty"><span class="tic">'+ic('trend')+'</span><b>No releases yet</b><span>Most used items appear after the first releases.</span></div>'}`;
 const mixT=['Trading','Repacking','Blending','Others'].map(t=>({t,n:(db.rel||[]).filter(x=>x[2]===t).length})),mt=mixT.reduce((a,x)=>a+x.n,0);
 const mixC=`<div class="ph"><h3>Release mix</h3><span class="mut" style="font-size:12.5px">last 90 days</span></div>${mt?`<div class="stk">${mixT.filter(x=>x.n).map(x=>`<i style="width:${x.n/mt*100}%;background:${MIX_COL[x.t]}" title="${x.t}: ${x.n}"></i>`).join('')}</div>`:''}<div class="lgs" style="margin-top:12px">${mixT.map(x=>`<div class="lg" style="cursor:default"><i class="sw" style="background:${MIX_COL[x.t]}"></i>${x.t}<span class="ct">${x.n}</span><span class="mut" style="font-size:12.5px;width:38px;text-align:right">${mt?Math.round(x.n/mt*100):0}%</span></div>`).join('')}</div>`;
 const top=[...P].sort((a,b)=>b.qty-a.qty).slice(0,8),lm=Math.max(1,...top.map(p=>p.qty));
 const bigC=`<div class="ph"><h3>Largest stock on hand</h3></div>${top.map(p=>`<div class="urow"><div style="flex:1;min-width:0"><div class="row sp" style="gap:10px"><a class="lnk" href="warehouse.html?inventory=${encodeURIComponent(p.code)}">${esc(p.name)}</a><span class="mut" style="white-space:nowrap;font-size:13px">${fmt(p.qty)} ${esc(p.unit)}</span></div><div class="mbar"><i class="bp" data-w="${p.qty/lm*100}"></i></div></div></div>`).join('')||'<div class="empty"><span class="tic">'+ic('box')+'</span><b>No products yet</b><span>Add stock in the Warehouse.</span></div>'}`;

 return `${hero}<div class="kpis k${(kpis.match(/class="kpi /g)||[]).length}">${kpis}</div>
 <div class="dg2 dgap"><div class="card"><div class="ph"><h3>Stock movement</h3><div class="seg" id="rseg" role="group" aria-label="Time range">${[7,30,90].map(n=>`<button data-n="${n}" aria-pressed="${n===RANGE}" class="${n===RANGE?'on':''}" onclick="setRange(${n})">${n} days</button>`).join('')}</div></div><div id="trendBox">${trendBody()}</div></div>
  <div class="card">${donutCard(P)}</div></div>
 <div class="dg2 dgap"><div class="card"><div class="ph"><h3>Needs attention</h3><a class="lnk lk" href="warehouse.html#all">Open warehouse</a></div><div id="attBox">${attBox()}</div></div>
  <div class="card">${sideCard(P)}</div></div>
 <div class="grid g2 dgap"><div class="card">${usedC}</div><div class="card">${activityCard(P)}</div></div>
 <div class="grid g2 dgap"><div class="card">${mixC}</div><div class="card">${bigC}</div></div>`;
}

// ---------- CSV report: the same numbers and lists the dashboard shows, one section after another ----------
// Opens in Excel or Google Sheets. It only uses data this role already receives, so each role gets its own version of the report.
function dashCsv(){
 const P=db.products,adm=me.role==='admin',bas=me.role==='basic',D=attData(),rel=db.rel||[],pc=n=>P.length?Math.round(n/P.length*100)+'%':'';
 const expired=P.filter(p=>p.exp&&dleft(p.exp)<0),pend=db.req.filter(r=>r.st==='pending').length;
 const bad=P.filter(p=>status(p)[1]!=='ok'||(adm&&reorderInfo(p).st==='now')).length;
 const days=n=>seriesOf(n),units=n=>Math.round(sum(days(n))*100)/100,txs=n=>days(n).reduce((a,d)=>a+d.c,0);
 const R=[],sec=(t,head,body)=>{R.push([],[t.toUpperCase()],head,...body)};
 R.push(['RSTI Inventory: dashboard report'],['Generated',csvDate(Date.now())],['Generated by',`${me.name} (${ROLE[me.role]})`]);
 sec('Summary',['Measure','Value'],[
  ['Products',P.length],...WH.map(w=>['Products in '+w,P.filter(p=>p.warehouse===w).length]),
  ['Low stock',D.low.length],['Expiring within 60 days (includes expired)',D.exp.length],['Already expired',expired.length],
  ...(adm?[['Need to reorder',D.reorder.length],['Pending requests',pend]]:bas?[['My pending requests',pend]]:[]),
  ['Stock health',P.length?Math.round((P.length-bad)/P.length*100)+'%':''],
  ['Units released, last 7 days',units(7)],['Units released, last 30 days',units(30)],['Units released, last 90 days',units(90)],
  ['Transactions, last 30 days',txs(30)]]);
 sec('Products by type',['Type','Products','Share'],['Chemical','Equipment','Others'].map(t=>{const n=P.filter(p=>typeOf(p)===t).length;return[t,n,pc(n)]}));
 sec('Products by warehouse',['Warehouse','Products','Low stock','Expiring or expired'],WH.map(w=>{const L=P.filter(p=>p.warehouse===w);return[w,L.length,L.filter(p=>p.qty<=p.min).length,L.filter(p=>p.exp&&dleft(p.exp)<=60).length]}));
 sec('Needs attention: low stock',['Name','Inventory code','Warehouse','In stock','Unit','Minimum'],D.low.map(p=>[p.name,p.code,p.warehouse,p.qty,p.unit,p.min]));
 sec('Needs attention: expiring or expired',['Name','Inventory code','Warehouse','In stock','Unit','Expiration date','Days left','Status'],D.exp.map(p=>[p.name,p.code,p.warehouse,p.qty,p.unit,p.exp,dleft(p.exp),status(p)[0]]));
 if(adm)sec('Needs attention: reorder',['Name','Inventory code','Warehouse','In stock','Unit','Reorder point','Suggested order'],D.reorder.map(({p,r})=>[p.name,p.code,p.warehouse,p.qty,p.unit,r.point!=null?Math.ceil(r.point):'',r.order??'']));
 sec('Top 10 most used items (last 90 days)',['Rank','Name','Inventory code','Releases','Units released','Unit'],(db.top||[]).map((x,i)=>[i+1,x.name,x.code,x.n,Math.round(x.q*100)/100,x.unit]));
 const mt=rel.length;
 sec('Release mix (last 90 days)',['Type','Transactions','Share'],['Trading','Repacking','Blending','Others'].map(t=>{const n=rel.filter(x=>x[2]===t).length;return[t,n,mt?Math.round(n/mt*100)+'%':'']}));
 sec(`Units released per day (last ${RANGE} days)`,['Date','Units released','Transactions'],days(RANGE).map(d=>[csvDate(d.s).slice(0,10),Math.round(d.v*100)/100,d.c]));
 downloadCsv('dashboard-report-'+d0(0),R);toast('Dashboard report exported.')}

// bar widths and the stock-health ring are set as soon as the page is drawn (no animation)
function growBars(){document.querySelectorAll('[data-w]').forEach(el=>{el.style.width=el.dataset.w+'%'})}
window.afterRender=()=>{growBars();const rg=document.querySelector('.rg');if(rg)rg.style.strokeDashoffset=rg.dataset.off};
PAGES.dash=dash;
