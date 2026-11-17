import crypto from 'node:crypto';

// AES-256-GCM encryption for personal identity numbers (personnummer).
function key() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY saknas.');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) throw new Error('ENCRYPTION_KEY måste vara 32 byte i base64.');
  return buf;
}

export function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decrypt(payload) {
  if (!payload) return null;
  const [v, ivB, tagB, encB] = payload.split('.');
  if (v !== 'v1') return null;
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encB, 'base64')), decipher.final()]).toString('utf8');
}

export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function pkceChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}
