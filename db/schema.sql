-- RoenDB schema (SQLite)
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id    INTEGER PRIMARY KEY,
  name  TEXT NOT NULL,
  user  TEXT UNIQUE NOT NULL,
  pw    TEXT NOT NULL,                 -- bcrypt hash, never the plain password
  role  TEXT NOT NULL CHECK (role IN ('admin','basic','view')),
  sig   TEXT NOT NULL DEFAULT '',      -- e-signature image (data URL)
  dept  TEXT NOT NULL DEFAULT '',      -- department, e.g. Operations Department (empty = none)
  active INTEGER NOT NULL DEFAULT 1,   -- 0 = disabled: cannot sign in, history is kept
  must_change INTEGER NOT NULL DEFAULT 0, -- 1 = must choose a new password at next sign-in (after a reset)
  sv    INTEGER NOT NULL DEFAULT 0     -- session version: raised on reset/disable to sign the user out everywhere
);

CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  code          TEXT,                            -- inventory code used in the item link / QR code, e.g. 1102022
  warehouse     TEXT NOT NULL DEFAULT 'Warehouse 1',  -- Warehouse 1 or Warehouse 2 (separate records)
  rack          TEXT NOT NULL DEFAULT '',
  floor_area    TEXT NOT NULL DEFAULT '',
  sku           TEXT NOT NULL DEFAULT '',        -- master code
  qr            TEXT NOT NULL DEFAULT '',        -- QR code photo (data URL)
  item_type     TEXT NOT NULL DEFAULT 'Chemical',-- Chemical, Equipment or any other type
  unit          TEXT NOT NULL,                   -- kg, L or pcs
  qty           REAL NOT NULL DEFAULT 0,
  min_qty       REAL NOT NULL DEFAULT 0,         -- low-stock alert level (reorder point)
  description   TEXT NOT NULL DEFAULT '',
  exp           TEXT NOT NULL DEFAULT '',        -- YYYY-MM-DD, empty if not applicable
  supplier      TEXT NOT NULL DEFAULT '',
  batch         TEXT NOT NULL DEFAULT '',        -- batch or lot number
  purchase_date TEXT NOT NULL DEFAULT '',        -- YYYY-MM-DD
  cost          REAL,                            -- cost per unit, admin only, NULL if not entered
  lead_days     REAL,                            -- supplier lead time in days (set by hand), NULL if not entered
  safety_days   REAL NOT NULL DEFAULT 0,         -- extra spare days on top of the lead time
  exc_exp       TEXT NOT NULL DEFAULT '',        -- expiry date an admin approved an exception for
  exc_by        TEXT NOT NULL DEFAULT '',
  exc_reason    TEXT NOT NULL DEFAULT '',
  exc_at        INTEGER NOT NULL DEFAULT 0,
  added_by      TEXT NOT NULL DEFAULT '-',
  modified_by   TEXT NOT NULL DEFAULT '-',       -- '-' until someone modifies it
  added_at      INTEGER NOT NULL DEFAULT 0,      -- time in milliseconds
  modified_at   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (name, warehouse)
);

-- users.notif_seen (ms) = when the user last opened the notification bell. Added by db/init.js on older files.
CREATE TABLE IF NOT EXISTS log (
  id     INTEGER PRIMARY KEY,
  t      INTEGER,                      -- time in milliseconds
  who    TEXT,
  action TEXT,
  detail TEXT,
  type   TEXT,                         -- Trading, Repacking, Blending or Others
  out    REAL,                         -- total units released, empty for other actions
  rid    INTEGER                       -- receipt (releases.id) when the action is a release
);

CREATE TABLE IF NOT EXISTS requests (
  id    INTEGER PRIMARY KEY,
  type  TEXT,
  c     TEXT,                          -- client or reference
  n     TEXT,                          -- notes or reason
  items TEXT,                          -- JSON list of items
  who   TEXT,
  uid   INTEGER,
  st    TEXT NOT NULL DEFAULT 'pending',
  target TEXT NOT NULL DEFAULT '',     -- finished product name for Blending
  rid   INTEGER,                       -- receipt (releases.id) once approved
  t      INTEGER NOT NULL DEFAULT 0,   -- time the request was sent (milliseconds)
  dec_by TEXT NOT NULL DEFAULT '',     -- admin who approved or rejected it
  dec_at INTEGER NOT NULL DEFAULT 0    -- time of the decision
);

CREATE TABLE IF NOT EXISTS releases (    -- one row per pull-out, used for the printable receipt
  id       INTEGER PRIMARY KEY,
  t        INTEGER NOT NULL,
  type     TEXT,
  c        TEXT,
  n        TEXT,
  target   TEXT NOT NULL DEFAULT '',   -- finished product name for Blending
  items    TEXT NOT NULL,              -- JSON list: id, name, sku, warehouse, unit, qty
  req_name TEXT,
  req_uid  INTEGER,
  rel_name TEXT,
  rel_uid  INTEGER
);

-- Calendar: scheduled future transactions, pull-ins, deliveries and other events. Date and time are plain local text (no time zone maths).
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL,                    -- Transaction, Pull-in, Delivery or Other
  date        TEXT NOT NULL,                    -- YYYY-MM-DD
  time        TEXT NOT NULL DEFAULT '',         -- HH:MM start, empty = all day
  end_time    TEXT NOT NULL DEFAULT '',         -- HH:MM end, optional
  warehouse   TEXT NOT NULL DEFAULT '',         -- optional: Warehouse 1 or Warehouse 2
  notes       TEXT NOT NULL DEFAULT '',
  by_name     TEXT NOT NULL,
  by_uid      INTEGER NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT 0,
  modified_by TEXT NOT NULL DEFAULT '-',
  modified_at INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS events_date ON events(date);
