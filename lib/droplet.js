/**
 * lib/droplet.js
 * Sends the new access_token to the DigitalOcean Droplet API endpoint.
 *
 * Your droplet should expose:
 *   POST /api/update-env
 *   Headers: { Authorization: "Bearer <DROPLET_API_KEY>" }
 *   Body:    { key: "KITE_ACCESS_TOKEN", value: "<token>" }
 */

/** Updates the KITE_ACCESS_TOKEN on the remote droplet. */
async function updateDropletEnv(accessToken) {
  const apiUrl = process.env.DROPLET_API_URL;
  const apiKey = process.env.DROPLET_API_KEY;

  // Skip silently if droplet is not configured
  if (!apiUrl || !apiKey) return { skipped: true, reason: 'DROPLET_API_URL/KEY not configured' };

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key: 'KITE_ACCESS_TOKEN', value: accessToken }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Droplet API responded ${res.status}: ${text}`);
  }

  return res.json();
}

export { updateDropletEnv };
