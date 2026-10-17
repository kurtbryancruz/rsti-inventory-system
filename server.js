// RSTI Inventory — Express + RoenDB (SQLite via built-in node:sqlite, needs Node 22.13+)
const express = require('express');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.SESSION_SECRET || 'change-this-secret-before-going-online';
const init = require('./db/init');
const { releasePdf } = require('./pdf');
const COMPANY = process.env.COMPANY || 'Roentgen Separation Technologie Inc.';
const db = init.open(process.env.DB_FILE || path.join(__dirname, 'RoenDB.db'));

const ROLES = ['admin', 'basic', 'view'];
const TYPES = ['Trading', 'Repacking', 'Blending', 'Others'];
const WAREHOUSES = ['Warehouse 1', 'Warehouse 2'];
// Expired items are on hold (cannot be released) until an admin approves an exception.
// The exception only counts for the expiry date it was approved for, so a new date lifts it.
const today = () => new Date().toISOString().slice(0, 10);
const excOk = p => !!p.exp && p.exc_exp === p.exp;
const onHold = p => !!p.exp && p.exp < today() && !excOk(p);
const holdMsg = p => `${p.name} (${p.warehouse}) is expired and on hold. An admin must approve an exception before it can be released.`;
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(cookieSession({ name: 'rsti', keys: [SECRET], maxAge: 8 * 3600 * 1000, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' }));

const wrap = fn => (req, res) => { try { fn(req, res); } catch (e) { res.status(400).json({ error: e.message }); } };
const auth = (...roles) => (req, res, next) => {
  const u = req.session.uid && db.prepare('SELECT * FROM users WHERE id=?').get(req.session.uid);
  if (!u || !u.active || (req.session.sv || 0) !== u.sv) return res.status(401).json({ error: 'Please sign in.' });
  if (roles.length && !roles.includes(u.role)) return res.status(403).json({ error: 'Your role cannot do this.' });
  req.u = u; next();
};
const pub = u => ({ id: u.id, name: u.name, user: u.user, role: u.role, sig: u.sig, dept: u.dept, active: !!u.active, must_change: !!u.must_change });
const log = (who, action, detail, type = null, out = null, rid = null) =>
  db.prepare('INSERT INTO log(t,who,action,detail,type,out,rid) VALUES(?,?,?,?,?,?,?)').run(Date.now(), who, action, detail, type, out, rid);

// Slow down password guessing: 8 failed tries per IP, then a 10 minute pause.
const fails = new Map();
app.post('/api/login', wrap((req, res) => {
  const f = fails.get(req.ip) || { n: 0, t: 0 };
  if (f.n >= 8 && Date.now() - f.t < 600000) return res.status(429).json({ error: 'Too many attempts. Try again in 10 minutes.' });
  const u = db.prepare('SELECT * FROM users WHERE user=?').get(String(req.body.user || '').trim());
  if (!u || !bcrypt.compareSync(String(req.body.pw || ''), u.pw)) {
    fails.set(req.ip, { n: f.n + 1, t: Date.now() });
    return res.status(401).json({ error: 'Wrong username or password.' });
  }
  if (!u.active) return res.status(403).json({ error: 'This account is disabled. Please ask an admin.' });
  fails.delete(req.ip); req.session.uid = u.id; req.session.sv = u.sv; res.json({ ok: true });
}));
app.post('/api/logout', (req, res) => { req.session = null; res.json({ ok: true }); });

app.get('/api/state', auth(), (req, res) => {
  const u = req.u, adm = u.role === 'admin';
  const usage = adm ? usageMap() : null;
  const products = db.prepare("SELECT id,name,code,warehouse,rack,floor_area,sku,(qr<>'') AS has_qr,item_type,unit,qty,min_qty,description,exp,supplier,batch,purchase_date,cost,lead_days,safety_days,added_at AS _a,exc_exp,exc_by,exc_reason,exc_at,added_by,modified_by,added_at,modified_at FROM products ORDER BY name").all()
    .map(p => ({ id: p.id, name: p.name, code: p.code, warehouse: p.warehouse, rack: p.rack, floor: p.floor_area, sku: p.sku, hasQr: !!p.has_qr, item_type: p.item_type, unit: p.unit, qty: p.qty, min: p.min_qty, description: p.description, exp: p.exp,
      supplier: p.supplier, batch: p.batch, purchase_date: p.purchase_date, exc: excOk(p),
      // Cost and the exception details are for admins only.
      ...(adm ? { cost: p.cost, lead: p.lead_days, safety: p.safety_days, ...useOf(p, usage), exc_by: excOk(p) ? p.exc_by : '', exc_reason: excOk(p) ? p.exc_reason : '', exc_at: excOk(p) ? p.exc_at : 0 } : {}),
      added_by: p.added_by, modified_by: p.modified_by, added_at: p.added_at, modified_at: p.modified_at }));
  // Non-admins only get release totals (for the dashboard trend), not who or what.
  const logRows = adm
    ? db.prepare('SELECT * FROM log ORDER BY id DESC LIMIT 500').all().map(r => ({ t: r.t, by: r.who, action: r.action, detail: r.detail, type: r.type, out: r.out, rid: r.rid }))
    : db.prepare('SELECT t,type,out FROM log WHERE out IS NOT NULL AND t>? ORDER BY id DESC').all(Date.now() - 8 * 864e5).map(r => ({ t: r.t, type: r.type, out: r.out, by: '', action: '', detail: '' }));
  const rq = adm ? db.prepare('SELECT * FROM requests ORDER BY id DESC LIMIT 200').all()
    : u.role === 'basic' ? db.prepare('SELECT * FROM requests WHERE uid=? ORDER BY id DESC LIMIT 200').all(u.id) : [];
  res.json({
    me: pub(u), products, log: logRows, top: topUsed(),
    // Every release in the last 90 days as [time, units, type]. Drives the dashboard chart for all roles.
    rel: db.prepare('SELECT t,out,type FROM log WHERE out IS NOT NULL AND t>? ORDER BY t').all(Date.now() - 91 * 864e5).map(r => [r.t, r.out, r.type]),
    requests: rq.map(r => ({ id: r.id, type: r.type, c: r.c, n: r.n, items: JSON.parse(r.items), target: r.target, by: r.who, st: r.st, rid: r.rid, t: r.t, dec_by: r.dec_by, dec_at: r.dec_at })),
    users: adm ? db.prepare('SELECT * FROM users ORDER BY id').all().map(pub) : undefined
  });
});

// Dashboard: the 10 items released most often in the last 90 days (everyone sees this, no names of people).
function topUsed() {
  const m = new Map();
  for (const r of db.prepare('SELECT items FROM releases WHERE t>=?').all(Date.now() - USE_DAYS * DAY))
    for (const i of JSON.parse(r.items)) { const e = m.get(i.id) || { n: 0, q: 0 }; e.n += 1; e.q += Number(i.q) || 0; m.set(i.id, e); }
  const P = new Map(db.prepare('SELECT id,name,unit,code FROM products').all().map(p => [p.id, p]));
  return [...m].filter(([id]) => P.has(id)).map(([id, e]) => ({ id, name: P.get(id).name, unit: P.get(id).unit, code: P.get(id).code, n: e.n, q: e.q }))
    .sort((a, b) => b.n - a.n || b.q - a.q || a.name.localeCompare(b.name)).slice(0, 10);
}

// Notifications, by role. Admin: everything that happens in the system. Basic: their own requests being approved or declined.
// View-only: none. "Unread" = every event after the user last opened the bell, including the user's own actions
// (so the number confirms that something was saved).
const notifLink = a => /^Released/.test(a) ? 'history.html#out' : a === 'Pull-in' ? 'history.html#in' : a === 'Pull-out requested' ? 'transaction.html#req'
  : a === 'Request rejected' ? 'transaction.html#done' : /^Account|^Role|^Password/.test(a) ? 'accounts.html#list' : /^Expiry/.test(a) ? 'warehouse.html#exp' : /^Event/.test(a) ? 'calendar.html'
  : a === 'Product edited' ? 'warehouse.html#all' : 'history.html#all';
function notifFeed(u) {
  const items = [];
  if (u.role === 'admin') {
    for (const r of db.prepare('SELECT * FROM log ORDER BY id DESC LIMIT 40').all())
      items.push({ t: r.t, text: `${r.who}: ${r.action}`, sub: r.detail, link: notifLink(r.action), kind: /rejected/i.test(r.action) ? 'bad' : /^Released/.test(r.action) ? 'ok' : 'n' });
  } else if (u.role === 'basic') {
    for (const r of db.prepare("SELECT * FROM requests WHERE uid=? AND st IN ('approved','rejected') ORDER BY dec_at DESC, id DESC LIMIT 40").all(u.id)) {
      const t = r.dec_at || r.t; if (!t) continue;
      const ok = r.st === 'approved';
      items.push({ t, text: ok ? 'Your request was approved' : 'Your request was declined', sub: `${r.type}: ${JSON.parse(r.items).map(i => i.n).join(', ')}${r.dec_by ? ' · by ' + r.dec_by : ''}`, link: 'transaction.html#mine', kind: ok ? 'ok' : 'bad' });
    }
  }
  return items.sort((a, b) => b.t - a.t);
}
app.get('/api/notifications', auth(), wrap((req, res) => {
  let seen = req.u.notif_seen;
  if (!seen) { seen = Date.now(); db.prepare('UPDATE users SET notif_seen=? WHERE id=?').run(seen, req.u.id); }   // first visit: nothing is "new" yet
  const items = notifFeed(req.u);
  res.json({ items, unread: items.filter(i => i.t > seen).length, seen, role: req.u.role });
}));
app.post('/api/notifications/seen', auth(), wrap((req, res) => {
  db.prepare('UPDATE users SET notif_seen=? WHERE id=?').run(Date.now(), req.u.id); res.json({ ok: true });
}));

const UNITS = ['kg', 'L', 'pcs'];
function readDate(v, label) {
  const d = String(v || '');
  if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`Pick a valid ${label}.`);
  return d;
}
function readCost(v) {
  if (v === '' || v == null) return null;
  const c = Number(v);
  if (!(c >= 0)) throw new Error('Enter a cost of 0 or more.');
  return c;
}
function readDays(v, label) {
  if (v === '' || v == null) return null;
  const d = Number(v);
  if (!(d >= 0) || d > 3650) throw new Error(`Enter ${label} as a number of days (0 or more).`);
  return d;
}
// Reorder points: average daily usage per product from its releases in the last 90 days.
// A product added recently is averaged over the days it has existed (at least 7), so new items are not understated.
const USE_DAYS = 90, DAY = 864e5;
function usageMap() {
  const now = Date.now(), m = new Map();
  for (const r of db.prepare('SELECT items FROM releases WHERE t>=?').all(now - USE_DAYS * DAY))
    for (const i of JSON.parse(r.items)) { const e = m.get(i.id) || { q: 0, n: 0 }; e.q += Number(i.q) || 0; e.n += 1; m.set(i.id, e); }
  return m;
}
function useOf(p, m) {
  const now = Date.now(), e = m.get(p.id) || { q: 0, n: 0 };
  const start = Math.max(now - USE_DAYS * DAY, p._a || 0), days = Math.max(7, Math.ceil((now - start) / DAY));
  return { use_day: e.q / days, use_n: e.n };
}
// Required: name, warehouse, SKU, type, quantity. Everything else can be left empty.
function readProduct(b, id) {
  const name = String(b.name || '').trim();
  if (!name) throw new Error('Enter the product name.');
  const warehouse = String(b.warehouse || '');
  if (!WAREHOUSES.includes(warehouse)) throw new Error('Pick the warehouse.');
  const sku = String(b.sku || '').trim();
  if (!sku) throw new Error('Enter the SKU (master code).');
  const item_type = String(b.item_type || '').trim().slice(0, 40);
  if (!item_type) throw new Error('Describe the type of item.');
  const unit = UNITS.includes(b.unit) ? b.unit : 'kg';
  const qty = Number(b.qty);
  if (b.qty === '' || b.qty == null || !(qty >= 0)) throw new Error('Enter a quantity of 0 or more.');
  const min_qty = Math.max(0, Number(b.min) || 0);
  const description = String(b.description || '').trim().slice(0, 1000);
  const exp = readDate(b.exp, 'expiration date');
  const purchase_date = readDate(b.purchase_date, 'purchase date');
  const rack = String(b.rack || '').trim().slice(0, 40);
  const floor_area = String(b.floor || '').trim().slice(0, 60);
  const supplier = String(b.supplier || '').trim().slice(0, 120);
  const batch = String(b.batch || '').trim().slice(0, 60);
  const cost = readCost(b.cost);
  const lead_days = readDays(b.lead, 'lead time'), safety_days = readDays(b.safety, 'safety days') ?? 0;
  if (db.prepare('SELECT 1 FROM products WHERE lower(name)=lower(?) AND warehouse=? AND id IS NOT ?').get(name, warehouse, id ?? null)) throw new Error(`A product with that name already exists in ${warehouse}.`);
  if (db.prepare('SELECT 1 FROM products WHERE lower(sku)=lower(?) AND warehouse=? AND id IS NOT ?').get(sku, warehouse, id ?? null)) throw new Error(`That SKU is already used by another product in ${warehouse}.`);
  let qr;
  if (b.qr !== undefined) {
    if (b.qr !== '' && (typeof b.qr !== 'string' || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(b.qr) || b.qr.length > 700000)) throw new Error('The QR code photo must be a PNG or JPG under 500 KB.');
    qr = b.qr;
  }
  return { name, warehouse, rack, floor_area, sku, item_type, unit, qty, min_qty, description, exp, supplier, batch, purchase_date, cost, lead_days, safety_days, qr };
}
const where = f => `${f.warehouse}${f.rack ? ', rack ' + f.rack : ''}${f.floor_area ? ', floor area ' + f.floor_area : ''}`;

// Adding a new product is a pull-in: it records the items received and puts them in stock.
app.post('/api/products', auth('admin'), wrap((req, res) => {
  const f = readProduct(req.body, null);
  db.prepare('INSERT INTO products(code,name,warehouse,rack,floor_area,sku,qr,item_type,unit,qty,min_qty,description,exp,supplier,batch,purchase_date,cost,lead_days,safety_days,added_by,modified_by,added_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(init.newCode(db), f.name, f.warehouse, f.rack, f.floor_area, f.sku, f.qr || '', f.item_type, f.unit, f.qty, f.min_qty, f.description, f.exp, f.supplier, f.batch, f.purchase_date, f.cost, f.lead_days, f.safety_days, req.u.name, '-', Date.now());
  log(req.u.name, 'Pull-in', `New product: ${f.qty} ${f.unit} of ${f.name} (${f.sku}) received at ${where(f)}${f.batch ? ', batch ' + f.batch : ''}${f.supplier ? ', from ' + f.supplier : ''}${f.exp ? ', expires ' + f.exp : ''}`);
  res.json({ ok: true });
}));

// Pull-in for a product that already exists: the quantity received is added to the stock on hand.
app.post('/api/products/:id/pullin', auth('admin'), wrap((req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!p) throw new Error('Product not found.');
  const q = Number(req.body.qty);
  if (!(q > 0)) throw new Error('Enter the quantity received (more than 0).');
  const supplier = String(req.body.supplier || '').trim().slice(0, 120) || p.supplier;
  const batch = String(req.body.batch || '').trim().slice(0, 60) || p.batch;
  const purchase_date = readDate(req.body.purchase_date, 'purchase date') || p.purchase_date;
  const exp = readDate(req.body.exp, 'expiration date') || p.exp;
  const c = readCost(req.body.cost), cost = c === null ? p.cost : c;
  const total = p.qty + q;
  db.prepare('UPDATE products SET qty=?,supplier=?,batch=?,purchase_date=?,exp=?,cost=?,modified_by=?,modified_at=? WHERE id=?')
    .run(total, supplier, batch, purchase_date, exp, cost, req.u.name, Date.now(), p.id);
  log(req.u.name, 'Pull-in', `+${q} ${p.unit} ${p.name} (${p.warehouse}), now ${total} ${p.unit}${batch ? ', batch ' + batch : ''}${supplier ? ', from ' + supplier : ''}${exp !== p.exp ? ', new expiry ' + exp : ''}`);
  res.json({ ok: true });
}));

app.put('/api/products/:id', auth('admin'), wrap((req, res) => {
  const old = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!old) throw new Error('Product not found.');
  const f = readProduct(req.body, old.id), ch = [];
  const cmp = (label, a, b) => { if (String(a) !== String(b)) ch.push(`${label}: ${a || '-'} → ${b || '-'}`); };
  cmp('Name', old.name, f.name); cmp('Warehouse', old.warehouse, f.warehouse); cmp('Rack', old.rack, f.rack); cmp('Floor area', old.floor_area, f.floor_area);
  cmp('SKU', old.sku, f.sku); cmp('Type', old.item_type, f.item_type);
  cmp('Quantity', `${old.qty} ${old.unit}`, `${f.qty} ${f.unit}`); cmp('Alert level', old.min_qty, f.min_qty); cmp('Expiry', old.exp, f.exp);
  cmp('Supplier', old.supplier, f.supplier); cmp('Batch', old.batch, f.batch); cmp('Purchase date', old.purchase_date, f.purchase_date); cmp('Cost', old.cost, f.cost); cmp('Lead time (days)', old.lead_days, f.lead_days); cmp('Safety days', old.safety_days, f.safety_days);
  if (old.description !== f.description) ch.push('Description updated');
  if (f.qr !== undefined && f.qr !== old.qr) ch.push(f.qr ? 'QR code replaced' : 'QR code removed');
  if (!ch.length) return res.json({ ok: true, unchanged: true });
  db.prepare('UPDATE products SET name=?,warehouse=?,rack=?,floor_area=?,sku=?,qr=?,item_type=?,unit=?,qty=?,min_qty=?,description=?,exp=?,supplier=?,batch=?,purchase_date=?,cost=?,lead_days=?,safety_days=?,modified_by=?,modified_at=? WHERE id=?')
    .run(f.name, f.warehouse, f.rack, f.floor_area, f.sku, f.qr === undefined ? old.qr : f.qr, f.item_type, f.unit, f.qty, f.min_qty, f.description, f.exp, f.supplier, f.batch, f.purchase_date, f.cost, f.lead_days, f.safety_days, req.u.name, Date.now(), old.id);
  log(req.u.name, 'Product edited', `${old.name}: ${ch.join('; ')}`);
  res.json({ ok: true });
}));

// An admin can approve (or take back) an exception so one expired product can still be released.
app.post('/api/products/:id/exception', auth('admin'), wrap((req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!p) throw new Error('Product not found.');
  if (req.body.approve) {
    if (!p.exp || p.exp >= today()) throw new Error('This item is not expired.');
    const reason = String(req.body.reason || '').trim().slice(0, 300);
    if (!reason) throw new Error('Enter the reason for the exception.');
    db.prepare('UPDATE products SET exc_exp=?,exc_by=?,exc_reason=?,exc_at=? WHERE id=?').run(p.exp, req.u.name, reason, Date.now(), p.id);
    log(req.u.name, 'Expiry exception approved', `${p.name} (${p.warehouse}), expired ${p.exp}. Reason: ${reason}`);
  } else {
    db.prepare("UPDATE products SET exc_exp='',exc_by='',exc_reason='',exc_at=0 WHERE id=?").run(p.id);
    log(req.u.name, 'Expiry exception removed', `${p.name} (${p.warehouse}) is back on hold`);
  }
  res.json({ ok: true });
}));

