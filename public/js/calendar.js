// Calendar: a month grid and an Upcoming list. Admin and basic users add events on a date and time
// (future transactions, pull-ins, deliveries and anything else). View-only users can look but not add.
Object.assign(I,{chl:'<path d="M15 6l-6 6 6 6"/>',chr:'<path d="M9 6l6 6-6 6"/>',clk:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'});
const EV_TYPES=['Transaction','Pull-in','Delivery','Other'];
const EV_COL={Transaction:'#2660a2','Pull-in':'#1d7a4b',Delivery:'#b26a00',Other:'#7a8aa0'};
const WEEK_START=0;                                   // 0 = weeks start on Sunday, 1 = Monday
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;   // local date, no time zone shifts
const parseDay=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const todayStr=()=>ymd(new Date());
const t12=t=>{if(!t)return '';const [h,m]=t.split(':').map(Number);return `${h%12||12}${m?':'+pad(m):''}${h<12?'am':'pm'}`};   // 09:00 -> 9am, 13:30 -> 1:30pm
const tShort=t12;
const whenTxt=e=>e.time?t12(e.time)+(e.end?' – '+t12(e.end):''):'All day';
const longDay=(s,y=true)=>parseDay(s).toLocaleDateString('en',{weekday:'long',month:'long',day:'numeric',...(y?{year:'numeric'}:{})});

let calCur=new Date(new Date().getFullYear(),new Date().getMonth(),1),calSel=todayStr(),calLast='';
let dayModal='';                                      // date whose day list is open (so closing an event returns to it)
let evs=[],upc=[];                                    // events in the month grid / events from today on
const calHide=new Set();                              // event types switched off in the legend
const canAdd=()=>me.role!=='view';
const canChange=e=>me.role==='admin'||(me.role==='basic'&&e.uid===me.id);
const findEv=id=>[...evs,...upc].find(e=>e.id===id);

// ---------- loading ----------
const gridStart=()=>{const s=new Date(calCur);s.setDate(1-((calCur.getDay()-WEEK_START+7)%7));return s};
async function loadMonth(){const a=gridStart(),b=new Date(a);b.setDate(a.getDate()+41);
 const r=await api(`/api/events?from=${ymd(a)}&to=${ymd(b)}`);if(r)evs=r.events}
async function loadUpcoming(){const a=new Date(),b=new Date(a.getFullYear()+1,a.getMonth(),a.getDate());
 const r=await api(`/api/events?from=${ymd(a)}&to=${ymd(b)}`);if(r)upc=r.events}
async function refresh(){await (tab==='list'?loadUpcoming():loadMonth());render()}

// ---------- page ----------
function calHead(){const adm=canAdd();
 const H=tab==='list'?['Upcoming events',upc.length?`${upc.length} event${upc.length===1?'':'s'} coming up in the next 12 months.`:'Nothing is scheduled yet.']
  :['Schedule',adm?'Plan future transactions, pull-ins and deliveries. Click a day to see what is planned, or press + to add an event.':'See what is planned. Only admin and basic accounts can add events.'];
 return `<section class="hero sm"><div class="hl"><p class="eyebrow">Calendar</p><h2>${H[0]}</h2><p class="sub">${H[1]}</p></div></section>`}
function PAGE_CAL(){return calHead()+(tab==='list'?upcomingView():monthView())}
PAGES.cal=PAGE_CAL;

const legend=()=>`<div class="calleg" role="group" aria-label="Show event types">${EV_TYPES.map(t=>`<button type="button" class="lg${calHide.has(t)?' off':''}" style="--c:${EV_COL[t]}" aria-pressed="${!calHide.has(t)}" onclick="togType('${t}')"><i></i>${t}</button>`).join('')}</div>`;
const chip=e=>`<button type="button" class="cchip" style="--c:${EV_COL[e.type]}" onclick="event.stopPropagation();openEv(${e.id})" title="${esc(e.type+': '+e.title+' · '+whenTxt(e))}" aria-label="${esc(e.type+': '+e.title+', '+whenTxt(e))}"><i></i>${e.time?`<b>${tShort(e.time)}</b>`:''}<span>${esc(e.title)}</span></button>`;

const MONTHS=[...Array(12)].map((_,i)=>new Date(2024,i,1).toLocaleDateString('en',{month:'long'}));
const YEAR_MIN=2000,YEAR_MAX=2100;                    // the server accepts events from 2000 to 2100
const calHeadSel=()=>{const y=calCur.getFullYear();
 return `<div class="calsel"><select id="cal_m" aria-label="Month" onchange="calGo()">${MONTHS.map((n,i)=>`<option value="${i}" ${i===calCur.getMonth()?'selected':''}>${n}</option>`).join('')}</select><select id="cal_y" aria-label="Year" onchange="calGo()">${Array.from({length:YEAR_MAX-YEAR_MIN+1},(_,i)=>YEAR_MIN+i).map(v=>`<option ${v===y?'selected':''}>${v}</option>`).join('')}</select></div>`};
function monthView(){
 const start=gridStart(),td=todayStr(),mm=calCur.getMonth(),by={};
 evs.filter(e=>!calHide.has(e.type)).forEach(e=>(by[e.date]=by[e.date]||[]).push(e));
 const names=[...Array(7)].map((_,i)=>new Date(2024,0,7+((i+WEEK_START)%7)).toLocaleDateString('en',{weekday:'short'}));   // 7 Jan 2024 was a Sunday
 let cells='';
 for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const s=ymd(d),L=by[s]||[];
  cells+=`<div class="cd${d.getMonth()!==mm?' out':''}${s===td?' today':''}${s===calSel?' sel':''}" role="gridcell" tabindex="0" data-d="${s}" aria-selected="${s===calSel}" aria-label="${longDay(s)}${L.length?', '+L.length+' event'+(L.length===1?'':'s'):''}" onclick="openDay('${s}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openDay('${s}')}">
   <div class="cdh"><span class="cdn">${d.getDate()}</span>${canAdd()?`<button type="button" class="cda" onclick="event.stopPropagation();addEv('${s}')" aria-label="Add event on ${longDay(s)}" title="Add event">+</button>`:''}</div>
   <div class="cdl">${L.slice(0,2).map(chip).join('')}${L.length>2?`<button type="button" class="cmore" onclick="event.stopPropagation();openDay('${s}')">+${L.length-2} more</button>`:''}</div></div>`}
 return `<div class="card calc">
  <div class="calh"><div class="row"><button class="iconbtn" onclick="monthStep(-1)" aria-label="Previous month">${ic('chl')}</button>${calHeadSel()}<button class="iconbtn" onclick="monthStep(1)" aria-label="Next month">${ic('chr')}</button></div>
   <div class="row"><label class="caljump"><span>Go to date</span><input id="cal_jd" type="date" min="${YEAR_MIN}-01-01" max="${YEAR_MAX}-12-31" value="${esc(calSel)}" onchange="jumpDate(this.value)" aria-label="Go to a specific date"></label><button class="btn ghost sm" onclick="goToday()">Today</button>${canAdd()?`<button class="btn sm" onclick="addEv(calSel)">Add event</button>`:''}</div></div>
  ${legend()}
  <div class="calg" role="grid" aria-label="${calCur.toLocaleDateString('en',{month:'long',year:'numeric'})}">${names.map(n=>`<div class="cdw" role="columnheader">${n}</div>`).join('')}${cells}</div></div>`}

function evRow(e,showDate,fromDay){return `<button type="button" class="evr" style="--c:${EV_COL[e.type]}" onclick="openEv(${e.id}${fromDay?`,'${fromDay}'`:''})"><span class="evt">${showDate?`<small>${parseDay(e.date).toLocaleDateString('en',{month:'short',day:'numeric'})}</small>`:''}${esc(whenTxt(e))}</span><span class="evb"><b>${esc(e.title)}</b><small>${esc(e.type)}${e.warehouse?' · '+esc(e.warehouse):''} · ${esc(e.by)}</small></span></button>`}
// Clicking a date opens every event of that day (the grid itself only shows the first two)
function openDay(s){calSel=s;dayModal=s;const L=evs.filter(e=>e.date===s),td=todayStr();
 modal(`<div class="row sp" style="align-items:flex-start"><div><h2 style="margin-bottom:2px">${longDay(s)}</h2><div class="mut">${L.length?`${L.length} event${L.length===1?'':'s'} scheduled`:'Nothing scheduled'}</div></div>${s===td?'<span class="tag t-n">Today</span>':''}</div>
  <div class="evl">${L.map(e=>evRow(e,false,s)).join('')||`<div class="empty"><span class="tic">${ic('cal')}</span><b>Nothing scheduled</b><span>${canAdd()?'Add a transaction, pull-in or delivery for this day.':'No events on this day.'}</span></div>`}</div>
  <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn ghost" onclick="closeDay()">Close</button>${canAdd()?`<button class="btn" onclick="addEv('${s}','${s}')">Add event</button>`:''}</div>`);
 render()}
const closeDay=()=>{dayModal='';closeM()};
const backOrClose=()=>{if(dayModal)openDay(dayModal);else closeM()};

function upcomingView(){const td=todayStr(),L=upc.filter(e=>!calHide.has(e.type)),g={};
 L.forEach(e=>(g[e.date]=g[e.date]||[]).push(e));
 const tm=ymd(new Date(Date.now()+864e5));
 const html=Object.keys(g).sort().map(s=>`<div class="upd"><h4>${s===td?'Today':s===tm?'Tomorrow':longDay(s,parseDay(s).getFullYear()!==new Date().getFullYear())}${s===td||s===tm?` <span class="mut">${longDay(s,false)}</span>`:''}</h4><div class="evl">${g[s].map(e=>evRow(e)).join('')}</div></div>`).join('');
 return `<div class="card calc">${legend()}${html||`<div class="empty"><span class="tic">${ic('cal')}</span><b>Nothing scheduled</b><span>${canAdd()?'Events you add show up here in date order.':'No upcoming events.'}</span></div>`}${canAdd()?`<div style="margin-top:12px"><button class="btn ghost sm txadd" onclick="addEv(todayStr())">Add event</button></div>`:''}</div>`}

// ---------- navigation ----------
function monthStep(n){calCur=new Date(calCur.getFullYear(),calCur.getMonth()+n,1);const t=new Date();
 calSel=calCur.getFullYear()===t.getFullYear()&&calCur.getMonth()===t.getMonth()?todayStr():ymd(calCur);refresh()}
function goToday(){const t=new Date();calCur=new Date(t.getFullYear(),t.getMonth(),1);calSel=todayStr();refresh()}
function calGo(){const y=+$('#cal_y').value,m=+$('#cal_m').value,n=new Date();calCur=new Date(y,m,1);
 calSel=y===n.getFullYear()&&m===n.getMonth()?todayStr():ymd(calCur);refresh()}
async function jumpDate(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))return;const d=parseDay(v);
 if(d.getFullYear()<YEAR_MIN||d.getFullYear()>YEAR_MAX)return toast(`Pick a date between ${YEAR_MIN} and ${YEAR_MAX}.`);
 calCur=new Date(d.getFullYear(),d.getMonth(),1);calSel=v;await loadMonth();openDay(v)}
