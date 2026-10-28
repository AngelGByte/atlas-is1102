require('dotenv').config();

const fs = require('node:fs/promises');
const path = require('node:path');
const bcrypt = require('bcryptjs');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { decryptValue, encryptValue, getEncryptionKey } = require('./crypto');
const {
  clientSchema,
  contractSchema,
  documentSchema,
  parse,
  userSchema,
  userUpdateSchema
} = require('./validation');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express();
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const safeUser = ({ id, name, email, role, active, created_at }) => ({
  id, name, email, role, active, createdAt: created_at
});
const safeClient = (row) => ({
  id: row.id,
  name: decryptValue(row.name_enc),
  company: decryptValue(row.company_enc),
  rut: decryptValue(row.rut_enc),
  email: decryptValue(row.email_enc),
  phone: decryptValue(row.phone_enc),
  riskLevel: row.risk_level,
  status: row.status,
  notes: decryptValue(row.notes_enc) || '',
  bankAccountLast4: row.bank_account_enc ? decryptValue(row.bank_account_enc).slice(-4) : '',
  createdAt: row.created_at,
  updatedAt: row.updated_at
});
const safeContract = (row) => ({
  id: row.id,
  clientId: row.client_id,
  clientName: row.client_name ? decryptValue(row.client_name) : '',
  number: row.number,
  title: row.title,
  value: Number(row.value),
  status: row.status,
  startDate: row.start_date,
  endDate: row.end_date,
  manager: row.manager,
  createdAt: row.created_at
});
const safeDocument = (row) => ({
  id: row.id,
  contractId: row.contract_id,
  contractNumber: row.contract_number,
  name: row.name,
  category: row.category,
  fileName: row.file_name,
  status: row.status,
  notes: row.notes,
  createdAt: row.created_at
});

function requireConfiguration() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
    throw new Error('JWT_SECRET must contain at least 24 characters.');
  }
  getEncryptionKey();
}

async function initializeDatabase() {
  const schema = await fs.readFile(path.join(__dirname, '..', 'db', 'init.sql'), 'utf8');
  await pool.query(schema);
  const email = process.env.ADMIN_EMAIL || 'admin@atlas.cl';
  const password = process.env.ADMIN_PASSWORD || 'AtlasAdmin2026!';
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rowCount === 0) {
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      ['Administrador Atlas', email.toLowerCase(), passwordHash, 'admin']
    );
  }

  const counts = await pool.query('SELECT COUNT(*)::int AS count FROM clients');
  if (counts.rows[0].count === 0) {
    await seedDemoData();
  }
}

async function seedDemoData() {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const clients = await db.query(
      `INSERT INTO clients (name_enc, company_enc, rut_enc, email_enc, phone_enc, risk_level, notes_enc)
       VALUES ($1,$2,$3,$4,$5,'medio',$6), ($7,$8,$9,$10,$11,'bajo',$12)
       RETURNING id`,
      [
        encryptValue('Contacto CreaLab'), encryptValue('CreaLab Spa'), encryptValue('76.123.456-7'),
        encryptValue('contacto@crealab.cl'), encryptValue('+56912345678'), encryptValue('Cliente de demostración'),
        encryptValue('Contacto Muebles Norte'), encryptValue('Muebles Norte'), encryptValue('77.456.789-0'),
        encryptValue('soporte@mueblesnorte.cl'), encryptValue('+56998765432'), encryptValue('Cliente de demostración')
      ]
    );
    const contracts = await db.query(
      `INSERT INTO contracts (client_id, number, title, value, status, start_date, end_date, manager)
       VALUES
         ($1, 'AT-2026-001', 'Servicio de gestión documental', 4800000, 'activo', '2026-01-15', '2027-01-15', 'Ana Torres'),
         ($2, 'AT-2026-045', 'Soporte técnico mensual', 1200000, 'pendiente', '2026-02-01', '2026-12-31', 'Pablo Ruiz')
       RETURNING id, number`,
      [clients.rows[0].id, clients.rows[1].id]
    );
    await db.query(
      `INSERT INTO documents (contract_id, name, category, file_name, status, notes)
       VALUES ($1, 'Contrato inicial CreaLab', 'Contrato', 'contrato_crealab.pdf', 'aprobado', 'Documento de demostración'),
              ($2, 'Anexo de soporte', 'Anexo', 'anexo_soporte.pdf', 'pendiente', 'Pendiente de revisión')`,
      [contracts.rows[0].id, contracts.rows[1].id]
    );
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}