app.get('/api/products/:id/qr', auth(), (req, res) => {
  const p = db.prepare('SELECT qr FROM products WHERE id=?').get(req.params.id);
  const m = p && /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(p.qr);
  if (!m) return res.status(404).end();
  res.type(m[1]).set('Cache-Control', 'private, max-age=3600').send(Buffer.from(m[2], 'base64'));
});

// Rules that depend on the transaction type: Repacking says what each item becomes, Blending names the finished product (2+ ingredients).
function checkTx(type, n, items, target) {
  if (!TYPES.includes(type)) throw new Error('Pick a transaction type.');
  if (type === 'Others' && !String(n || '').trim()) throw new Error('Add a reason in the notes.');
  if (!Array.isArray(items) || !items.length) throw new Error('Add at least one item.');
  if (type === 'Repacking' && items.some(i => !String(i.into || '').trim())) throw new Error('Say what each item is repacked into.');
  if (type === 'Blending') {
    if (!String(target || '').trim()) throw new Error('Enter the finished product name.');
    if (new Set(items.map(i => String(i.id))).size < 2) throw new Error('Blending needs at least two different ingredients.');
  }
}
const intoOf = (type, i) => (type === 'Repacking' ? String(i.into || '').trim().slice(0, 80) : '');
const targetOf = (type, t) => (type === 'Blending' ? String(t || '').trim().slice(0, 80) : '');
const txText = (type, items, target) => items.map(i => `${i.q} ${i.u} ${i.n}${i.w ? ' (' + i.w + ')' : ''}${i.into ? ' into ' + i.into : ''}`).join(', ') + (target ? ` -> blended into ${target}` : '');

