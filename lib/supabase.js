import { createClient } from '@supabase/supabase-js';

let client;

// Server-only client. Uses the service role key, which never reaches the browser.
export function db() {
  if (client) return client;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase är inte konfigurerat (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY saknas).');
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return client;
}

export const IMAGE_BUCKET = 'car-images';
