export const SITE_NAME = process.env.SITE_NAME || 'Tuningdelar';
export const COMPANY_NAME = process.env.COMPANY_NAME || 'Gobil AB';
export const TERMS_VERSION = '2026-11-16b';

export function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
  const url = new URL(req.url);
  const proto = req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  return `${proto}://${host}`;
}

export function bankidConfigured() {
  return Boolean(process.env.TIC_ISSUER && process.env.TIC_CLIENT_ID && process.env.TIC_CLIENT_SECRET);
}
