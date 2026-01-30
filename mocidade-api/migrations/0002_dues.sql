-- Rates (para aumentos ao longo do tempo)
CREATE TABLE IF NOT EXISTS dues_rates (
  id TEXT PRIMARY KEY,
  effective_from TEXT NOT NULL,          -- ISO date, recomenda-se "YYYY-MM-01"
  amount_cents INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dues_rates_effective_from
  ON dues_rates(effective_from);

-- Meses por sócio (snapshot mensal; congela o valor aplicado)
CREATE TABLE IF NOT EXISTS dues_months (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  year_month TEXT NOT NULL,              -- "YYYY-MM"
  due_end TEXT NOT NULL,                 -- "YYYY-MM-DD" (último dia do mês)
  base_amount_cents INTEGER NOT NULL,    -- valor congelado para o mês (0 se isento)
  is_exempt INTEGER NOT NULL DEFAULT 0,  -- 1 se isento nesse mês
  created_at TEXT NOT NULL,

  UNIQUE(member_id, year_month)
);

CREATE INDEX IF NOT EXISTS idx_dues_months_member
  ON dues_months(member_id);

CREATE INDEX IF NOT EXISTS idx_dues_months_member_ym
  ON dues_months(member_id, year_month);

-- Ledger/histórico (pagamentos, perdões, ajustes)
CREATE TABLE IF NOT EXISTS dues_ledger (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  year_month TEXT NOT NULL,              -- "YYYY-MM"
  kind TEXT NOT NULL,                    -- PAYMENT | WAIVER | ADJUSTMENT
  amount_cents INTEGER NOT NULL,         -- PAYMENT/WAIVER positivos; ADJUSTMENT pode ser negativo
  method TEXT,                           -- MBWAY | TRANSFER | CASH | ...
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_dues_ledger_member_ym
  ON dues_ledger(member_id, year_month);

CREATE INDEX IF NOT EXISTS idx_dues_ledger_member
  ON dues_ledger(member_id);

-- Seed inicial (2€ a partir de 2025-01)
INSERT INTO dues_rates (id, effective_from, amount_cents, notes, created_at)
VALUES ('rate_2025_01', '2025-01-01', 200, 'Quota base inicial', datetime('now'))
ON CONFLICT(id) DO NOTHING;
