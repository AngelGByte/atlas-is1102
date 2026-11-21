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
const DEFAULT_CLIENTS_LIMIT = 50;
const MAX_CLIENTS_LIMIT = 200;
const databasePoolMax = Number(process.env.PG_POOL_MAX || 10);
const {
  clientSchema,
  clientBlockSchema,
  clientOppositionResolutionSchema,
  clientOppositionSchema,
  contractSchema,
  documentSchema,
  parse,
  userSchema,
  userUpdateSchema
} = require('./validation');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: databasePoolMax
});
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
  blocked: row.blocked,
  blockedAt: row.blocked ? row.blocked_at : null,
  blockedReason: row.blocked ? row.blocked_reason : null,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});
const safeOpposition = (row) => ({
  id: row.id,
  clientId: row.client_id,
  reason: row.reason,
  status: row.status,
  resolutionReason: row.resolution_reason,
  requestedAt: row.requested_at,
  updatedAt: row.updated_at,
  resolvedAt: row.resolved_at
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
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');
  }
  if (!Number.isSafeInteger(databasePoolMax) || databasePoolMax < 1 || databasePoolMax > 100) {
    throw new Error('PG_POOL_MAX must be an integer between 1 and 100.');
  }
  getEncryptionKey();
}

function getClientPagination(query) {
  const hasPage = Object.hasOwn(query, 'page');
  const hasOffset = Object.hasOwn(query, 'offset');
  if (hasPage && hasOffset) return null;

  const parseInteger = (value, fallback) => {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  };

  const limit = parseInteger(query.limit, DEFAULT_CLIENTS_LIMIT);
  if (limit === null || limit < 1 || limit > MAX_CLIENTS_LIMIT) return null;

  const requestedPage = parseInteger(query.page, 1);
  const requestedOffset = parseInteger(query.offset, 0);
  if (requestedPage === null || requestedOffset === null || requestedPage < 1) return null;

  const offset = hasPage ? (requestedPage - 1) * limit : requestedOffset;
  if (!Number.isSafeInteger(offset)) return null;

  return {
    limit,
    offset,
    page: hasPage ? requestedPage : Math.floor(offset / limit) + 1
  };
}

async function initializeDatabase() {
  const schema = await fs.readFile(path.join(__dirname, '..', 'db', 'init.sql'), 'utf8');
  await pool.query(schema);
  const email = process.env.ADMIN_EMAIL || 'admin@atlas.cl';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error('ADMIN_PASSWORD is required.');
  if (password.length < 12) throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rowCount === 0) {
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      ['Administrador Atlas', email.toLowerCase(), passwordHash, 'admin']
    );
  }

  const defaultCompany = await pool.query(
    `INSERT INTO companies (name) VALUES ('Empresa Atlas')
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`
  );
  await pool.query(
    'UPDATE clients SET empresa_id = $1 WHERE empresa_id IS NULL',
    [defaultCompany.rows[0].id]
  );

  const counts = await pool.query('SELECT COUNT(*)::int AS count FROM clients');
  if (counts.rows[0].count === 0) {
    await seedDemoData();
  }
}

