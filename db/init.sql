CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(16) NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_rate_limits (
  rate_key CHAR(64) PRIMARY KEY,
  total_hits BIGINT NOT NULL CHECK (total_hits >= 0),
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_rate_limits_reset_at
  ON login_rate_limits(reset_at);

CREATE TABLE IF NOT EXISTS companies (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id BIGSERIAL PRIMARY KEY,
  empresa_id BIGINT REFERENCES companies(id) ON DELETE RESTRICT,
  name_enc TEXT NOT NULL,
  company_enc TEXT NOT NULL,
  rut_enc TEXT,
  email_enc TEXT NOT NULL,
  phone_enc TEXT,
  risk_level VARCHAR(12) NOT NULL DEFAULT 'medio' CHECK (risk_level IN ('bajo', 'medio', 'alto')),
  status VARCHAR(16) NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'inactivo')),
  notes_enc TEXT,
  bank_account_enc TEXT,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_at TIMESTAMPTZ,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS empresa_id BIGINT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'clients_empresa_id_fkey'
  ) THEN
    ALTER TABLE clients
      ADD CONSTRAINT clients_empresa_id_fkey
      FOREIGN KEY (empresa_id) REFERENCES companies(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS client_oppositions (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  requested_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  resolved_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  reason VARCHAR(1000) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'aceptada', 'rechazada')),
  resolution_reason VARCHAR(1000),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CHECK (
    (status = 'pendiente' AND resolved_at IS NULL AND resolved_by IS NULL) OR
    (status IN ('aceptada', 'rechazada') AND resolved_at IS NOT NULL AND resolved_by IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS contracts (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  number VARCHAR(40) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  value NUMERIC(14, 0) NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'pendiente' CHECK (status IN ('activo', 'pendiente', 'vencido', 'terminado')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  manager VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  contract_id BIGINT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'General',
  file_name VARCHAR(180) NOT NULL DEFAULT '',
  status VARCHAR(16) NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado')),
  notes VARCHAR(1000) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  actor_email VARCHAR(254) NOT NULL,
  action VARCHAR(24) NOT NULL,
  entity VARCHAR(32) NOT NULL,
  entity_id BIGINT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_empresa_id ON clients(empresa_id);
CREATE INDEX IF NOT EXISTS idx_documents_contract_id ON documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
