import { db } from './supabase';

// Returns the conversation if the user is a participant, else null.
export async function getConversationFor(conversationId, userId) {
  if (!userId || !/^[0-9a-f-]{36}$/i.test(conversationId)) return null;
  const { data } = await db()
    .from('conversations')
    .select('id,listing_id,buyer_id,seller_id,last_message_at')
    .eq('id', conversationId)
    .maybeSingle();
  if (!data) return null;
  if (data.buyer_id !== userId && data.seller_id !== userId) return null;
  return data;
}

export async function listConversations(userId) {
  const { data } = await db()
    .from('conversations')
    .select('id,listing_id,buyer_id,seller_id,last_message_at,auctions(headline,make,model),buyer:bidders!conversations_buyer_id_fkey(name),seller:bidders!conversations_seller_id_fkey(name)')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('last_message_at', { ascending: false })
    .limit(100);
  const convs = data || [];
  if (!convs.length) return [];
  const { data: unread } = await db()
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', convs.map((c) => c.id))
    .neq('sender_id', userId)
    .is('read_at', null);
  const counts = new Map();
  for (const u of unread || []) counts.set(u.conversation_id, (counts.get(u.conversation_id) || 0) + 1);
  return convs.map((c) => ({ ...c, unread: counts.get(c.id) || 0 }));
}

export async function unreadCount(userId) {
  if (!userId) return 0;
  const { data: convs } = await db()
    .from('conversations')
    .select('id')
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
  if (!convs?.length) return 0;
  const { count } = await db()
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', convs.map((c) => c.id))
    .neq('sender_id', userId)
    .is('read_at', null);
  return count || 0;
}
