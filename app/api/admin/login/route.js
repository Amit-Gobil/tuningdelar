import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/config';
import { setAdminSession, clearAdmin } from '@/lib/session';
import { safeEqual } from '@/lib/crypto';
import { sameOrigin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const base = siteUrl(req);
  if (!sameOrigin(req)) return NextResponse.redirect(`${base}/admin/login?error=1`, 303);

  const form = await req.formData();
  const password = String(form.get('password') || '');
  const expected = process.env.ADMIN_PASSWORD;

  // Slow down guessing.
  await new Promise((r) => setTimeout(r, 600));

  if (!expected || expected.length < 10) {
    return NextResponse.redirect(`${base}/admin/login?error=setup`, 303);
  }
  if (!safeEqual(password, expected)) {
    return NextResponse.redirect(`${base}/admin/login?error=1`, 303);
  }
  const res = NextResponse.redirect(`${base}/admin`, 303);
  await setAdminSession(res);
  return res;
}

export async function DELETE(req) {
  const res = NextResponse.json({ ok: true });
  if (sameOrigin(req)) clearAdmin(res);
  return res;
}
