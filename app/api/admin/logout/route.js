import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/config';
import { clearAdmin } from '@/lib/session';

export async function POST(req) {
  const res = NextResponse.redirect(`${siteUrl(req)}/admin/login`, 303);
  clearAdmin(res);
  return res;
}
