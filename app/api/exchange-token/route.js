/**
 * app/api/exchange-token/route.js
 * 1. Extracts request_token from the redirect URL
 * 2. Exchanges it for an access_token via Kite API
 * 3. Stores it in Supabase
 * 4. Pushes it to the DigitalOcean droplet
 */

import { extractRequestToken, exchangeToken } from '@/lib/kite';
import { storeToken } from '@/lib/supabase';
import { updateDropletEnv } from '@/lib/droplet';
import { NextResponse } from 'next/server';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Request body must be JSON.' }, { status: 400 });
  }

  const { redirectUrl } = body;
  if (!redirectUrl || typeof redirectUrl !== 'string' || !redirectUrl.trim()) {
    return NextResponse.json({ success: false, error: 'redirectUrl is required.' }, { status: 400 });
  }

  // Extract request_token
  let requestToken;
  try {
    requestToken = extractRequestToken(redirectUrl.trim());
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }

  // Exchange for access_token
  let sessionData;
  try {
    sessionData = await exchangeToken(requestToken);
  } catch (err) {
    console.error('[exchange-token] Kite error:', err.message);
    return NextResponse.json(
      { success: false, error: `Kite token exchange failed: ${err.message}` },
      { status: 502 }
    );
  }

  const { access_token, user_id, user_name } = sessionData;
  const stored = { supabase: false, droplet: false };

  // Calculate expiry: next day 3:00 AM IST (UTC+5:30)
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const now = new Date();
  const expiryIst = new Date(now.getTime() + IST_OFFSET_MS);
  expiryIst.setDate(expiryIst.getDate() + 1);
  expiryIst.setHours(3, 0, 0, 0);
  const expires_at = new Date(expiryIst.getTime() - IST_OFFSET_MS).toISOString();

  // Store in Supabase (non-fatal)
  try {
    await storeToken({ access_token, expires_at });
    stored.supabase = true;
  } catch (err) {
    console.error('[exchange-token] Supabase error:', err.message);
    stored.supabaseError = err.message;
  }

  // Update droplet env (non-fatal)
  try {
    await updateDropletEnv(access_token);
    stored.droplet = true;
  } catch (err) {
    console.error('[exchange-token] Droplet error:', err.message);
    stored.dropletError = err.message;
  }

  return NextResponse.json({
    success: true,
    accessToken: access_token,
    userId: user_id,
    userName: user_name,
    stored,
  });
}