function release({ type, c, n, items, target, who, actor, reqName, reqUid, relUid }) {
  checkTx(type, n, items, target);
  target = targetOf(type, target);
  db.exec('BEGIN');
  try {
    const out = [];
    for (const i of items) {
      const p = db.prepare('SELECT * FROM products WHERE id=?').get(i.id), q = +i.q;
      if (!p || !(q > 0)) throw new Error('Invalid item.');
      if (onHold(p)) throw new Error(holdMsg(p));
      const already = out.filter(o => o.id === p.id).reduce((a, o) => a + o.q, 0);
      if (p.qty < q + already) throw new Error(`Not enough ${p.name} in stock.`);
      out.push({ id: p.id, n: p.name, sku: p.sku, w: p.warehouse, u: p.unit, q, ...(intoOf(type, i) ? { into: intoOf(type, i) } : {}) });
    }
    for (const i of out) db.prepare('UPDATE products SET qty=qty-?, modified_by=?, modified_at=? WHERE id=?').run(i.q, actor, Date.now(), i.id);
    const rid = Number(db.prepare('INSERT INTO releases(t,type,c,n,target,items,req_name,req_uid,rel_name,rel_uid) VALUES(?,?,?,?,?,?,?,?,?,?)')
      .run(Date.now(), type, c || '', n || '', target, JSON.stringify(out), reqName, reqUid, actor, relUid).lastInsertRowid);
    log(who, 'Released · ' + type, txText(type, out, target) + (c ? ` · ${c}` : '') + (n ? ` · ${n}` : ''), type, out.reduce((a, i) => a + i.q, 0), rid);
    db.exec('COMMIT');
    return rid;
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}
app.post('/api/release', auth('admin'), wrap((req, res) => {
  const rid = release({ ...req.body, who: req.u.name, actor: req.u.name, reqName: req.u.name, reqUid: req.u.id, relUid: req.u.id });
  res.json({ ok: true, rid });
}));

app.post('/api/requests', auth('basic'), wrap((req, res) => {
  const { type, c, n, items } = req.body;
  checkTx(type, n, items, req.body.target);
  const target = targetOf(type, req.body.target);
  const clean = items.map(i => {
    const p = db.prepare('SELECT * FROM products WHERE id=?').get(i.id);
    if (!p || !(+i.q > 0)) throw new Error('Invalid item.');
    if (onHold(p)) throw new Error(holdMsg(p));
    return { id: p.id, n: p.name, u: p.unit, q: +i.q, ...(intoOf(type, i) ? { into: intoOf(type, i) } : {}) };
  });
  db.prepare('INSERT INTO requests(type,c,n,target,items,who,uid,t) VALUES(?,?,?,?,?,?,?,?)').run(type, c || '', n || '', target, JSON.stringify(clean), req.u.name, req.u.id, Date.now());
  log(req.u.name, 'Pull-out requested', `${type}: ${txText(type, clean, target)}`);
  res.json({ ok: true });
}));
app.post('/api/requests/:id/decide', auth('admin'), wrap((req, res) => {
  const r = db.prepare('SELECT * FROM requests WHERE id=?').get(req.params.id);
  if (!r || r.st !== 'pending') throw new Error('This request was already handled.');
  const items = JSON.parse(r.items);
  if (req.body.approve) {
    const rid = release({ type: r.type, c: r.c, n: r.n, items, target: r.target, who: `${r.who} (approved by ${req.u.name})`, actor: req.u.name, reqName: r.who, reqUid: r.uid, relUid: req.u.id });
    db.prepare("UPDATE requests SET st='approved', rid=?, dec_by=?, dec_at=? WHERE id=?").run(rid, req.u.name, Date.now(), r.id);
    return res.json({ ok: true, rid });
  } else {
    db.prepare("UPDATE requests SET st='rejected', dec_by=?, dec_at=? WHERE id=?").run(req.u.name, Date.now(), r.id);
    log(req.u.name, 'Request rejected', `${r.who}: ${items.map(i => i.n).join(', ')}`);
  }
  res.json({ ok: true });
}));

const readDept = v => { const d = String(v || '').trim(); if (d.length > 60) throw new Error('Department is too long (60 characters at most).'); return d; };
const readUsername = (v, selfId = 0) => {
  const user = String(v || '').trim();
  if (!user) throw new Error('Enter a username.');
  if (db.prepare('SELECT 1 FROM users WHERE user=? AND id<>?').get(user, selfId)) throw new Error('That username is taken.');
  return user;
};
const readPw = v => { const pw = String(v || ''); if (pw.length < 6) throw new Error('Password needs 6+ characters.'); return pw; };

app.post('/api/users', auth('admin'), wrap((req, res) => {
  const { name, pw, role } = req.body;
  if (!String(name || '').trim()) throw new Error('Fill all fields. Password needs 6+ characters.');
  const user = readUsername(req.body.user), dept = readDept(req.body.dept);
  readPw(pw);
  if (!ROLES.includes(role)) throw new Error('Pick a role.');
  db.prepare('INSERT INTO users(name,user,pw,role,dept,must_change) VALUES(?,?,?,?,?,?)').run(name.trim(), user, bcrypt.hashSync(pw, 10), role, dept, req.body.force === false ? 0 : 1);
  log(req.u.name, 'Account created', `${name.trim()} (${role})${dept ? ', ' + dept : ''}`);
  res.json({ ok: true });
}));
// Manage an account: name, username, department, role. You cannot change your own role.
app.put('/api/users/:id', auth('admin'), wrap((req, res) => {
  const t = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!t) throw new Error('User not found.');
  const name = String(req.body.name || '').trim();
  if (!name) throw new Error('Name cannot be empty.');
  const user = readUsername(req.body.user, t.id), dept = readDept(req.body.dept), role = req.body.role === undefined ? t.role : req.body.role;
  if (!ROLES.includes(role)) throw new Error('Pick a role.');
  if (role !== t.role && t.id === req.u.id) throw new Error('You cannot change your own role.');
  const ch = [];
  if (name !== t.name) ch.push(`name ${t.name} -> ${name}`);
  if (user !== t.user) ch.push(`username ${t.user} -> ${user}`);
  if (dept !== t.dept) ch.push(`department ${t.dept || 'none'} -> ${dept || 'none'}`);
  db.prepare('UPDATE users SET name=?,user=?,dept=?,role=? WHERE id=?').run(name, user, dept, role, t.id);
  if (ch.length) log(req.u.name, 'Account edited', `${t.name}: ${ch.join('; ')}`);
  if (role !== t.role) log(req.u.name, 'Role changed', `${name} is now ${role}`);
  res.json({ ok: true });
}));
// Reset a password. The user is signed out everywhere and, unless the admin unticks it, must pick their own password at next sign-in.
app.post('/api/users/:id/reset-password', auth('admin'), wrap((req, res) => {
  const t = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!t) throw new Error('User not found.');
  if (t.id === req.u.id) throw new Error('Change your own password in your profile.');
  db.prepare('UPDATE users SET pw=?, must_change=?, sv=sv+1 WHERE id=?').run(bcrypt.hashSync(readPw(req.body.pw), 10), req.body.force === false ? 0 : 1, t.id);
  log(req.u.name, 'Password reset', `${t.name} (${t.user})`);
  res.json({ ok: true });
}));
// Disable or enable an account. A disabled account cannot sign in and is signed out at once; its history stays.
app.put('/api/users/:id/active', auth('admin'), wrap((req, res) => {
  const t = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!t) throw new Error('User not found.');
  if (t.id === req.u.id) throw new Error('You cannot disable your own account.');
  const on = req.body.active ? 1 : 0;
  db.prepare('UPDATE users SET active=?, sv=sv+1 WHERE id=?').run(on, t.id);
  log(req.u.name, on ? 'Account enabled' : 'Account disabled', `${t.name} (${t.user})`);
  res.json({ ok: true });
}));

