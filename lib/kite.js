/**
 * lib/kite.js
 * Kite login URL generation and request_token → access_token exchange.
 * Used only by Next.js API routes (server-side).
 */

import { KiteConnect } from 'kiteconnect';

function getKiteClient() {
  const apiKey = process.env.KITE_API_KEY;
  if (!apiKey) throw new Error('KITE_API_KEY is not set');
  return new KiteConnect({ api_key: apiKey });
}

/** Returns the Kite login URL. */
function getLoginURL() {
  return getKiteClient().getLoginURL();
}

/**
 * Extracts request_token from the full redirect URL.
 * e.g. https://your-redirect?request_token=abc123&status=success
 */
function extractRequestToken(redirectUrl) {
  let url;
  try {
    url = new URL(redirectUrl);
  } catch {
    throw new Error('Invalid URL. Please paste the full redirect URL from the browser.');
  }

  const token = url.searchParams.get('request_token');
  if (!token) {
    throw new Error('No request_token found in the URL. Make sure you pasted the correct redirect URL after login.');
  }
  return token;
}

/**
 * Exchanges a request_token for an access_token via Kite API.
 * Returns { access_token, refresh_token, user_id, user_name }
 */
async function exchangeToken(requestToken) {
  const apiSecret = process.env.KITE_API_SECRET;
  if (!apiSecret) throw new Error('KITE_API_SECRET is not set');

  const kite = getKiteClient();
  const session = await kite.generateSession(requestToken, apiSecret);

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token ?? null,
    user_id: session.user_id ?? null,
    user_name: session.user_name ?? null,
  };
}

export { getLoginURL, extractRequestToken, exchangeToken };
