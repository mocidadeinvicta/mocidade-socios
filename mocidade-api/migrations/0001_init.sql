CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  birth_date TEXT,
  email TEXT,
  phone TEXT,
  status TEXT NOT NULL, -- PENDING_PAYMENT | ACTIVE | INACTIVE
  joined_at TEXT,
  legacy_balance_cents INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS member_numbers (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  scheme TEXT NOT NULL,
  number_value INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 0,
  assigned_at TEXT NOT NULL,
  assigned_by TEXT,
  UNIQUE(scheme, number_value)
);

CREATE TABLE IF NOT EXISTS number_sequences (
  scheme TEXT PRIMARY KEY,
  next_value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS dues_periods (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  method TEXT,
  status TEXT NOT NULL, -- PENDING | CONFIRMED | CANCELLED
  created_at TEXT NOT NULL,
  confirmed_at TEXT,
  confirmed_by TEXT,
  notes TEXT
);

INSERT OR IGNORE INTO number_sequences (scheme, next_value)
VALUES ('CURRENT_2025', 1);