const authenticate = asyncRoute(async (req, res, next) => {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer ([A-Za-z0-9._-]+)$/);
  if (!match) return res.status(401).json({ message: 'Se requiere una sesión válida.' });
  let claims;
  try {
    claims = jwt.verify(match[1], process.env.JWT_SECRET, { issuer: 'atlas', audience: 'atlas-web' });
  } catch {
    return res.status(401).json({ message: 'La sesión es inválida o expiró.' });
  }
  const result = await pool.query(
    'SELECT id, email, role, active FROM users WHERE id=$1',
    [claims.id]
  );
  if (!result.rowCount || !result.rows[0].active) {
    return res.status(401).json({ message: 'La cuenta ya no está activa.' });
  }
  req.auth = {
    id: Number(result.rows[0].id),
    email: result.rows[0].email,
    role: result.rows[0].role
  };
  return next();
});

function requireAdmin(req, res, next) {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ message: 'Esta operación requiere el rol administrador.' });
  }
  return next();
}

async function recordAudit(db, req, action, entity, entityId, details = {}) {
  await db.query(
    `INSERT INTO audit_logs (actor_id, actor_email, action, entity, entity_id, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [req.auth.id, req.auth.email, action, entity, entityId || null, details]
  );
}

async function inTransaction(handler) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '100kb', type: 'application/json' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false, maxAge: '1h' }));

app.get('/api/health', asyncRoute(async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', service: 'Atlas', time: new Date().toISOString() });
}));

app.post('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Espera 15 minutos e inténtalo nuevamente.' }
}), asyncRoute(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password || email.length > 254 || password.length > 128) {
    return res.status(400).json({ message: 'Ingresa un correo y contraseña válidos.' });
  }
  const result = await pool.query(
    'SELECT id, name, email, password_hash, role, active FROM users WHERE email = $1',
    [email]
  );
  const user = result.rows[0];
  if (!user || !user.active || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'Credenciales inválidas.' });
  }
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30m', issuer: 'atlas', audience: 'atlas-web' }
  );
  await pool.query(
    `INSERT INTO audit_logs (actor_id, actor_email, action, entity, entity_id, details)
     VALUES ($1, $2, 'login', 'users', $1, '{"result":"success"}')`,
    [user.id, user.email]
  );
  res.json({ token, user: safeUser(user) });
}));

app.get('/api/auth/me', authenticate, asyncRoute(async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, email, role, active, created_at FROM users WHERE id = $1 AND active = TRUE',
    [req.auth.id]
  );
  if (!result.rowCount) return res.status(401).json({ message: 'La cuenta ya no está activa.' });
  res.json({ user: safeUser(result.rows[0]) });
}));

app.use('/api', authenticate);

app.get('/api/summary', asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM clients) AS clients,
       (SELECT COUNT(*)::int FROM contracts) AS contracts,
       (SELECT COUNT(*)::int FROM contracts WHERE status = 'activo') AS active_contracts,
       (SELECT COUNT(*)::int FROM clients WHERE risk_level = 'alto') AS high_risk_clients`
  );
  res.json(result.rows[0]);
}));

app.get('/api/clients', asyncRoute(async (req, res) => {
  const result = await pool.query('SELECT * FROM clients ORDER BY created_at DESC');
  res.json(result.rows.map(safeClient));
}));

app.post('/api/clients', requireAdmin, asyncRoute(async (req, res) => {
  const input = parse(clientSchema, req.body);
  const encrypted = input.bankAccount ? encryptValue(input.bankAccount.replace(/[ -]/g, '')) : null;
  const created = await inTransaction(async (db) => {
    const result = await db.query(
      `INSERT INTO clients (name_enc, company_enc, rut_enc, email_enc, phone_enc, risk_level, status, notes_enc, bank_account_enc)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [encryptValue(input.name), encryptValue(input.company), encryptValue(input.rut),
        encryptValue(input.email), encryptValue(input.phone), input.riskLevel,
        input.status, encryptValue(input.notes), encrypted]
    );
    await recordAudit(db, req, 'create', 'clients', result.rows[0].id, { changed: true });
    return result.rows[0];
  });
  res.status(201).json(safeClient(created));
}));

app.put('/api/clients/:id', requireAdmin, asyncRoute(async (req, res) => {
  const input = parse(clientSchema, req.body);
  const encrypted = input.bankAccount ? encryptValue(input.bankAccount.replace(/[ -]/g, '')) : undefined;
  const updated = await inTransaction(async (db) => {
    const result = await db.query(
      `UPDATE clients SET name_enc=$1, company_enc=$2, rut_enc=$3, email_enc=$4, phone_enc=$5, risk_level=$6,
       status=$7, notes_enc=$8, bank_account_enc=COALESCE($9, bank_account_enc), updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [encryptValue(input.name), encryptValue(input.company), encryptValue(input.rut),
        encryptValue(input.email), encryptValue(input.phone), input.riskLevel,
        input.status, encryptValue(input.notes), encrypted, req.params.id]
    );
    if (!result.rowCount) {
      const error = new Error('Cliente no encontrado.');
      error.status = 404;
      throw error;
    }
    await recordAudit(db, req, 'update', 'clients', result.rows[0].id, { changed: true });
    return result.rows[0];
  });
  res.json(safeClient(updated));
}));

