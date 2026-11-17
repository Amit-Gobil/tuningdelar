import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/config';
import { exchangeCode, verifyIdToken, userInfo } from '@/lib/oidc';
import { readOidcState, clearOidcState, setBidderSession } from '@/lib/session';
import { encrypt } from '@/lib/crypto';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const base = siteUrl(req);
  const params = new URL(req.url).searchParams;
  const saved = await readOidcState();
  const next = saved?.next || '/';
  const fail = (code) => {
    const res = NextResponse.redirect(`${base}/logga-in?error=${code}&next=${encodeURIComponent(next)}`, 303);
    clearOidcState(res);
    return res;
  };

  if (params.get('error')) return fail('cancelled');
  const code = params.get('code');
  const state = params.get('state');
  if (!saved || !code || !state || state !== saved.state) return fail('state');

  try {
    const redirectUri = `${base}/api/auth/callback`;
    const tokens = await exchangeCode({ code, redirectUri, codeVerifier: saved.verifier });
    const claims = await verifyIdToken(tokens.id_token, saved.nonce);

    let name = claims.name || [claims.given_name, claims.family_name].filter(Boolean).join(' ');
    let nin = claims.nin;
    if ((!name || !nin) && tokens.access_token) {
      const info = await userInfo(tokens.access_token);
      name = name || info.name || [info.given_name, info.family_name].filter(Boolean).join(' ');
      nin = nin || info.nin;
    }
    if (!claims.sub) throw new Error('sub saknas i ID-token');

    const { data: bidder, error } = await db()
      .from('bidders')
      .upsert(
        {
          sub: String(claims.sub),
          name: name || 'Verifierad budgivare',
          nin_enc: nin ? encrypt(nin) : null,
          last_login_at: new Date().toISOString()
        },
        { onConflict: 'sub' }
      )
      .select('id,name')
      .single();
    if (error) throw error;

    const res = NextResponse.redirect(`${base}${next}`, 303);
    clearOidcState(res);
    await setBidderSession(res, bidder);
    return res;
  } catch (e) {
    console.error('login callback failed', e);
    return fail('failed');
  }
}