function togType(t){calHide.has(t)?calHide.delete(t):calHide.add(t);render()}

// ---------- add, edit, view, delete ----------
function evForm(e,date){const n=!e,v=e||{title:'',type:'Transaction',date:date||todayStr(),time:'09:00',end:'',warehouse:'',notes:''},ad=!v.time;
 modal(`<h2>${n?'Add event':'Edit event'}</h2><p class="mut" style="margin:2px 0 8px">${n?'Schedule a future transaction, pull-in, delivery or anything else.':'Change the details and save.'}</p>
 <div class="fgrid">
 <div class="full"><label for="ev_t">Title *</label><input id="ev_t" maxlength="100" autocomplete="off" placeholder="For example: Deliver 20 drums to the client" value="${esc(v.title)}" onkeydown="if(event.key==='Enter')saveEv(${n?0:e.id})"></div>
 <div><label for="ev_y">Type</label><select id="ev_y">${EV_TYPES.map(t=>`<option ${v.type===t?'selected':''}>${t}</option>`).join('')}</select></div>
 <div><label for="ev_w">Warehouse (optional)</label><select id="ev_w"><option value="">Not specific</option>${WH.map(w=>`<option ${v.warehouse===w?'selected':''}>${w}</option>`).join('')}</select></div>
 <div class="full evtm"><div><label for="ev_d">Date *</label><input id="ev_d" type="date" value="${esc(v.date)}"></div><div><label for="ev_s">Start time</label><input id="ev_s" type="time" value="${esc(v.time||'09:00')}" ${ad?'disabled':''}></div><div><label for="ev_e">End time (optional)</label><input id="ev_e" type="time" value="${esc(v.end)}" ${ad?'disabled':''}></div></div>
 <div class="full"><label class="evck"><input id="ev_ad" type="checkbox" ${ad?'checked':''} onchange="$('#ev_s').disabled=$('#ev_e').disabled=this.checked"> All day (no specific time)</label></div>
 <div class="full"><label for="ev_n">Notes (optional)</label><textarea id="ev_n" rows="3" maxlength="500" placeholder="Client, PO number, items, contact person...">${esc(v.notes)}</textarea></div></div>
 <div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn ghost" onclick="backOrClose()">Cancel</button><button class="btn" onclick="saveEv(${n?0:e.id})">${n?'Add event':'Save changes'}</button></div>`);
 setTimeout(()=>{const t=$('#ev_t');if(t)t.focus()},30)}
