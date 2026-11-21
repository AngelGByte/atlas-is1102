const { Pool } = require('pg');
const { decryptValue, encryptValue, getEncryptionKey } = require('../src/crypto');

const LOAD_CLIENTS = 500;
const COMPANY_NAME = 'Empresa sintética para carga EP5';
const CLIENT_PREFIX = 'Cliente sintético EP5 carga ';
const cleanup = process.argv.includes('--clean');

async function main() {
  getEncryptionKey();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = await pool.connect();

  try {
    await db.query('BEGIN');
    const company = await db.query(
      `INSERT INTO companies (name) VALUES ($1)
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [COMPANY_NAME]
    );
    const companyId = company.rows[0].id;
    const existing = await db.query(
      'SELECT id, name_enc FROM clients WHERE empresa_id = $1',
      [companyId]
    );
    const syntheticRows = existing.rows.filter(({ name_enc }) =>
      decryptValue(name_enc).startsWith(CLIENT_PREFIX)
    );

    if (syntheticRows.length !== existing.rowCount) {
      throw new Error('La empresa de carga contiene datos ajenos a la prueba; no se modificó.');
    }

    if (cleanup) {
      if (syntheticRows.length) {
        const ids = syntheticRows.map(({ id }) => id);
        const contracts = await db.query(
          'SELECT COUNT(*)::int AS count FROM contracts WHERE client_id = ANY($1::bigint[])',
          [ids]
        );
        if (contracts.rows[0].count) {
          throw new Error('Hay contratos asociados a datos de carga; no se eliminaron.');
        }
        await db.query('DELETE FROM clients WHERE id = ANY($1::bigint[])', [ids]);
      }
      await db.query('COMMIT');
      console.log(`OK: eliminados ${syntheticRows.length} clientes sintéticos.`);
      return;
    }

    if (syntheticRows.length === LOAD_CLIENTS) {
      await db.query('COMMIT');
      console.log(`OK: ya existen ${LOAD_CLIENTS} clientes sintéticos.`);
      return;
    }

    if (syntheticRows.length) {
      const ids = syntheticRows.map(({ id }) => id);
      await db.query('DELETE FROM clients WHERE id = ANY($1::bigint[])', [ids]);
    }

    const values = [];
    const rows = [];
    for (let index = 1; index <= LOAD_CLIENTS; index += 1) {
      const suffix = String(index).padStart(4, '0');
      const fields = [
        companyId,
        encryptValue(`${CLIENT_PREFIX}${suffix}`),
        encryptValue(COMPANY_NAME),
        encryptValue(`SYN-EP5-${suffix}`),
        encryptValue(`ep5-load-${suffix}@example.invalid`),
        encryptValue(`+5690000${suffix}`),
        'medio',
        'activo',
        encryptValue(`Registro sintético para pruebas de carga EP5 ${suffix}`)
      ];
      const offset = values.length;
      values.push(...fields);
      rows.push(`(${fields.map((_, field) => `$${offset + field + 1}`).join(', ')})`);
    }

    await db.query(
      `INSERT INTO clients
       (empresa_id, name_enc, company_enc, rut_enc, email_enc, phone_enc, risk_level, status, notes_enc)
       VALUES ${rows.join(', ')}`,
      values
    );
    await db.query('COMMIT');
    console.log(`OK: creados ${LOAD_CLIENTS} clientes sintéticos.`);
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('No se pudo preparar el conjunto de carga:', error.message);
  process.exitCode = 1;
});
