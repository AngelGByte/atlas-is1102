const { createCipheriv, createDecipheriv, createHash, randomBytes } = require('node:crypto');

function getEncryptionKey(secret = process.env.DATA_ENCRYPTION_SECRET) {
  if (!secret || secret.length < 24) {
    throw new Error('DATA_ENCRYPTION_SECRET must contain at least 24 characters.');
  }

  return createHash('sha256').update(secret, 'utf8').digest();
}

function encryptValue(value, secret) {
  if (!value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);

  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

function decryptValue(value, secret) {
  if (!value) return null;
  const [ivPart, tagPart, encryptedPart] = value.split('.');
  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error('Encrypted value has an invalid format.');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(secret),
    Buffer.from(ivPart, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

module.exports = { decryptValue, encryptValue, getEncryptionKey };
