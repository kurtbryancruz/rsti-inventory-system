// Help page: Quick start, searchable How-to guides and FAQ. Everything shown is filtered by the signed-in role,
// so people only read about things they can actually do.
Object.assign(I,{
 book:'<path d="M4 19V5a2 2 0 012-2h14v15H6a2 2 0 00-2 2zm0 0a2 2 0 002 2h14"/>',
 box:'<path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
 check:'<path d="M20 6L9 17l-5-5"/>',
 alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
 key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
 qa:'<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/><path d="M9.5 10a2.5 2.5 0 015 .5c0 1.5-2.5 1.8-2.5 3M12 16.5h.01"/>'
});
const ALL=['admin','basic','view'],AB=['admin','basic'],AD=['admin'];
let hcat='all',HOPEN='';
const pth=t=>`<span class="hpp">${t}</span>`;

// ---------- content ----------
const mkG=()=>[
 {id:'find',cat:'Stock',roles:ALL,ic:'search',t:'Find a product',s:'Search by name, SKU, code, rack or supplier.',
  steps:['Type at least two letters in the search box at the top of any page. Stock, users, history and requests that match appear straight away.','Or open '+pth('Warehouse')+' and use <b>Filter this list</b>, the warehouse selector and the type selector.','Click a row to see every detail. Each product has a QR code: click it to enlarge.'],link:['warehouse.html#all','Open Warehouse']},
 {id:'status',cat:'Stock',roles:ALL,ic:'box',t:'Read stock status',s:'What In stock, Low stock, Expires and On hold mean.',
  steps:['<b>In stock</b>: the quantity is above the minimum alert level.','<b>Low stock</b>: the quantity is at or below the minimum.','<b>Expires in Nd</b>: 45 days or fewer are left before the expiration date.','<b>On hold · expired</b>: the date has passed. The item cannot be released or requested until an admin approves an exception.'],link:['warehouse.html#all','Open Warehouse']},
 {id:'exportstock',cat:'Stock',roles:ALL,ic:'dl',t:'Export stock to a CSV file',s:'Download the products you are looking at, to open in Excel or Google Sheets.',
  steps:['Open '+pth('Warehouse')+' and pick All products, Low stock or Expiring.','Set the filters you want: the search box, the warehouse selector and the type selector. The file contains exactly the rows you see.','Click <b>Export CSV</b>. One line per product: location, quantity, unit, status, expiration date, supplier and batch.','Admins also get the cost per unit and the stock value. Other roles do not see cost, so it is not in their file.'],link:['warehouse.html#all','Open Warehouse']},
 {id:'exportdash',cat:'Stock',roles:ALL,ic:'dl',t:'Export the dashboard report',s:'One CSV file with the numbers and lists from the Dashboard.',
  steps:['Open the '+pth('Dashboard')+' and click <b>Export report</b> at the top.','The file has sections one after another: summary, products by type and warehouse, what needs attention, top used items, release mix and units released per day.','The daily section follows the range chosen on the Stock movement chart (7, 30 or 90 days).'],link:['dashboard.html','Open Dashboard']},
 {id:'addstock',cat:'Stock',roles:AD,ic:'plus',t:'Add stock (pull-in)',s:'Record new stock or top up an existing product.',
  steps:['Open '+pth('Warehouse')+' and choose the add button to open the Add stock form. To top up a product that already exists, use the <b>+</b> button on its row.','Fill in the details: name, SKU, warehouse, quantity, unit, expiration date, supplier and so on. Cost per unit is stored and shown to admins only.','Save. The quantity is added to stock and recorded as a pull-in under '+pth('History › Pull-ins')+'.'],link:['warehouse.html#all','Open Warehouse']},
 {id:'exception',cat:'Stock',roles:AD,ic:'shield',t:'Approve an expiry exception',s:'Let an expired product be released for one specific expiration date.',
  steps:['Find the expired product in '+pth('Warehouse › Expiring')+'.','Click the shield button on its row and type the reason.','Save. The exception only covers that expiration date. If a new date is entered, the hold applies again.'],link:['warehouse.html#exp','Open Expiring list']},
 {id:'reorder',cat:'Stock',roles:AD,ic:'alert',t:'Understand reorder points',s:'When the system tells you to reorder, and how much.',
  steps:['Open '+pth('Warehouse › Reorder')+'. The <b>reorder point</b> is average daily use × (lead time + safety days).','Set a <b>lead time</b> on each product. Without it the system cannot calculate a reorder point.','A typed-in alert level (minimum) always overrides the calculation.','Average use needs at least 3 releases. Until then the row shows <b>Not enough data</b>.'],link:['warehouse.html#reorder','Open Reorder']},

 {id:'release',cat:'Transactions',roles:AD,ic:'tx',t:'Release stock',s:'Pull items out of the warehouse and get a PDF.',
  steps:['Open '+pth('Transaction › Transaction form')+' and pick the type: Trading, Repacking, Blending or Others.','Add the client or reference and any notes. For Others, say why in the notes.','Add each item: press <b>Scan QR code</b> and point the camera at the item\'s QR code (or scan with a handheld scanner into the field beside it), or search by name or SKU. Then enter the quantity and use <b>Add item</b> for more. Blending starts with 2 items and needs the finished product name.','Release. The stock is deducted at once and an A4 PDF is created. Admin requests are marked as self-approved.'],link:['transaction.html#form','Open Transaction form']},
 {id:'request',cat:'Transactions',roles:['basic'],ic:'tx',t:'Request stock',s:'Ask an admin to approve a pull-out.',
  steps:['Open '+pth('Transaction › Request form')+' and pick the transaction type.','Add the client or reference, your notes and each item with its quantity. Press <b>Scan QR code</b> to find an item by its QR code.','Send the request. Stock is not deducted until an admin approves it.','Follow it under '+pth('Your Transaction')+'. You are notified in the bell when it is approved or declined.'],link:['transaction.html#form','Open Request form']},
 {id:'schedule',cat:'Transactions',roles:AB,ic:'cal',t:'Schedule an event on the calendar',s:'Plan a future transaction, pull-in or delivery for a date and time.',
  steps:['Open '+pth('Calendar')+'. The <b>Month</b> tab shows the whole month; <b>Upcoming</b> lists what is coming in date order.','Click a day to see everything planned on it, then press <b>Add event</b>. You can also click the <b>+</b> that appears on a day, or use <b>Add event</b> at the top.','Use the month and year boxes, or <b>Go to date</b>, to jump to any date.','Type a title, pick the type (Transaction, Pull-in, Delivery or Other), the date and the start time. End time, warehouse and notes are optional. Tick <b>All day</b> if there is no set time.','Click an event to see its details. Admins can change or delete any event; basic users can change or delete only the events they added.'],link:['calendar.html','Open Calendar']},
 {id:'viewcal',cat:'Transactions',roles:['view'],ic:'cal',t:'See what is scheduled',s:'Look at planned transactions, pull-ins and deliveries.',
  steps:['Open '+pth('Calendar')+' to see the month, or the <b>Upcoming</b> tab for a date-ordered list. Use the month and year boxes, or <b>Go to date</b>, to jump to any date.','Click a day to see all its events, and an event to see its details.','View-only accounts cannot add or change events.'],link:['calendar.html','Open Calendar']},
 {id:'approve',cat:'Transactions',roles:AD,ic:'check',t:'Approve or reject a request',s:'Review pull-out requests sent by basic users.',
  steps:['Open '+pth('Transaction › Transaction requests')+'. The Dashboard also lists what is waiting for you.','Check the items, quantities and notes.','Approve to release the stock and create the PDF, or reject the request.'],link:['transaction.html#req','Open requests']},
 {id:'pdf',cat:'Transactions',roles:AB,ic:'rcpt',t:'Get the pull-out PDF',s:'Every approved release has a PDF you can open or print.',
  steps:['Right after a release, use the button in the pop-up.','Later, open '+pth('Your Transaction')+' or '+pth('Approved transactions')+' and click <b>PDF</b> on the row.','The PDF lists the items, purpose, who requested and who approved, with e-signatures if they were uploaded.'],link:['transaction.html#mine','Open Your Transaction']},
 {id:'track',cat:'Transactions',roles:AB,ic:'tx',t:'Track your transactions',s:'See what is pending, approved or rejected.',
  steps:['Open '+pth('Your Transaction')+'. The tiles at the top count Total, Pending, Approved and Rejected.','Each row shows the items, who decided, and a PDF button once it is approved.'],link:['transaction.html#mine','Open Your Transaction']},

 {id:'accounts',cat:'Admin',roles:AD,ic:'acc',t:'Create and manage accounts',s:'Roles, departments, password resets and disabling.',
  steps:['Open '+pth('Accounts › Create account')+' and choose a role: <b>Admin</b>, <b>Basic user</b> or <b>View-only</b>.','Set the department, then create the account.','In '+pth('All accounts')+' you can change a role, reset a password or disable an account. After a reset, the person must choose their own password before using the system.'],link:['accounts.html#list','Open All accounts']},
 {id:'history',cat:'Admin',roles:AD,ic:'his',t:'Review the history',s:'Who changed what, and when.',
  steps:['Open '+pth('History')+' and pick All activity, Releases, Pull-ins or Other changes.','Use the search box to filter by person, action or detail.','Releases link to their PDF.','Click <b>Export CSV</b> to download the list as it is filtered, for example one person or the last 30 days.'],link:['history.html#all','Open History']},

 {id:'password',cat:'Your account',roles:ALL,ic:'key',t:'Change your password',s:'Choose a new password any time.',
  steps:['Open '+pth(me.role==='admin'?'Profile':'User settings')+'.','Type a new password of 6 or more characters and repeat it. The strength meter shows how safe it is.','Save changes.'],link:['profile.html#profile','Open profile']},
 {id:'sig',cat:'Your account',roles:AB,ic:'edit',t:'Upload your e-signature',s:'It is printed on the PDFs you request or approve.',
  steps:['Open '+pth(me.role==='admin'?'Profile › E-signature':'User settings › E-signature')+'.','Drag an image of your signature into the box, or click it to choose a file.','Save. New PDFs will include it.'],link:['profile.html#sig','Open E-signature']},
 {id:'bell',cat:'Your account',roles:AB,ic:'bell',t:'Use notifications',s:'The bell at the top shows what is new.',
  steps:['Click the bell. New items are highlighted.','Admins see activity across the system; basic users see when their requests are approved or declined.','Click a notification to go straight to the page.']}
];