async function seedDemoData() {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const company = await db.query('SELECT id FROM companies ORDER BY id LIMIT 1');
    const companyId = company.rows[0].id;
    const clients = await db.query(
      `INSERT INTO clients (empresa_id, name_enc, company_enc, rut_enc, email_enc, phone_enc, risk_level, notes_enc)
       VALUES ($1,$2,$3,$4,$5,$6,'medio',$7), ($1,$8,$9,$10,$11,$12,'bajo',$13)
       RETURNING id`,
      [
        companyId,
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

async function getDefaultCompanyId(db = pool) {
  const result = await db.query('SELECT id FROM companies ORDER BY id LIMIT 1');
  return result.rows[0].id;
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

async function assertClientEditable(db, clientId) {
  const result = await db.query('SELECT blocked FROM clients WHERE id=$1 FOR UPDATE', [clientId]);
  if (!result.rowCount) {
    const error = new Error('Cliente no encontrado.');
    error.status = 404;
    throw error;
  }
  if (result.rows[0].blocked) {
    const error = new Error('Cliente bloqueado; desbloquéelo explícitamente antes de modificarlo.');
    error.status = 409;
    throw error;
  }
}

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '100kb', type: 'application/json' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false, maxAge: '1h' }));

const validateNumericId = (req, res, next, id) => {
  if (!/^\d{1,18}$/.test(id)) {
    return res.status(400).json({ message: 'Identificador inválido.' });
  }
  return next();
};
app.param('id', validateNumericId);
app.param('oppositionId', validateNumericId);

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
       (SELECT COUNT(*)::int FROM clients WHERE blocked=FALSE) AS clients,
       (SELECT COUNT(*)::int FROM contracts) AS contracts,
       (SELECT COUNT(*)::int FROM contracts WHERE status = 'activo') AS active_contracts,
       (SELECT COUNT(*)::int FROM clients WHERE risk_level = 'alto' AND blocked=FALSE) AS high_risk_clients`
  );
  res.json(result.rows[0]);
}));

app.get('/api/clients', asyncRoute(async (req, res) => {
  const pagination = getClientPagination(req.query);
  if (!pagination) {
    return res.status(400).json({ message: 'Parámetros de paginación inválidos.' });
  }
  const includeBlockedValue = req.query.includeBlocked;
  if (includeBlockedValue !== undefined && !['true', 'false'].includes(includeBlockedValue)) {
    return res.status(400).json({ message: 'Parámetro includeBlocked inválido.' });
  }
  const includeBlocked = includeBlockedValue === 'true';
  if (includeBlocked && req.auth.role !== 'admin') {
    return res.status(403).json({ message: 'Solo el administrador puede incluir clientes bloqueados.' });
  }
  const clientFilter = includeBlocked ? '' : ' WHERE blocked=FALSE';
  const totalResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM clients${clientFilter}`
  );
  const total = totalResult.rows[0].total;
  const result = await pool.query(
    `SELECT * FROM clients${clientFilter}
     ORDER BY created_at DESC, id DESC
     LIMIT $1 OFFSET $2`,
    [pagination.limit, pagination.offset]
  );
  const totalPages = Math.ceil(total / pagination.limit);
  res.set({
    'X-Total-Count': String(total),
    'X-Page': String(pagination.page),
    'X-Limit': String(pagination.limit),
    'X-Offset': String(pagination.offset),
    'X-Total-Pages': String(totalPages)
  });
  res.json(result.rows.map(safeClient));
}));

app.get('/api/clients/:id/export', requireAdmin, asyncRoute(async (req, res) => {
  const exported = await inTransaction(async (db) => {
    const client = await db.query('SELECT * FROM clients WHERE id=$1', [req.params.id]);
    if (!client.rowCount) {
      const error = new Error('Cliente no encontrado.');
      error.status = 404;
      throw error;
    }
    const contracts = await db.query(
      `SELECT c.*, cl.company_enc AS client_name FROM contracts c
       JOIN clients cl ON cl.id=c.client_id
       WHERE c.client_id=$1 ORDER BY c.created_at`,
      [req.params.id]
    );
    const documents = await db.query(
      `SELECT d.*, c.number AS contract_number FROM documents d
       JOIN contracts c ON c.id=d.contract_id
       WHERE c.client_id=$1 ORDER BY d.created_at`,
      [req.params.id]
    );
    await recordAudit(db, req, 'export', 'clients', client.rows[0].id, {
      format: 'json',
      contractCount: contracts.rowCount,
      documentCount: documents.rowCount
    });
    return {
      dataSubject: safeClient(client.rows[0]),
      contracts: contracts.rows.map(safeContract),
      documents: documents.rows.map(safeDocument)
    };
  });
  res.json({ exportedAt: new Date().toISOString(), ...exported });
}));