app.put('/api/me', auth(), wrap((req, res) => {
  const { name, pw, sig } = req.body;
  if (name !== undefined) { if (!String(name).trim()) throw new Error('Name cannot be empty.'); db.prepare('UPDATE users SET name=? WHERE id=?').run(String(name).trim(), req.u.id); }
  if (pw) {
    if (pw.length < 6) throw new Error('Password needs 6+ characters.');
    if (req.u.must_change && bcrypt.compareSync(pw, req.u.pw)) throw new Error('Choose a different password than the temporary one.');
    db.prepare('UPDATE users SET pw=?, must_change=0 WHERE id=?').run(bcrypt.hashSync(pw, 10), req.u.id);
  }
  if (sig !== undefined) {
    if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(sig) || sig.length > 700000) throw new Error('Signature must be a PNG or JPG under 500 KB.');
    db.prepare('UPDATE users SET sig=? WHERE id=?').run(sig, req.u.id);
  }
  res.json({ ok: true });
}));

// Data for the pull-out receipt / PDF. Admins can open any receipt; a user only their own.
function releaseData(id, u) {
  const r = db.prepare('SELECT * FROM releases WHERE id=?').get(id);
  if (!r) throw new Error('Receipt not found.');
  if (u.role !== 'admin' && r.req_uid !== u.id) return null;
  const sig = uid => (db.prepare('SELECT sig FROM users WHERE id=?').get(uid) || {}).sig || '';
  return { id: r.id, t: r.t, type: r.type, c: r.c, n: r.n, target: r.target, items: JSON.parse(r.items),
    req_name: r.req_name, rel_name: r.rel_name, same: r.req_uid === r.rel_uid, req_sig: sig(r.req_uid), rel_sig: sig(r.rel_uid) };
}
app.get('/api/releases/:id', auth(), wrap((req, res) => {
  const d = releaseData(req.params.id, req.u);
  if (!d) return res.status(403).json({ error: 'Your role cannot do this.' });
  res.json(d);
}));
// A4 PDF of a release: items, purpose, transaction type, who requested it and who approved it.
app.get('/api/releases/:id/pdf', auth(), (req, res) => {
  let d;
  try { d = releaseData(req.params.id, req.u); } catch (e) { return res.status(404).json({ error: e.message }); }
  if (!d) return res.status(403).json({ error: 'Your role cannot do this.' });
  res.set({ 'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store',
    'Content-Disposition': `${req.query.download ? 'attachment' : 'inline'}; filename="PO-${String(d.id).padStart(6, '0')}.pdf"` });
  const doc = releasePdf(d, COMPANY);
  doc.on('error', () => res.end());
  doc.pipe(res); doc.end();
});