const F=[
 {q:'Why can I not release or request a product?',a:'It is probably expired. Expired items are on hold until an admin approves an exception for that expiration date. Ask an admin, or check the status on the product row.',roles:ALL},
 {q:'I forgot my password. What now?',a:'Ask an admin to reset it. You will get a temporary password and be asked to choose your own the next time you sign in.',roles:ALL},
 {q:'My request is still pending. Who approves it?',a:'Only admins can approve a request. Admins see waiting requests on their Dashboard and under Transaction › Transaction requests. You are notified when it is decided.',roles:['basic']},
 {q:'Where do I find the PDF of a release?',a:'Open Transaction › Your Transaction or Approved transactions and click PDF on the row. Only approved transactions have a PDF.',roles:AB},
 {q:'Why is there no Transaction page for me?',a:'View-only accounts can see the Dashboard and Warehouse but cannot request or release stock. Ask an admin if you need a different role.',roles:['view']},
 {q:'Can the same product exist in both warehouses?',a:'Yes. Warehouse 1 and Warehouse 2 keep separate records, so the same name and SKU can be in both with their own quantities.',roles:ALL},
 {q:'Who can see the cost per unit?',a:'Only admins. It is stored with the product but hidden from basic and view-only accounts.',roles:ALL},
 {q:'Why does a product say Set lead time or Not enough data?',a:'A reorder point needs a lead time on the product and at least 3 releases to learn the average daily use. You can also type an alert level to skip the calculation.',roles:AD},
 {q:'Why was I signed out?',a:'Sessions last 8 hours. Sign in again and carry on. After 8 wrong password tries from one device, sign-in pauses for 10 minutes.',roles:ALL},
 {q:'What is the difference between the four transaction types?',a:'<b>Trading</b>: buy and resell as-is. <b>Repacking</b>: split bulk material into smaller units. <b>Blending</b>: combine several raw materials into one finished product. <b>Others</b>: any other reason, written in the notes.',roles:AB},
 {q:'Can I get my stock data into Excel?',a:'Yes. Use Export CSV on the Warehouse (the rows you see), on the Reorder list and on History (admins), and Export report on the Dashboard. The files open in Excel and Google Sheets.',roles:ALL},
 {q:'Do I need to refresh the page to see new data?',a:'No. Pages load the latest data when you open them, and the bell checks for new activity by itself.',roles:ALL}
];

