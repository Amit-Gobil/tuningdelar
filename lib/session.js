import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const BIDDER_COOKIE = 'ba_bidder';
const ADMIN_COOKIE = 'ba_admin';
const OIDC_COOKIE = 'ba_oidc';

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET saknas eller är för kort.');
  return new TextEncoder().encode(s);
}

const baseCookie = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/'
};

async function sign(payload, maxAgeSec, audience) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setAudience(audience)
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSec)
    .sign(secret());
}

async function verify(token, audience) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { audience, algorithms: ['HS256'] });
    return payload;
  } catch {
    return null;
  }
}

// ---- Bidder (logged in with BankID) ----
const BIDDER_MAX_AGE = 60 * 60 * 12; // 12 h

export async function setBidderSession(res, bidder) {
  const token = await sign({ bid: bidder.id, name: bidder.name }, BIDDER_MAX_AGE, 'bidder');
  res.cookies.set(BIDDER_COOKIE, token, { ...baseCookie, maxAge: BIDDER_MAX_AGE });
}

export async function getBidder() {
  const store = await cookies();
  const p = await verify(store.get(BIDDER_COOKIE)?.value, 'bidder');
  return p ? { id: p.bid, name: p.name } : null;
}

export function clearBidder(res) {
  res.cookies.set(BIDDER_COOKIE, '', { ...baseCookie, maxAge: 0 });
}

// ---- Admin ----
const ADMIN_MAX_AGE = 60 * 60 * 8; // 8 h

export async function setAdminSession(res) {
  const token = await sign({ admin: true }, ADMIN_MAX_AGE, 'admin');
  res.cookies.set(ADMIN_COOKIE, token, { ...baseCookie, sameSite: 'strict', maxAge: ADMIN_MAX_AGE });
}

export async function isAdmin() {
  const store = await cookies();
  const p = await verify(store.get(ADMIN_COOKIE)?.value, 'admin');
  return Boolean(p?.admin);
}

export function clearAdmin(res) {
  res.cookies.set(ADMIN_COOKIE, '', { ...baseCookie, sameSite: 'strict', maxAge: 0 });
}

// ---- Short-lived OIDC state (PKCE verifier, state, nonce, return path) ----
export async function setOidcState(res, data) {
  const token = await sign(data, 600, 'oidc');
  res.cookies.set(OIDC_COOKIE, token, { ...baseCookie, maxAge: 600 });
}

export async function readOidcState() {
  const store = await cookies();
  return verify(store.get(OIDC_COOKIE)?.value, 'oidc');
}

export function clearOidcState(res) {
  res.cookies.set(OIDC_COOKIE, '', { ...baseCookie, maxAge: 0 });
}

// Only allow same-site relative return paths.
export function safeNext(next) {
  if (typeof next !== 'string') return '/';
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/';
  return next;
}
