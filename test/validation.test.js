const test = require('node:test');
const assert = require('node:assert/strict');
const { clientSchema, contractSchema, parse, userSchema } = require('../src/validation');

test('accepts a valid client and normalizes its email', () => {
  const client = parse(clientSchema, {
    name: 'Contacto de prueba',
    company: 'Empresa de prueba',
    email: 'QA@EXAMPLE.CL',
    bankAccount: '1234 5678'
  });
  assert.equal(client.email, 'qa@example.cl');
  assert.equal(client.bankAccount, '1234 5678');
});

test('rejects invalid client emails and oversized values', () => {
  assert.throws(() => parse(clientSchema, {
    name: 'Cliente',
    company: 'Empresa',
    email: 'no-es-correo',
    notes: 'x'.repeat(1001)
  }), /Invalid email|Too big/i);
});

test('uses boundary checks for contract values and date order', () => {
  const valid = {
    clientId: '1',
    number: 'AT-TEST-1',
    title: 'Contrato válido',
    value: '0',
    status: 'pendiente',
    startDate: '2026-01-01',
    endDate: '2026-01-01',
    manager: 'QA'
  };
  assert.equal(parse(contractSchema, valid).value, 0);
  assert.throws(() => parse(contractSchema, { ...valid, endDate: '2025-12-31' }), /término/i);
  assert.throws(() => parse(contractSchema, { ...valid, startDate: '2026-02-31' }), /fecha válida/i);
  assert.throws(() => parse(contractSchema, { ...valid, value: '-1' }));
});

test('enforces the documented password composition rules', () => {
  const user = {
    name: 'Usuario de prueba',
    email: 'USER@EXAMPLE.CL',
    password: 'ClaveSegura2026!',
    role: 'editor'
  };
  assert.equal(parse(userSchema, user).email, 'user@example.cl');
  assert.throws(() => parse(userSchema, { ...user, password: 'weak' }));
});

test('rejects malformed or out-of-range bank account values', () => {
  assert.throws(() => parse(clientSchema, {
    name: 'Cliente',
    company: 'Empresa',
    email: 'qa@example.cl',
    bankAccount: '<script>'
  }));
});
