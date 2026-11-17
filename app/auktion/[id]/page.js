import { redirect } from 'next/navigation';

export default async function OldAuctionUrl({ params }) {
  const { id } = await params;
  redirect(`/annons/${id}`);
}
