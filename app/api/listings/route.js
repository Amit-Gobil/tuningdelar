import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/config';
import { getBidder, isAdmin } from '@/lib/session';
import { sameOrigin } from '@/lib/admin';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Creates an empty draft for the logged-in user (or admin) and opens the editor.
export async function POST(req) {
  const base = siteUrl(req);
  if (!sameOrigin(req)) return NextResponse.redirect(`${base}/`, 303);
  const user = await getBidder();
  const admin = await isAdmin();
  const fromAdmin = new URL(req.url).searchParams.get('admin') === '1' && admin;
  if (!user && !fromAdmin) return NextResponse.redirect(`${base}/logga-in?next=/konto`, 303);

  // Limit unfinished drafts to avoid spam.
  if (user && !fromAdmin) {
    const { count } = await db().from('auctions').select('id', { count: 'exact', head: true }).eq('seller_id', user.id).eq('status', 'draft');
    if ((count || 0) >= 10) return NextResponse.redirect(`${base}/konto?error=drafts`, 303);
  }

  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 7 * 24 * 3600 * 1000);

  const { data, error } = await db()
    .from('auctions')
    .insert({
      status: 'draft',
      sale_type: 'fixed',
      seller_id: fromAdmin ? null : user.id,
      starts_at: start.toISOString(),
      ends_at: end.toISOString()
    })
    .select('id')
    .single();
  if (error) return NextResponse.redirect(`${base}/konto?error=create`, 303);
  return NextResponse.redirect(`${base}${fromAdmin ? '/admin' : '/konto/annons'}/${data.id}`, 303);
}
