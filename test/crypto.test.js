const test = require('node:test');
const assert = require('node:assert/strict');
const { decryptValue, encryptValue } = require('../src/crypto');

const secret = 'unit-test-only-secret-value-32chars';

test('encrypts bank data so plaintext is not stored and decrypts with the key', () => {
  const account = '001234567890';
  const encrypted = encryptValue(account, secret);
  assert.ok(encrypted);
  assert.equal(encrypted.includes(account), false);
  assert.equal(decryptValue(encrypted, secret), account);
});

test('detects changed encrypted data and a wrong key', () => {
  const encrypted = encryptValue('001234567890', secret);
  const parts = encrypted.split('.');
  const ciphertext = Buffer.from(parts[2], 'base64url');
  ciphertext[0] ^= 0x01;
  parts[2] = ciphertext.toString('base64url');
  assert.throws(() => decryptValue(parts.join('.'), secret));
  assert.throws(() => decryptValue(encrypted, 'different-test-key-with-32-chars'));
});

test('requires a sufficiently long encryption secret', () => {
  assert.throws(() => encryptValue('12345678', 'short'));
});
