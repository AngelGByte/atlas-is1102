require('dotenv').config();

const { performance } = require('node:perf_hooks');
const { Pool } = require('pg');
const { decryptValue } = require('../src/crypto');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const fullList = process.argv.includes('--full');
const query = `SELECT id, name_enc, company_enc, rut_enc, email_enc, phone_enc,
                      risk_level, status, bank_account_enc, blocked,
                      COUNT(*) OVER() AS total_count
               FROM clients WHERE blocked=FALSE
               ORDER BY created_at DESC, id DESC${fullList ? '' : ' LIMIT $1 OFFSET $2'}`;
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
    bankAccountLast4: row.bank_account_enc
      ? decryptValue(row.bank_account_enc).slice(-4)
      : '',
    blocked: row.blocked
  };
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL es obligatorio.');

  const plan = await pool.query(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
    fullList ? [] : [limit, offset]
  );
  const queryStarted = performance.now();
  const result = await pool.query(
    query,
    fullList ? [] : [limit, offset]
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
    total: result.rows[0]?.total_count ?? 0,
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
