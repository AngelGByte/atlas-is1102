const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
require('dotenv').config();

const configured = Boolean(process.env.TEST_DATABASE_URL);

test('API login, roles, data protection and audit trail', { skip: !configured }, async (t) => {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'integration-test-jwt-secret-2026';
  process.env.DATA_ENCRYPTION_SECRET = process.env.DATA_ENCRYPTION_SECRET || 'integration-test-encryption-secret-2026';
  process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@atlas.cl';
  process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AtlasAdmin2026!';

  const { app, initializeDatabase, pool } = require('../../src/server');
  await initializeDatabase();
  const adminLogin = await request(app).post('/api/auth/login').send({
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  });
  assert.equal(adminLogin.status, 200);
  const adminToken = adminLogin.body.token;
  const createdEmail = `integration-${Date.now()}@example.cl`;
  let editorId;
  let clientId;

  t.after(async () => {
    if (clientId) await pool.query('DELETE FROM clients WHERE id=$1', [clientId]);
    if (createdEmail) await pool.query('DELETE FROM users WHERE email=$1', [createdEmail]);
    await pool.end();
  });

  const editor = await request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`).send({
    name: 'Editor de integración',
    email: createdEmail,
    password: 'Integration2026!',
    role: 'editor'
  });
  assert.equal(editor.status, 201);
  editorId = editor.body.id;

  const createClient = await request(app).post('/api/clients')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Cliente integración',
      company: 'Prueba automatizada',
      email: `client-${Date.now()}@example.cl`,
      bankAccount: '001234567890',
      riskLevel: 'bajo'
    });
  assert.equal(createClient.status, 201);
  clientId = createClient.body.id;
  assert.equal(createClient.body.bankAccountLast4, '7890');

  const stored = await pool.query(
    'SELECT name_enc, company_enc, email_enc, bank_account_enc FROM clients WHERE id=$1',
    [clientId]
  );
  assert.ok(stored.rows[0].bank_account_enc);
  assert.equal(stored.rows[0].bank_account_enc.includes('001234567890'), false);
  assert.equal(stored.rows[0].email_enc.includes('client-'), false);
  assert.equal(stored.rows[0].name_enc.includes('Cliente integración'), false);

  const editorLogin = await request(app).post('/api/auth/login').send({
    email: createdEmail,
    password: 'Integration2026!'
  });
  assert.equal(editorLogin.status, 200);
  const forbidden = await request(app).post('/api/clients')
    .set('Authorization', `Bearer ${editorLogin.body.token}`)
    .send({ name: 'No permitido', company: 'Empresa', email: 'blocked@example.cl' });
  assert.equal(forbidden.status, 403);

  const audit = await request(app).get('/api/audit').set('Authorization', `Bearer ${adminToken}`);
  assert.equal(audit.status, 200);
  assert.ok(audit.body.some((entry) => entry.entity === 'clients' && entry.entity_id === clientId));

  const revoked = await request(app).patch(`/api/users/${editorId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ active: false });
  assert.equal(revoked.status, 200);
  const revokedRequest = await request(app).get('/api/clients')
    .set('Authorization', `Bearer ${editorLogin.body.token}`);
  assert.equal(revokedRequest.status, 401);
});
