import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getBidder } from '@/lib/session';
import { db } from '@/lib/supabase';
import { getImages, isUuid } from '@/lib/auctions';
import ListingEditor from '@/components/ListingEditor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Redigera annons' };

export default async function EditMyListing({ params }) {
  const user = await getBidder();
  const { id } = await params;
  if (!user) redirect(`/logga-in?next=/konto/annons/${id}`);
  if (!isUuid(id)) notFound();
  const { data: listing } = await db().from('auctions').select('*').eq('id', id).maybeSingle();
  if (!listing || listing.seller_id !== user.id) notFound();
  const images = await getImages(id);
  return (
    <div className="wrap" style={{ paddingTop: 28 }}>
      <div style={{ marginBottom: 12 }}><Link href="/konto">← Mitt konto</Link></div>
      <ListingEditor initial={listing} initialImages={images} backHref="/konto" />
    </div>
  );
}
