const { spawnSync } = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const { closeSync, openSync, unlinkSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const dbUser = process.env.PGUSER || process.env.POSTGRES_USER || 'atlas';
const dbName = process.env.PGDATABASE || process.env.POSTGRES_DB || 'atlas';
const backupPath = join(tmpdir(), `atlas-backup-${randomUUID()}.dump`);
let mode = 'local';
let restoreDatabase;
let restoreDatabaseCreated = false;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    ...options
  });
  if (result.error) {
    throw new Error(`No fue posible ejecutar ${command}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || '').trim();
    throw new Error(`${command} terminó con código ${result.status}${detail ? `: ${detail}` : '.'}`);
  }
  if (typeof result.stdout !== 'string') {
    return '';
  }
  return result.stdout.replace(/\r\n/g, '\n').replace(/\n$/, '');
}

function dockerComposeDatabase() {
  const result = spawnSync('docker', ['compose', 'ps', '--status', 'running', '-q', 'db'], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024
  });
  return !result.error && result.status === 0 && result.stdout.trim().length > 0;
}

function requireLocalTools() {
  for (const tool of ['pg_dump', 'pg_restore', 'psql', 'createdb', 'dropdb']) {
    const locator = process.platform === 'win32' ? 'where.exe' : 'which';
    const result = spawnSync(locator, [tool], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
    if (result.error || result.status !== 0) {
      throw new Error(
        `Falta ${tool}; instala las herramientas cliente de PostgreSQL o define PG_CONTAINER.`
      );
    }
  }
  if (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGDATABASE) {
    throw new Error('Define PGHOST, PGUSER y PGDATABASE (PGPORT es opcional).');
  }
}

function dbTool(command, args, options) {
  if (mode === 'container') {
    return run('docker', ['exec', '-i', process.env.PG_CONTAINER, command, ...args], options);
  }
  if (mode === 'compose') {
    return run('docker', ['compose', 'exec', '-T', 'db', command, ...args], options);
  }
  return run(command, args, options);
}

function psql(database, sql) {
  const args = ['-U', dbUser, '-d', database, '-qAtX', '-c', sql];
  if (mode === 'local') {
    return run('psql', ['-d', database, '-qAtX', '-c', sql]);
  }
  return dbTool('psql', args);
}

function createBackup() {
  const fd = openSync(backupPath, 'w', 0o600);
  try {
    dbTool('pg_dump', ['-Fc', '-U', dbUser, '-d', dbName], { stdio: ['ignore', fd, 'pipe'] });
  } finally {
    closeSync(fd);
  }
}

function restoreBackup() {
  const fd = openSync(backupPath, 'r');
  try {
    dbTool(
      'pg_restore',
      ['-U', dbUser, '--no-owner', '--no-acl', '-d', restoreDatabase],
      { stdio: [fd, 'ignore', 'pipe'] }
    );
  } finally {
    closeSync(fd);
  }
}

function countTables() {
  const tables = psql(
    dbName,
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
  ).split('\n').filter(Boolean);
  if (!tables.length) {
    throw new Error('No se encontraron tablas para comparar.');
  }

  let hasDifference = false;
  for (const table of tables) {
    const escaped = table.replace(/"/g, '""');
    const query = `SELECT COUNT(*) FROM public."${escaped}"`;
    const originalCount = psql(dbName, query);
    const restoredCount = psql(restoreDatabase, query);
    if (originalCount === restoredCount) {
      console.log(`OK tabla ${table}: ${originalCount} registros`);
    } else {
      console.log(`DIFERENCIA tabla ${table}: origen=${originalCount} restaurado=${restoredCount}`);
      hasDifference = true;
    }
  }
  return hasDifference;
}

function usersHash(database) {
  const rows = psql(
    database,
    "SELECT COALESCE(string_agg(row_to_json(users)::text, E'\\n' ORDER BY id), '') FROM users"
  );
  return createHash('sha256').update(rows).digest('hex');
}

function cleanup() {
  let failed = false;
  if (restoreDatabaseCreated) {
    try {
      dbTool('dropdb', ['--if-exists', '-U', dbUser, restoreDatabase]);
    } catch (error) {
      console.error(`ERROR: no fue posible eliminar la base temporal de restauración: ${error.message}`);
      failed = true;
    }
  }
  try {
    unlinkSync(backupPath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`ERROR: no fue posible eliminar el archivo temporal de respaldo: ${error.message}`);
      failed = true;
    }
  }
  return failed;
}

function main() {
  if (process.env.PG_CONTAINER) {
    const dockerCheck = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024
    });
    if (dockerCheck.error || dockerCheck.status !== 0) {
      throw new Error('PG_CONTAINER requiere una CLI de Docker disponible.');
    }
    mode = 'container';
  } else if (dockerComposeDatabase()) {
    mode = 'compose';
  } else {
    requireLocalTools();
  }

  restoreDatabase = `atlas_restore_test_${process.pid}_${randomUUID().replace(/-/g, '')}`;
  createBackup();
  dbTool('createdb', ['-U', dbUser, restoreDatabase]);
  restoreDatabaseCreated = true;
  restoreBackup();

  const hasTableDifference = countTables();
  if (usersHash(dbName) === usersHash(restoreDatabase)) {
    console.log('OK hash de users coincide (valor omitido).');
  } else {
    console.log('DIFERENCIA: hash de users no coincide.');
    process.exitCode = 1;
  }
  if (hasTableDifference) {
    process.exitCode = 1;
  }
  if (process.exitCode !== 1) {
    console.log(`OK: respaldo y restauración verificados (${mode}).`);
  }
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (cleanup()) {
    process.exitCode = 1;
  }
}
