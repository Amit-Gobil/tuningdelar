import { NextResponse } from 'next/server';
import { bankidConfigured, siteUrl } from '@/lib/config';
import { authorizeUrl } from '@/lib/oidc';
import { randomToken, pkceChallenge } from '@/lib/crypto';
import { setOidcState, safeNext } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const base = siteUrl(req);
  const next = safeNext(new URL(req.url).searchParams.get('next') || '/');
  if (!bankidConfigured()) {
    return NextResponse.redirect(`${base}/logga-in?error=not_configured`, 303);
  }
  try {
    const state = randomToken();
    const nonce = randomToken();
    const verifier = randomToken(48);
    const redirectUri = `${base}/api/auth/callback`;
    const url = await authorizeUrl({ redirectUri, state, nonce, codeChallenge: pkceChallenge(verifier) });
    const res = NextResponse.redirect(url, 303);
    await setOidcState(res, { state, nonce, verifier, next });
    return res;
  } catch (e) {
    console.error('login start failed', e);
    return NextResponse.redirect(`${base}/logga-in?error=failed&next=${encodeURIComponent(next)}`, 303);
  }
}
