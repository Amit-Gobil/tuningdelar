import { createRemoteJWKSet, jwtVerify } from 'jose';

// tic.io Identity – OpenID Connect (Authorization Code + PKCE).
// TIC_ISSUER example: https://id.tic.io/<din-tenant>

let discoveryCache;
let jwks;

export async function discovery() {
  if (discoveryCache && discoveryCache.expires > Date.now()) return discoveryCache.doc;
  const issuer = process.env.TIC_ISSUER.replace(/\/$/, '');
  const res = await fetch(`${issuer}/.well-known/openid-configuration`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`OIDC discovery misslyckades (${res.status})`);
  const doc = await res.json();
  discoveryCache = { doc, expires: Date.now() + 60 * 60 * 1000 };
  jwks = createRemoteJWKSet(new URL(doc.jwks_uri));
  return doc;
}

export async function authorizeUrl({ redirectUri, state, nonce, codeChallenge }) {
  const d = await discovery();
  const u = new URL(d.authorization_endpoint);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', process.env.TIC_CLIENT_ID);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('scope', process.env.TIC_SCOPES || 'openid profile nin');
  u.searchParams.set('state', state);
  u.searchParams.set('nonce', nonce);
  u.searchParams.set('code_challenge', codeChallenge);
  u.searchParams.set('code_challenge_method', 'S256');
  u.searchParams.set('ui_locales', 'sv');
  return u.toString();
}

export async function exchangeCode({ code, redirectUri, codeVerifier }) {
  const d = await discovery();
  const methods = d.token_endpoint_auth_methods_supported || ['client_secret_basic'];
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier
  });
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
  if (methods.includes('client_secret_post') && !methods.includes('client_secret_basic')) {
    body.set('client_id', process.env.TIC_CLIENT_ID);
    body.set('client_secret', process.env.TIC_CLIENT_SECRET);
  } else {
    const basic = Buffer.from(
      `${encodeURIComponent(process.env.TIC_CLIENT_ID)}:${encodeURIComponent(process.env.TIC_CLIENT_SECRET)}`
    ).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }
  const res = await fetch(d.token_endpoint, { method: 'POST', headers, body, cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Tokenutbyte misslyckades (${res.status}) ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function verifyIdToken(idToken, expectedNonce) {
  const d = await discovery();
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: d.issuer,
    audience: process.env.TIC_CLIENT_ID
  });
  if (payload.nonce !== expectedNonce) throw new Error('Ogiltig nonce');
  return payload;
}

export async function userInfo(accessToken) {
  const d = await discovery();
  if (!d.userinfo_endpoint) return {};
  const res = await fetch(d.userinfo_endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store'
  });
  if (!res.ok) return {};
  return res.json();
}