app.post('/api/clients/:id/opposition', requireAdmin, asyncRoute(async (req, res) => {
  const input = parse(clientOppositionSchema, req.body);
  const opposition = await inTransaction(async (db) => {
    const client = await db.query('SELECT id FROM clients WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!client.rowCount) {
      const error = new Error('Cliente no encontrado.');
      error.status = 404;
      throw error;
    }
    const result = await db.query(
      `INSERT INTO client_oppositions (client_id, requested_by, reason)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, req.auth.id, input.reason]
    );
    await recordAudit(db, req, 'opposition_create', 'client_oppositions', result.rows[0].id, {
      clientId: Number(req.params.id),
      status: result.rows[0].status
    });
    return result.rows[0];
  });
  res.status(201).json(safeOpposition(opposition));
}));

app.patch('/api/clients/:id/oppositions/:oppositionId', requireAdmin, asyncRoute(async (req, res) => {
  const input = parse(clientOppositionResolutionSchema, req.body);
  const opposition = await inTransaction(async (db) => {
    const result = await db.query(
      `UPDATE client_oppositions
       SET status=$1, resolution_reason=$2, resolved_by=$3, resolved_at=NOW(), updated_at=NOW()
       WHERE id=$4 AND client_id=$5 AND status='pendiente'
       RETURNING *`,
      [input.status, input.resolutionReason, req.auth.id, req.params.oppositionId, req.params.id]
    );
    if (!result.rowCount) {
      const existing = await db.query(
        'SELECT status FROM client_oppositions WHERE id=$1 AND client_id=$2',
        [req.params.oppositionId, req.params.id]
      );
      if (!existing.rowCount) {
        const error = new Error('Solicitud de oposición no encontrada.');
        error.status = 404;
        throw error;
      }
      const error = new Error('La solicitud de oposición ya fue resuelta.');
      error.status = 409;
      throw error;
    }
    await recordAudit(db, req, 'opposition_resolve', 'client_oppositions', result.rows[0].id, {
      clientId: Number(req.params.id),
      status: input.status
    });
    return result.rows[0];
  });
  res.json(safeOpposition(opposition));
}));

app.patch('/api/clients/:id/block', requireAdmin, asyncRoute(async (req, res) => {
  const input = parse(clientBlockSchema, req.body);
  const blocked = await inTransaction(async (db) => {
    const result = await db.query(
      `UPDATE clients SET blocked=TRUE, blocked_at=NOW(), blocked_reason=$1, updated_at=NOW()
       WHERE id=$2 AND blocked=FALSE RETURNING *`,
      [input.reason, req.params.id]
    );
    if (!result.rowCount) {
      const existing = await db.query('SELECT blocked FROM clients WHERE id=$1', [req.params.id]);
      if (!existing.rowCount) {
        const error = new Error('Cliente no encontrado.');
        error.status = 404;
        throw error;
      }
      const error = new Error('El cliente ya está bloqueado.');
      error.status = 409;
      throw error;
    }
    await recordAudit(db, req, 'block', 'clients', result.rows[0].id, { blocked: true });
    return result.rows[0];
  });
  res.json(safeClient(blocked));
}));

app.patch('/api/clients/:id/unblock', requireAdmin, asyncRoute(async (req, res) => {
  const unblocked = await inTransaction(async (db) => {
    const result = await db.query(
      `UPDATE clients SET blocked=FALSE, blocked_at=NULL, blocked_reason=NULL, updated_at=NOW()
       WHERE id=$1 AND blocked=TRUE RETURNING *`,
      [req.params.id]
    );
    if (!result.rowCount) {
      const existing = await db.query('SELECT id FROM clients WHERE id=$1', [req.params.id]);
      if (!existing.rowCount) {
        const error = new Error('Cliente no encontrado.');
        error.status = 404;
        throw error;
      }
      const error = new Error('El cliente no está bloqueado.');
      error.status = 409;
      throw error;
    }
    await recordAudit(db, req, 'unblock', 'clients', result.rows[0].id, { blocked: false });
    return result.rows[0];
  });
  res.json(safeClient(unblocked));
}));

app.get('/api/empresas/:id/clients', asyncRoute(async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM clients WHERE empresa_id = $1 AND blocked=FALSE ORDER BY created_at DESC',
    [req.params.id]
  );
  res.json(result.rows.map(safeClient));
}));

app.post('/api/clients', requireAdmin, asyncRoute(async (req, res) => {
  const input = parse(clientSchema, req.body);
  const encrypted = input.bankAccount ? encryptValue(input.bankAccount.replace(/[ -]/g, '')) : null;
  const created = await inTransaction(async (db) => {
    const companyId = await getDefaultCompanyId(db);
    const result = await db.query(
      `INSERT INTO clients (empresa_id, name_enc, company_enc, rut_enc, email_enc, phone_enc, risk_level, status, notes_enc, bank_account_enc)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [companyId, encryptValue(input.name), encryptValue(input.company), encryptValue(input.rut),
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
    await assertClientEditable(db, req.params.id);
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
    await assertClientEditable(db, req.params.id);
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

const serveFrontend = (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, '..', 'public') });
};
app.get('/', serveFrontend);
app.get('/*path', serveFrontend);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'El cuerpo de la solicitud no es un JSON válido.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'El cuerpo de la solicitud supera el tamaño permitido.' });
  }
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