app.delete('/api/clients/:id', requireAdmin, asyncRoute(async (req, res) => {
  await inTransaction(async (db) => {
    const result = await db.query('DELETE FROM clients WHERE id=$1 RETURNING id', [req.params.id]);
    if (!result.rowCount) {
      const error = new Error('Cliente no encontrado.');
      error.status = 404;
      throw error;
    }
    await recordAudit(db, req, 'delete', 'clients', result.rows[0].id, { changed: true });
  });
  res.status(204).end();
}));

app.get('/api/contracts', asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT c.*, cl.company_enc AS client_name FROM contracts c
     JOIN clients cl ON cl.id=c.client_id ORDER BY c.created_at DESC`
  );
  res.json(result.rows.map(safeContract));
}));

app.post('/api/contracts', requireAdmin, asyncRoute(async (req, res) => {
  const input = parse(contractSchema, req.body);
  const created = await inTransaction(async (db) => {
    const result = await db.query(
      `INSERT INTO contracts (client_id, number, title, value, status, start_date, end_date, manager)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [input.clientId, input.number, input.title, input.value, input.status,
        input.startDate, input.endDate, input.manager]
    );
    await recordAudit(db, req, 'create', 'contracts', result.rows[0].id, { number: input.number });
    return result.rows[0];
  });
  res.status(201).json(safeContract({ ...created, client_name: '' }));
}));

