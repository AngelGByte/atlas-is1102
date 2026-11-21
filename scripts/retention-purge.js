require('dotenv').config();

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL es obligatorio para la depuración de auditoría.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const retentionDays = process.env.AUDIT_RETENTION_DAYS === undefined
  ? 365
  : Number(process.env.AUDIT_RETENTION_DAYS);

async function purgeAuditLogs() {
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 1) {
    throw new Error('AUDIT_RETENTION_DAYS debe ser un entero positivo.');
  }

  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const deleted = await db.query(
      `DELETE FROM audit_logs
       WHERE created_at < NOW() - ($1::int * INTERVAL '1 day')
       RETURNING id`,
      [retentionDays]
    );
    await db.query(
      `INSERT INTO audit_logs (actor_email, action, entity, details)
       VALUES ($1, 'purge', 'audit_logs', $2)`,
      ['sistema-retencion@atlas.local', {
        retentionDays,
        deletedCount: deleted.rowCount
      }]
    );
    await db.query('COMMIT');
    console.log(`Depuración completada: ${deleted.rowCount} registros; plazo ${retentionDays} días.`);
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}

purgeAuditLogs()
  .catch((error) => {
    console.error(`No fue posible depurar la auditoría: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
