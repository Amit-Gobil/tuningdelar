import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/config';
import { clearBidder } from '@/lib/session';

export async function POST(req) {
  const res = NextResponse.redirect(`${siteUrl(req)}/`, 303);
  clearBidder(res);
  return res;
}