app.put('/api/contracts/:id', requireAdmin, asyncRoute(async (req, res) => {
  const input = parse(contractSchema, req.body);
  const updated = await inTransaction(async (db) => {
    const result = await db.query(
      `UPDATE contracts SET client_id=$1, number=$2, title=$3, value=$4, status=$5,
       start_date=$6, end_date=$7, manager=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
      [input.clientId, input.number, input.title, input.value, input.status, input.startDate,
        input.endDate, input.manager, req.params.id]
    );
    if (!result.rowCount) {
      const error = new Error('Contrato no encontrado.');
      error.status = 404;
      throw error;
    }
    await recordAudit(db, req, 'update', 'contracts', result.rows[0].id, { number: input.number });
    return result.rows[0];
  });
  res.json(safeContract(updated));
}));

app.delete('/api/contracts/:id', requireAdmin, asyncRoute(async (req, res) => {
  await inTransaction(async (db) => {
    const result = await db.query('DELETE FROM contracts WHERE id=$1 RETURNING id, number', [req.params.id]);
    if (!result.rowCount) {
      const error = new Error('Contrato no encontrado.');
      error.status = 404;
      throw error;
    }
    await recordAudit(db, req, 'delete', 'contracts', result.rows[0].id, { number: result.rows[0].number });
  });
  res.status(204).end();
}));

app.get('/api/documents', asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT d.*, c.number AS contract_number FROM documents d
     JOIN contracts c ON c.id=d.contract_id ORDER BY d.created_at DESC`
  );
  res.json(result.rows.map(safeDocument));
}));

app.post('/api/documents', requireAdmin, asyncRoute(async (req, res) => {
  const input = parse(documentSchema, req.body);
  const created = await inTransaction(async (db) => {
    const result = await db.query(
      `INSERT INTO documents (contract_id, name, category, file_name, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [input.contractId, input.name, input.category, input.fileName, input.status, input.notes]
    );
    await recordAudit(db, req, 'create', 'documents', result.rows[0].id, { changed: true });
    return result.rows[0];
  });
  res.status(201).json(safeDocument({ ...created, contract_number: '' }));
}));

app.put('/api/documents/:id', requireAdmin, asyncRoute(async (req, res) => {
  const input = parse(documentSchema, req.body);
  const updated = await inTransaction(async (db) => {
    const result = await db.query(
      `UPDATE documents SET contract_id=$1, name=$2, category=$3, file_name=$4, status=$5,
       notes=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [input.contractId, input.name, input.category, input.fileName, input.status, input.notes, req.params.id]
    );
    if (!result.rowCount) {
      const error = new Error('Documento no encontrado.');
      error.status = 404;
      throw error;
    }
    await recordAudit(db, req, 'update', 'documents', result.rows[0].id, { changed: true });
    return result.rows[0];
  });
  res.json(safeDocument({ ...updated, contract_number: '' }));
}));

app.delete('/api/documents/:id', requireAdmin, asyncRoute(async (req, res) => {
  await inTransaction(async (db) => {
    const result = await db.query('DELETE FROM documents WHERE id=$1 RETURNING id, name', [req.params.id]);
    if (!result.rowCount) {
      const error = new Error('Documento no encontrado.');
      error.status = 404;
      throw error;
    }
    await recordAudit(db, req, 'delete', 'documents', result.rows[0].id, { changed: true });
  });
  res.status(204).end();
}));

app.get('/api/users', requireAdmin, asyncRoute(async (req, res) => {
  const result = await pool.query(
    'SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(result.rows.map(safeUser));
}));

app.post('/api/users', requireAdmin, asyncRoute(async (req, res) => {
  const input = parse(userSchema, req.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const created = await inTransaction(async (db) => {
    const result = await db.query(
      'INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role,active,created_at',
      [input.name, input.email, passwordHash, input.role]
    );
    await recordAudit(db, req, 'create', 'users', result.rows[0].id, { role: input.role });
    return result.rows[0];
  });
  res.status(201).json(safeUser(created));
}));

app.patch('/api/users/:id', requireAdmin, asyncRoute(async (req, res) => {
  const input = parse(userUpdateSchema, req.body);
  if (Number(req.params.id) === req.auth.id && input.role && input.role !== req.auth.role) {
    const error = new Error('No puedes cambiar tu propio rol.');
    error.status = 400;
    throw error;
  }
  if (Number(req.params.id) === req.auth.id && input.active === false) {
    const error = new Error('No puedes desactivar tu propia cuenta.');
    error.status = 400;
    throw error;
  }
  const updated = await inTransaction(async (db) => {
    const result = await db.query(
      `UPDATE users SET name=COALESCE($1,name), role=COALESCE($2,role),
       active=COALESCE($3,active) WHERE id=$4
       RETURNING id,name,email,role,active,created_at`,
      [input.name || null, input.role || null, input.active ?? null, req.params.id]
    );
    if (!result.rowCount) {
      const error = new Error('Usuario no encontrado.');
      error.status = 404;
      throw error;
    }
    await recordAudit(db, req, 'update', 'users', result.rows[0].id, { role: result.rows[0].role });
    return result.rows[0];
  });
  res.json(safeUser(updated));
}));

app.get('/api/audit', requireAdmin, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT id, actor_email, action, entity, entity_id, details, created_at
     FROM audit_logs ORDER BY created_at DESC LIMIT 200`
  );
  res.json(result.rows);
}));

app.use('/api', (req, res) => res.status(404).json({ message: 'Ruta de API no encontrada.' }));

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === '23505') return res.status(409).json({ message: 'Ya existe un registro con esos datos.' });
  if (error.code === '23503') return res.status(409).json({ message: 'La operación no es posible porque hay registros relacionados.' });
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ message: status >= 500 ? 'Ocurrió un error interno. Inténtalo nuevamente.' : error.message });
});

async function start() {
  requireConfiguration();
  if (process.env.NODE_ENV === 'production' &&
      (process.env.JWT_SECRET === 'local-demo-only-change-before-deployment' ||
       process.env.JWT_SECRET.startsWith('replace-this') ||
       process.env.DATA_ENCRYPTION_SECRET === 'local-demo-encryption-only-change' ||
       process.env.DATA_ENCRYPTION_SECRET.startsWith('replace-this') ||
       process.env.ADMIN_PASSWORD === 'AtlasAdmin2026!' ||
       process.env.POSTGRES_PASSWORD === 'atlas-local-only')) {
    throw new Error('Production requires unique JWT_SECRET and DATA_ENCRYPTION_SECRET values.');
  }
  await initializeDatabase();
  const port = Number(process.env.PORT || 3000);
  return app.listen(port, '0.0.0.0', () => console.log(`Atlas escuchando en el puerto ${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    console.error('No fue posible iniciar Atlas:', error.message);
    process.exitCode = 1;
  });
}

module.exports = { app, initializeDatabase, pool, start };