const strip=h=>String(h).replace(/<[^>]+>/g,' ').toLowerCase();
const hasQ=(...parts)=>!q.trim()||strip(parts.join(' ')).includes(q.trim().toLowerCase());
const mineG=()=>mkG().filter(g=>g.roles.includes(me.role)),mineF=()=>F.filter(f=>f.roles.includes(me.role));

// ---------- shared pieces ----------
function hpHead(){
 const H={start:['Help centre','Short guides, answers and what each status means.'],guides:['How-to guides','Step by step, for what your role can do.'],faq:['Frequently asked questions','Quick answers to the things people ask most.']}[tab];
 const search=tab==='start'?'':`<label class="hpq"><span class="sr">Search help</span>${ic('search')}<input id="hp_q" type="search" placeholder="${tab==='faq'?'Search the questions':'Search the guides'}" value="${esc(q)}" oninput="q=this.value;hpT()" autocomplete="off"></label>`;
 return `<section class="hero sm"><div class="hl"><p class="eyebrow">Help</p><h2>${H[0]}</h2><p class="sub">${H[1]}</p>${search}</div><span class="hpmark" aria-hidden="true">${ic('help')}</span></section>`}

function acc(id,icon,title,sum,body,open){
 return `<details class="hpd" id="g_${id}"${open?' open':''}><summary><span class="tic">${ic(icon)}</span><span class="hpt"><b>${title}</b>${sum?`<small>${sum}</small>`:''}</span></summary><div class="hpb">${body}</div></details>`}
