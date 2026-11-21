require('dotenv').config();

const { performance } = require('node:perf_hooks');
const { Pool } = require('pg');
const { decryptValue } = require('../src/crypto');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const query = process.argv.includes('--full')
  ? 'SELECT * FROM clients ORDER BY created_at DESC'
  : 'SELECT * FROM clients ORDER BY created_at DESC, id DESC LIMIT $1 OFFSET $2';
const limit = Number(process.env.CLIENTS_LIMIT || 50);
const offset = Number(process.env.CLIENTS_OFFSET || 0);

function mapClient(row) {
  return {
    id: row.id,
    name: decryptValue(row.name_enc),
    company: decryptValue(row.company_enc),
    rut: decryptValue(row.rut_enc),
    email: decryptValue(row.email_enc),
    phone: decryptValue(row.phone_enc),
    riskLevel: row.risk_level,
    status: row.status,
    notes: decryptValue(row.notes_enc) || '',
    bankAccountLast4: row.bank_account_enc
      ? decryptValue(row.bank_account_enc).slice(-4)
      : '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio.');

  const plan = await pool.query(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
    process.argv.includes('--full') ? [] : [limit, offset]
  );
  const queryStarted = performance.now();
  const result = await pool.query(
    query,
    process.argv.includes('--full') ? [] : [limit, offset]
  );
  const queryMs = performance.now() - queryStarted;

  const decryptStarted = performance.now();
  const clients = result.rows.map(mapClient);
  const decryptMs = performance.now() - decryptStarted;

  const serializeStarted = performance.now();
  const json = JSON.stringify(clients);
  const serializeMs = performance.now() - serializeStarted;

  console.log(JSON.stringify({
    measuredAt: new Date().toISOString(),
    rows: result.rowCount,
    queryMs: Number(queryMs.toFixed(3)),
    decryptMs: Number(decryptMs.toFixed(3)),
    serializeMs: Number(serializeMs.toFixed(3)),
    responseBytes: Buffer.byteLength(json),
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    },
    explainAnalyze: plan.rows[0]['QUERY PLAN'][0]
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(`No se pudo perfilar el listado de clientes: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
