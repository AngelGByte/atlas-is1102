const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
require('dotenv').config();

const configured = Boolean(process.env.TEST_DATABASE_URL);

test('API CRUD, roles, data protection and audit trail', { skip: !configured }, async (t) => {
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
  const malformedJson = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send('{"email":');
  assert.equal(malformedJson.status, 400);
  assert.deepEqual(malformedJson.body, { message: 'El cuerpo de la solicitud no es un JSON válido.' });
  const oversizedJson = await request(app)
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send(`{"payload":"${'x'.repeat(150 * 1024)}"}`);
  assert.equal(oversizedJson.status, 413);
  assert.deepEqual(oversizedJson.body, { message: 'El cuerpo de la solicitud supera el tamaño permitido.' });

  const originalPoolQuery = pool.query;
  pool.query = function (query, ...values) {
    if (query === 'SELECT 1') {
      const error = new Error('detalle interno simulado');
      error.code = 'XX000';
      return Promise.reject(error);
    }
    return originalPoolQuery.call(this, query, ...values);
  };
  let internalError;
  try {
    internalError = await request(app).get('/api/health');
  } finally {
    pool.query = originalPoolQuery;
  }
  assert.equal(internalError.status, 500);
  assert.deepEqual(internalError.body, { message: 'Ocurrió un error interno. Inténtalo nuevamente.' });

  const invalidIdRoutes = [
    ['get', '/api/empresas/invalid/clients'],
    ['put', '/api/clients/invalid', {}],
    ['delete', '/api/clients/invalid'],
    ['put', '/api/contracts/invalid', {}],
    ['delete', '/api/contracts/invalid'],
    ['put', '/api/documents/invalid', {}],
    ['delete', '/api/documents/invalid'],
    ['patch', '/api/users/invalid', {}]
  ];
  for (const [method, route, body] of invalidIdRoutes) {
    let invalidRequest = request(app)[method](route).set('Authorization', `Bearer ${adminToken}`);
    if (body) invalidRequest = invalidRequest.send(body);
    const invalidResponse = await invalidRequest;
    assert.equal(invalidResponse.status, 400, route);
    assert.deepEqual(invalidResponse.body, { message: 'Identificador inválido.' });
  }

  const invalidPassword = await request(app).post('/api/auth/login')
    .send({ email: process.env.ADMIN_EMAIL, password: 'incorrecta' });
  const unknownAccount = await request(app).post('/api/auth/login')
    .send({ email: 'ausente@example.cl', password: 'incorrecta' });
  assert.equal(invalidPassword.status, 401);
  assert.equal(unknownAccount.status, 401);
  assert.equal(invalidPassword.body.message, unknownAccount.body.message);

  const selfDemotion = await request(app).patch(`/api/users/${adminLogin.body.user.id}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ role: 'viewer' });
  assert.equal(selfDemotion.status, 400);
  const selfDeactivation = await request(app).patch(`/api/users/${adminLogin.body.user.id}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ active: false });
  assert.equal(selfDeactivation.status, 400);
  const adminUsers = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
  assert.equal(adminUsers.body.find((user) => user.id === adminLogin.body.user.id).role, 'admin');

  const createdEmail = `integration-${Date.now()}@example.cl`;
  let editorId;
  let clientId;
  let contractId;
  let documentId;

  t.after(async () => {
    if (documentId) await pool.query('DELETE FROM documents WHERE id=$1', [documentId]);
    if (contractId) await pool.query('DELETE FROM contracts WHERE id=$1', [contractId]);
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

  const invalidClient = await request(app).post('/api/clients')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Inválido', company: 'Empresa', email: 'correo-inválido' });
  assert.equal(invalidClient.status, 400);

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

    const editorRead = await request(app).get('/api/clients')
      .set('Authorization', `Bearer ${editorLogin.body.token}`);
    assert.equal(editorRead.status, 200);

    const contractNumber = `AT-IT-${Date.now()}`;
    const createContract = await request(app).post('/api/contracts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        clientId,
        number: contractNumber,
        title: 'Contrato de integración',
        value: 0,
        status: 'pendiente',
        startDate: '2026-10-28',
        endDate: '2026-10-28',
        manager: 'QA'
      });
    assert.equal(createContract.status, 201);
    contractId = createContract.body.id;
    assert.equal(createContract.body.value, 0);

    const updateContract = await request(app).put(`/api/contracts/${contractId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        clientId,
        number: contractNumber,
        title: 'Contrato actualizado',
        value: 100,
        status: 'activo',
        startDate: '2026-10-28',
        endDate: '2026-10-28',
        manager: 'QA'
      });
    assert.equal(updateContract.status, 200);
    assert.equal(updateContract.body.title, 'Contrato actualizado');

    const createDocument = await request(app).post('/api/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        contractId,
        name: 'Documento de integración',
        category: 'Contrato',
        fileName: 'contrato-test.pdf'
      });
    assert.equal(createDocument.status, 201);
    documentId = createDocument.body.id;

    const updateDocument = await request(app).put(`/api/documents/${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        contractId,
        name: 'Documento actualizado',
        category: 'Anexo',
        fileName: 'anexo-test.pdf',
        status: 'aprobado'
      });
    assert.equal(updateDocument.status, 200);
    assert.equal(updateDocument.body.status, 'aprobado');

    const updateClient = await request(app).put(`/api/clients/${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Cliente integración actualizado',
        company: 'Prueba automatizada',
        email: `client-${Date.now()}@example.cl`,
        riskLevel: 'medio'
      });
    assert.equal(updateClient.status, 200);
    assert.equal(updateClient.body.bankAccountLast4, '7890');

    const audit = await request(app).get('/api/audit').set('Authorization', `Bearer ${adminToken}`);
    assert.equal(audit.status, 200);
    assert.ok(audit.body.some((entry) => entry.entity === 'clients' && entry.entity_id === clientId));
    assert.ok(audit.body.some((entry) => entry.entity === 'contracts' && entry.entity_id === contractId));
    assert.ok(audit.body.some((entry) => entry.entity === 'documents' && entry.entity_id === documentId));

    assert.equal((await request(app).delete(`/api/documents/${documentId}`)
      .set('Authorization', `Bearer ${adminToken}`)).status, 204);
    documentId = null;
    assert.equal((await request(app).delete(`/api/contracts/${contractId}`)
      .set('Authorization', `Bearer ${adminToken}`)).status, 204);
    contractId = null;
    assert.equal((await request(app).delete(`/api/clients/${clientId}`)
      .set('Authorization', `Bearer ${adminToken}`)).status, 204);
    clientId = null;

    const revoked = await request(app).patch(`/api/users/${editorId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ active: false });
  assert.equal(revoked.status, 200);
  const revokedRequest = await request(app).get('/api/clients')
    .set('Authorization', `Bearer ${editorLogin.body.token}`);
  assert.equal(revokedRequest.status, 401);
});