const gBody=g=>`<ol class="hps">${g.steps.map(s=>`<li>${s}</li>`).join('')}</ol>${g.link?`<p class="hpgo"><a class="btn ghost sm" href="${g.link[0]}">${g.link[1]}</a></p>`:''}`;
const none=(t,s)=>`<div class="card"><div class="empty"><span class="tic">${ic('search')}</span><b>${t}</b><span>${s}</span></div></div>`;

// ---------- Quick start ----------
function hpStart(){
 const steps={
  admin:[['Check the Dashboard','See what needs attention: expiring items, low stock, reorders and requests waiting for you.','dashboard.html'],['Keep the Warehouse current','Add stock as it arrives and keep minimums, lead times and expiry dates up to date.','warehouse.html#all'],['Release and approve','Release stock from Transaction, approve requests, and download the PDF.','transaction.html#form']],
  basic:[['Find what you need','Search the Warehouse for the item and check how much is in stock.','warehouse.html#all'],['Send a request','Fill in the Request form. An admin reviews it before any stock moves.','transaction.html#form'],['Track it and get the PDF','Watch the status under Your Transaction and download the PDF once approved.','transaction.html#mine']],
  view:[['See the big picture','The Dashboard shows stock health, what is low and what is expiring.','dashboard.html'],['Browse the Warehouse','Search and filter every product, with its location, quantity and expiry.','warehouse.html#all'],['Need more access?','Ask an admin to change your role if you also have to request or release stock.','profile.html']]
 }[me.role];
 const popular=mineG().slice(0,6);
 const legend=[['In stock','ok','Above the minimum level.'],['Low stock','warn','At or below the minimum level.'],['Expires in 30d','warn','45 days or fewer left.'],['On hold · expired','bad','Cannot be released until an admin approves an exception.'],
  ...(me.role==='view'?[]:[['Pending','warn','Waiting for an admin to decide.'],['Approved','ok','Stock released; the PDF is ready.'],['Rejected','bad','An admin declined the request.']])];
 const roles=[['admin','Admin','Adds and releases stock, approves requests and manages accounts.'],['basic','Basic user','Views the warehouse and sends pull-out requests.'],['view','View-only','Views the dashboard and warehouse only.']];
 return `<div class="hpsec"><h3>Start here</h3><span class="mut">${ROLE[me.role]}</span></div>
 <div class="hpg3">${steps.map((s,i)=>`<a class="card hpst" href="${s[2]}"><span class="txn">${i+1}</span><b>${s[0]}</b><span class="mut">${s[1]}</span><span class="lk">Open ›</span></a>`).join('')}</div>
 <div class="hpsec"><h3>Popular guides</h3><button class="lnk lk hpbtn" onclick="hpTab('guides')">See all guides</button></div>
 <div class="hpg">${popular.map(g=>`<button class="card hpc tone-b" onclick="openG('${g.id}')"><span class="kic">${ic(g.ic)}</span><span><b>${g.t}</b><small>${g.s}</small></span></button>`).join('')}</div>
 <div class="dg2 dgap" style="margin-top:22px"><div class="card"><div class="ph"><h3>What the labels mean</h3></div>${legend.map(l=>`<div class="hpl">${tag(l[0],l[1])}<span class="mut">${l[2]}</span></div>`).join('')}</div>
 <div class="card"><div class="ph"><h3>What each role can do</h3></div>${roles.map(r=>`<div class="hpl"><span><span class="rl ${r[0]}">${r[1]}</span>${r[0]===me.role?'<span class="you">You</span>':''}</span><span class="mut">${r[2]}</span></div>`).join('')}<p class="mut" style="margin:14px 0 0;font-size:13px">Roles are set by an admin. Still stuck? Ask an admin to help.</p></div></div>`}