// "Your Transaction": everything the signed-in user requested or released, with its status.
// Basic users: their requests (pending, approved, rejected). Admins: their own releases (always approved).
app.get('/api/my-transactions', auth('admin', 'basic'), wrap((req, res) => {
  const u = req.u;
  const rows = db.prepare('SELECT * FROM requests WHERE uid=? ORDER BY id DESC LIMIT 300').all(u.id).map(r => ({
    key: 'q' + r.id, t: r.t, type: r.type, c: r.c, n: r.n, target: r.target, items: JSON.parse(r.items),
    st: r.st, rid: r.rid, by: r.who, dec_by: r.dec_by, dec_at: r.dec_at }));
  // Releases made straight from the form (admin) have no request row. Find them by requester and receipt.
  const linked = new Set(db.prepare('SELECT rid FROM requests WHERE rid IS NOT NULL').all().map(r => r.rid));
  for (const r of db.prepare('SELECT * FROM releases WHERE req_uid=? ORDER BY id DESC LIMIT 300').all(u.id)) {
    if (linked.has(r.id)) continue;
    rows.push({ key: 'r' + r.id, t: r.t, type: r.type, c: r.c, n: r.n, target: r.target, items: JSON.parse(r.items).map(i => ({ id: i.id, n: i.n, u: i.u, q: i.q, ...(i.into ? { into: i.into } : {}) })),
      st: 'approved', rid: r.id, by: r.req_name, dec_by: r.rel_name, dec_at: r.t });
  }
  rows.sort((a, b) => (b.t || b.dec_at) - (a.t || a.dec_at));
  res.json({ rows });
}));

