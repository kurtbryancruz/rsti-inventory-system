// History (admin): everything that happened in the system, newest first.
// Look and feel follows the other pages: banner, clickable summary tiles, toolbar, and a feed grouped by day.
Object.assign(I,{
 ban:'<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
 key:'<circle cx="8" cy="15" r="4"/><path d="M10.8 12.2L20 3M16 7l3 3M14 9l2 2"/>',
 ucheck:'<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M16 11l2 2 4-4"/>',
 users:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8"/>',
 dl:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>'
});
const isIn=x=>/^(Pull-in|Stock added)/.test(x.action);
const hisCat=x=>x.out?'out':isIn(x)?'in':'mod';
const HIS_PAGE=60;                       // rows drawn at first; "Show more" adds this many again
let hp='all',hr='all',hn=HIS_PAGE;       // person filter, date range, rows shown

// icon and colour for each kind of action (colours match the tags used elsewhere: '' blue, ok green, warn amber, bad red)
const HIS_KIND=[
 [/^Released/,'out','warn'],[/^(Pull-in|Stock added)/,'plus','ok'],[/^Pull-out requested/,'tx',''],[/^Request rejected/,'ban','bad'],
 [/^Expiry exception approved/,'shield','warn'],[/^Expiry exception removed/,'shield','bad'],[/^Product edited/,'edit',''],
 [/^Event /,'cal',''],[/^Account created/,'users',''],[/^Account edited/,'edit',''],[/^Role changed/,'ucheck',''],[/^Password reset/,'key','warn'],
 [/^Account enabled/,'ucheck','ok'],[/^Account disabled/,'ban','bad']];
const hisKind=x=>{const k=HIS_KIND.find(([re])=>re.test(x.action));return k?[k[1],k[2]]:['his','']};

// small avatar: initials on a colour taken from the name
const HI_COL=['#2660a2','#1d7a4b','#b26a00','#7a4fb0','#c2410c','#0f766e'];
const hiCol=n=>HI_COL[[...String(n)].reduce((a,c)=>a+c.charCodeAt(0),0)%HI_COL.length];
const hiIni=n=>(String(n).trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('')||'?').toUpperCase();

const hiDay=t=>{const d=new Date(t),s=new Date();s.setHours(0,0,0,0);const diff=Math.round((s-new Date(t).setHours(0,0,0,0))/day);
 return diff===0?'Today':diff===1?'Yesterday':d.toLocaleDateString('en',{weekday:'long',month:'long',day:'numeric',...(d.getFullYear()!==new Date().getFullYear()?{year:'numeric'}:{})})};
const hiTime=t=>new Date(t).toLocaleTimeString('en',{hour:'numeric',minute:'2-digit'});

// ---------- filtering ----------
function hisSince(){const s=new Date();s.setHours(0,0,0,0);const t=s.getTime();return hr==='today'?t:hr==='7'?t-6*day:hr==='30'?t-29*day:0}
function hisList(){const since=hisSince(),ql=q.trim().toLowerCase();
 return db.log.filter(x=>(tab==='all'||hisCat(x)===tab)&&(hp==='all'||x.by===hp)&&x.t>=since&&(!ql||(x.by+' '+x.action+' '+x.detail).toLowerCase().includes(ql))).sort((a,b)=>b.t-a.t)}

// ---------- pieces ----------
function hisHead(){const n=db.log.length,H={
 all:['All activity',`${fmt(n)} event${n===1?'':'s'} recorded. Stock movements, releases, requests and account changes all appear here.`],
 out:['Releases','Stock that went out, with the A4 PDF for each release.'],
 in:['Pull-ins','Stock that came in: new products and top-ups.'],
 mod:['Other changes','Product edits, requests, expiry exceptions and account changes.']}[tab]||['History',''];
 return `<section class="hero sm"><div class="hl"><p class="eyebrow">History</p><h2>${H[0]}</h2><p class="sub">${H[1]}</p></div></section>`}

function hisTiles(){const L=db.log,c=k=>L.filter(x=>hisCat(x)===k).length;
 const T=(k,n,l,cls='')=>`<div class="sf ${cls}${tab===k?' on':''}" role="button" tabindex="0" aria-pressed="${tab===k}" onclick="hisGo('${k}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();hisGo('${k}')}"><b data-n="${n}">${fmt(n)}</b><span>${l}</span></div>`;
 return `<div class="txsum">${T('all',L.length,'All activity')}${T('out',c('out'),'Releases','w')}${T('in',c('in'),'Pull-ins','g')}${T('mod',c('mod'),'Other changes','s')}</div>`}