// ---------- Guides and FAQ ----------
function hpBody(){
 if(tab==='faq'){const L=mineF().filter(f=>hasQ(f.q,f.a));
  return L.length?`<div class="hplist">${L.map((f,i)=>acc('f'+i,'qa',f.q,'',`<p>${f.a}</p>`,false)).join('')}</div>`:none('No questions match','Try different words, or look in the How-to guides.')}
 const base=mineG(),cats=[...new Set(base.map(g=>g.cat))];
 if(hcat!=='all'&&!cats.includes(hcat))hcat='all';
 const L=base.filter(g=>(hcat==='all'||g.cat===hcat)&&hasQ(g.t,g.s,g.steps.join(' ')));
 const seg=`<div class="seg hpseg" role="group" aria-label="Guide topics">${[['all','All',base.length],...cats.map(c=>[c,c,base.filter(g=>g.cat===c).length])].map(([k,l,n])=>`<button class="${k===hcat?'on':''}" aria-pressed="${k===hcat}" onclick="hcat='${k}';hpT()">${l}<span class="nb">${n}</span></button>`).join('')}</div>`;
 return seg+(L.length?`<div class="hplist">${L.map(g=>acc(g.id,g.ic,g.t,g.s,gBody(g),HOPEN===g.id||(!!q.trim()&&L.length===1))).join('')}</div>`:none('No guides match','Try different words, or pick another topic.'))}
function hpT(){const b=$('#hpbody');if(b)b.innerHTML=hpBody()}
function hpTab(t){tab=t;q='';history.replaceState(null,'','#'+t);render()}
function openG(id){hcat='all';HOPEN=id;hpTab('guides')}

PAGES.help=()=>hpHead()+(tab==='start'?hpStart():`<div id="hpbody">${hpBody()}</div>`);
window.afterRender=()=>{if(HOPEN){const el=document.getElementById('g_'+HOPEN);if(el)el.scrollIntoView({block:'center'});HOPEN=''}};