const addEv=(d,from)=>{if(!canAdd())return;dayModal=from||'';evForm(null,d)};
async function saveEv(id){const ad=$('#ev_ad').checked,b={title:$('#ev_t').value.trim(),type:$('#ev_y').value,warehouse:$('#ev_w').value,date:$('#ev_d').value,time:ad?'':$('#ev_s').value,end:ad?'':$('#ev_e').value,notes:$('#ev_n').value.trim()};
 if(!b.title)return toast('Enter a title for the event.');
 if(!b.date)return toast('Pick a date.');
 if(!ad&&!b.time)return toast('Pick a start time, or tick All day.');
 if(b.end&&b.end<=b.time)return toast('The end time must be after the start time.');
 const r=await api(id?'/api/events/'+id:'/api/events',id?'PUT':'POST',b);if(!r)return;
 closeM();
 if(tab!=='list'){const d=parseDay(b.date);calCur=new Date(d.getFullYear(),d.getMonth(),1);calSel=b.date}
 await refresh();if(dayModal&&tab!=='list')openDay(dayModal=b.date);toast(id?'Event updated.':'Event added.')}
function openEv(id,from){const e=findEv(id);if(!e)return;dayModal=from||'';
 const col=EV_COL[e.type],dv=(l,v,c='')=>`<div class="dv ${c}"><span>${l}</span><b>${v}</b></div>`;
 modal(`<div class="row sp" style="align-items:flex-start"><div><h2 style="margin-bottom:2px">${esc(e.title)}</h2><div class="mut">${esc(longDay(e.date))}</div></div><span class="tag evtag" style="--c:${col}">${esc(e.type)}</span></div>
 <div class="fgrid" style="margin-top:8px">${dv('Time',esc(whenTxt(e)))}${dv('Warehouse',esc(e.warehouse)||'-')}${dv('Added by',`${esc(e.by)}<br><span style="font-weight:500;font-size:12.5px">${new Date(e.created_at).toLocaleString()}</span>`)}${e.modified_at?dv('Last changed by',`${esc(e.modified_by)}<br><span style="font-weight:500;font-size:12.5px">${new Date(e.modified_at).toLocaleString()}</span>`):dv('Last changed','-')}
 <div class="dv full"><span>Notes</span><b style="font-weight:500;white-space:pre-wrap;display:block">${esc(e.notes)||'-'}</b></div></div>
 <div class="row" id="ev_act" style="margin-top:14px;justify-content:flex-end"><button class="btn ghost" onclick="backOrClose()">${dayModal?'Back':'Close'}</button>${canChange(e)?`<button class="btn ghost" style="color:var(--bad)" onclick="askDel(${e.id})">Delete</button><button class="btn" onclick="evForm(findEv(${e.id}))">Edit</button>`:''}</div>`)}
function askDel(id){$('#ev_act').innerHTML=`<span class="mut" style="margin-right:auto">Delete this event?</span><button class="btn ghost" onclick="openEv(${id},'${dayModal}')">Cancel</button><button class="btn bad" onclick="doDel(${id})">Yes, delete</button>`}
async function doDel(id){if(!await api('/api/events/'+id,'DELETE'))return;closeM();await refresh();if(dayModal&&tab!=='list')openDay(dayModal);toast('Event deleted.')}

window.afterRender=()=>{if(tab!==calLast){calLast=tab;refresh()}};