function hisBar(){const people=[...new Set(db.log.map(x=>x.by).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
 const R=[['all','All time'],['today','Today'],['7','7 days'],['30','30 days']];
 return `<div class="wtb card"><div class="wsr">${ic('search')}<input placeholder="Search who, what or details" value="${esc(q)}" oninput="q=this.value;hisT()" aria-label="Search history"></div>
  <select onchange="hp=this.value;hisT()" aria-label="Filter by person"><option value="all">Everyone</option>${people.map(n=>`<option ${hp===n?'selected':''}>${esc(n)}</option>`).join('')}</select>
  <div class="seg" id="hrg" role="group" aria-label="Date range">${R.map(([k,l])=>`<button data-k="${k}" aria-pressed="${hr===k}" class="${hr===k?'on':''}" onclick="hisRange('${k}')">${l}</button>`).join('')}</div>
  <span class="mut" id="hin" style="font-size:13px"></span>
  <button class="btn ghost wtb-add" onclick="hisCsv()">${ic('dl')} Export CSV</button></div>`}

function hisRow(x){const [icn,tone]=hisKind(x);
 return `<div class="hir"><span class="tic ${tone}" aria-hidden="true">${ic(icn)}</span>
  <div class="hib"><b>${esc(x.action)}</b>${x.detail?`<p>${esc(x.detail)}</p>`:''}<small><span class="hiav" style="background:${hiCol(x.by)}" aria-hidden="true">${esc(hiIni(x.by))}</span>${esc(x.by)||'System'}</small></div>
  <div class="hit"><time datetime="${new Date(x.t).toISOString()}" title="${esc(new Date(x.t).toLocaleString())}">${hiTime(x.t)}</time>${x.rid?`<button class="btn ghost sm ab" onclick="hisPdf(${x.rid})" aria-label="Open the PDF of this release">${ic('rcpt')} PDF</button>`:''}</div></div>`}

// the feed, grouped by day, drawn up to `hn` rows
function hisFeed(){const L=hisList(),shown=L.slice(0,hn);let out='',g='',open=false;
 shown.forEach(x=>{const k=hiDay(x.t);
  if(k!==g){if(open)out+='</div>';g=k;open=true;const n=L.filter(y=>hiDay(y.t)===k).length;
   out+=`<div class="hid"><h3>${esc(k)}</h3><span>${n} event${n===1?'':'s'}</span></div><div class="hig">`}
  out+=hisRow(x)});
 if(open)out+='</div>';
 if(!L.length)out=`<div class="empty"><span class="tic">${ic('his')}</span><b>${db.log.length?'Nothing matches':'Nothing recorded yet'}</b><span>${db.log.length?'Try another person or date range, or clear the search.':'Stock additions, releases and account changes appear here.'}</span></div>`;
 const more=L.length-shown.length;
 if(more>0)out+=`<div class="himore"><button class="btn ghost" onclick="hn+=HIS_PAGE;hisT(false)">Show ${Math.min(more,HIS_PAGE)} more <span class="mut">(${fmt(more)} older)</span></button></div>`;
 else if(db.log.length>=500)out+=`<p class="mut himore" style="font-size:12.5px;margin:0">Showing the most recent 500 events.</p>`;
 return out}

function his(){return hisHead()+hisTiles()+hisBar()+`<div class="card flush" style="padding:0;overflow:hidden"><div id="hil">${hisFeed()}</div></div>`}

// ---------- updates without redrawing the whole page ----------
function hisT(reset=true){if(reset)hn=HIS_PAGE;const L=hisList(),box=$('#hil'),n=$('#hin');
 if(box)box.innerHTML=hisFeed();if(n)n.textContent=`${fmt(L.length)} shown`}
function hisRange(k){hr=k;document.querySelectorAll('#hrg button').forEach(b=>{const on=b.dataset.k===k;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});hisT()}
function hisGo(k){tab=k;history.replaceState(null,'','#'+k);hn=HIS_PAGE;render()}   // tiles work like the tabs but keep your search

// ---------- actions ----------
function hisPdf(id){const u='/api/releases/'+id+'/pdf';if(!window.open(u,'_blank'))location.href=u}
function hisCsv(){const rows=[['When','By','Action','Details']];
 hisList().forEach(x=>rows.push([csvDate(x.t),x.by,x.action,x.detail]));
 downloadCsv('history-'+d0(0),rows);toast('History exported.')}

PAGES.his=his;
window.afterRender=()=>{hisT(false)};
