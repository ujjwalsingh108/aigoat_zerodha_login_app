/**
 * lib/supabase.js
 * Stores Kite tokens in Supabase table `kite_tokens`.
 *
 * Table schema (already exists in Supabase):
 *
 *   CREATE TABLE public.kite_tokens (
 *     id          bigserial PRIMARY KEY,
 *     access_token text NOT NULL,
 *     created_at  timestamptz NOT NULL DEFAULT now(),
 *     expires_at  timestamptz NOT NULL
 *   );
 */

import { createClient } from '@supabase/supabase-js';

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient(url, key);
}

/**
 * Inserts a new token row. expires_at = next day 3:00 AM IST.
 * Returns the created row.
 */
async function storeToken({ access_token, expires_at }) {
  const supabase = getClient();

  const { data, error } = await supabase
    .from('kite_tokens')
    .insert({ access_token, expires_at })
    .select()
    .single();

  if (error) throw new Error(`Supabase insert failed: ${error.message}`);
  return data;
}

export { storeToken };