// ---- Calendar: schedule future transactions, pull-ins, deliveries and other events ----
// Admin and basic users can add events. Admins can change or delete any event, basic users only their own. View-only users can look.
const EVENT_TYPES = ['Transaction', 'Pull-in', 'Delivery', 'Other'];
const evOut = e => ({ id: e.id, title: e.title, type: e.type, date: e.date, time: e.time, end: e.end_time, warehouse: e.warehouse, notes: e.notes,
  by: e.by_name, uid: e.by_uid, created_at: e.created_at, modified_by: e.modified_by, modified_at: e.modified_at });
const validDay = s => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false; const d = new Date(s + 'T00:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s; };
const validTime = s => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
function readEvent(b) {
  const title = String(b.title || '').trim().slice(0, 100);
  if (!title) throw new Error('Enter a title for the event.');
  const type = String(b.type || '');
  if (!EVENT_TYPES.includes(type)) throw new Error('Pick the event type.');
  const date = String(b.date || '');
  if (!validDay(date) || date < '2000-01-01' || date > '2100-12-31') throw new Error('Pick a valid date.');
  const time = String(b.time || ''), end = String(b.end || '');
  if (time && !validTime(time)) throw new Error('Enter a valid start time.');
  if (end && !validTime(end)) throw new Error('Enter a valid end time.');
  if (end && !time) throw new Error('Add a start time before the end time.');
  if (end && end <= time) throw new Error('The end time must be after the start time.');
  const warehouse = String(b.warehouse || '');
  if (warehouse && !WAREHOUSES.includes(warehouse)) throw new Error('Pick a valid warehouse.');
  const notes = String(b.notes || '').trim().slice(0, 500);
  return { title, type, date, time, end, warehouse, notes };
}
const evWhen = f => `${f.date}${f.time ? ' at ' + f.time + (f.end ? '-' + f.end : '') : ' (all day)'}`;
app.get('/api/events', auth(), wrap((req, res) => {
  const from = String(req.query.from || ''), to = String(req.query.to || '');
  if (!validDay(from) || !validDay(to)) throw new Error('Give a from and to date.');
  const rows = db.prepare("SELECT * FROM events WHERE date>=? AND date<=? ORDER BY date, time<>'', time, id LIMIT 2000").all(from, to);
  res.json({ events: rows.map(evOut) });
}));
app.post('/api/events', auth('admin', 'basic'), wrap((req, res) => {
  const f = readEvent(req.body || {});
  const r = db.prepare('INSERT INTO events(title,type,date,time,end_time,warehouse,notes,by_name,by_uid,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .run(f.title, f.type, f.date, f.time, f.end, f.warehouse, f.notes, req.u.name, req.u.id, Date.now());
  log(req.u.name, 'Event scheduled', `${f.type}: ${f.title}, ${evWhen(f)}${f.warehouse ? ', ' + f.warehouse : ''}`);
  res.json({ ok: true, id: Number(r.lastInsertRowid) });
}));
const ownEvent = req => {
  const e = db.prepare('SELECT * FROM events WHERE id=?').get(Number(req.params.id));
  if (!e) throw new Error('That event no longer exists.');
  if (req.u.role !== 'admin' && e.by_uid !== req.u.id) { const x = new Error('You can only change events you added.'); throw x; }
  return e;
};
app.put('/api/events/:id', auth('admin', 'basic'), wrap((req, res) => {
  const old = ownEvent(req), f = readEvent(req.body || {});
  db.prepare('UPDATE events SET title=?,type=?,date=?,time=?,end_time=?,warehouse=?,notes=?,modified_by=?,modified_at=? WHERE id=?')
    .run(f.title, f.type, f.date, f.time, f.end, f.warehouse, f.notes, req.u.name, Date.now(), old.id);
  log(req.u.name, 'Event edited', `${f.type}: ${f.title}, ${evWhen(f)}${f.warehouse ? ', ' + f.warehouse : ''}`);
  res.json({ ok: true });
}));
app.delete('/api/events/:id', auth('admin', 'basic'), wrap((req, res) => {
  const e = ownEvent(req);
  db.prepare('DELETE FROM events WHERE id=?').run(e.id);
  log(req.u.name, 'Event deleted', `${e.type}: ${e.title}, ${evWhen({ date: e.date, time: e.time, end: e.end_time })}`);
  res.json({ ok: true });
}));

// The link that goes into an item's QR code. Scanning it opens the item (after sign-in) on the Warehouse page.
app.get(/^\/warehouse\.html\/inventory=([A-Za-z0-9-]{1,40})\/?$/, (req, res) => res.redirect('/warehouse.html?inventory=' + encodeURIComponent(req.params[0])));

app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, () => console.log(`RSTI Inventory running at http://localhost:${PORT}`));
