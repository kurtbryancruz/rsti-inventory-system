// Creates RoenDB (tables + first admin). Safe to run again: nothing is overwritten.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');
const { randomInt } = require('crypto');

// A 7-digit inventory code nobody else has. It goes in the item link: /warehouse.html/inventory=CODE
function newCode(db) {
  for (;;) {
    const c = String(randomInt(1000000, 10000000));
    if (!db.prepare('SELECT 1 FROM products WHERE code=?').get(c)) return c;
  }
}

function open(file) {
  const db = new DatabaseSync(file);
  const cols = t => db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);
  const exists = t => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);
  // Older files have a products table without warehouses (and with a unique name). Set it aside,
  // let schema.sql build the new table, then copy every product back (they go to Warehouse 1).
  if (exists('products') && !cols('products').includes('warehouse') && !exists('products_old')) db.exec('ALTER TABLE products RENAME TO products_old');
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  if (exists('products_old')) {
    const oc = cols('products_old'), common = cols('products').filter(c => oc.includes(c)).join(',');
    db.exec('BEGIN');
    try {
      db.exec(`INSERT OR IGNORE INTO products(${common}) SELECT ${common} FROM products_old`);
      db.exec('DROP TABLE products_old');
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  // Every product gets an inventory code (older files get theirs here, once).
  if (!cols('products').includes('code')) db.exec('ALTER TABLE products ADD COLUMN code TEXT');
  for (const r of db.prepare("SELECT id FROM products WHERE code IS NULL OR code=''").all()) db.prepare('UPDATE products SET code=? WHERE id=?').run(newCode(db), r.id);
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS products_code ON products(code)');
  // Receipt link columns for files created before pull-out receipts existed.
  for (const t of ['log', 'requests']) if (!cols(t).includes('rid')) db.exec(`ALTER TABLE ${t} ADD COLUMN rid INTEGER`);
  // Blending records the finished product name.
  for (const t of ['requests', 'releases']) if (!cols(t).includes('target')) db.exec(`ALTER TABLE ${t} ADD COLUMN target TEXT NOT NULL DEFAULT ''`);
  // Reorder points: lead time (set by hand) and safety days per product.
  if (!cols('products').includes('lead_days')) db.exec('ALTER TABLE products ADD COLUMN lead_days REAL');
  if (!cols('products').includes('safety_days')) db.exec('ALTER TABLE products ADD COLUMN safety_days REAL NOT NULL DEFAULT 0');
  // Account manager: department, disable/enable, forced password change, session version.
  if (!cols('users').includes('dept')) db.exec("ALTER TABLE users ADD COLUMN dept TEXT NOT NULL DEFAULT ''");
  if (!cols('users').includes('active')) db.exec('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
  if (!cols('users').includes('must_change')) db.exec('ALTER TABLE users ADD COLUMN must_change INTEGER NOT NULL DEFAULT 0');
  if (!cols('users').includes('sv')) db.exec('ALTER TABLE users ADD COLUMN sv INTEGER NOT NULL DEFAULT 0');
  // Notifications: remember when each user last opened the bell. 0 means "never"; the server starts it at the first visit.
  if (!cols('users').includes('notif_seen')) db.exec('ALTER TABLE users ADD COLUMN notif_seen INTEGER NOT NULL DEFAULT 0');
  // Requests remember when they were sent and who approved or rejected them (for "Your Transaction" and the PDF).
  if (!cols('requests').includes('t')) db.exec('ALTER TABLE requests ADD COLUMN t INTEGER NOT NULL DEFAULT 0');
  if (!cols('requests').includes('dec_by')) db.exec("ALTER TABLE requests ADD COLUMN dec_by TEXT NOT NULL DEFAULT ''");
  if (!cols('requests').includes('dec_at')) db.exec('ALTER TABLE requests ADD COLUMN dec_at INTEGER NOT NULL DEFAULT 0');
  if (!db.prepare('SELECT 1 FROM users').get()) {
    db.prepare('INSERT INTO users(name,user,pw,role) VALUES(?,?,?,?)')
      .run('Administrator', 'admin', bcrypt.hashSync('admin123', 10), 'admin');
    console.log('Created first admin: admin / admin123. Change this password after signing in.');
  }
  return db;
}
module.exports = { open, newCode };

if (require.main === module) {
  const file = process.env.DB_FILE || path.join(__dirname, '..', 'RoenDB.db');
  const db = open(file);
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  db.close();
  console.log('RoenDB ready at ' + file);
}
