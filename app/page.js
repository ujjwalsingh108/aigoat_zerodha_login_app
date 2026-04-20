'use client';

import { useState } from 'react';

// ── Step IDs ──────────────────────────────────────────────────────────────────
const STEP_INIT = 'init';
const STEP_PASTE = 'paste';
const STEP_DONE = 'done';
const STEP_ERROR = 'error';

// ── Inline styles ─────────────────────────────────────────────────────────────
const s = {
  page: {
    fontFamily: 'system-ui, sans-serif',
    maxWidth: 540,
    margin: '72px auto',
    padding: '0 20px',
  },
  h1: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  sub: { color: '#555', fontSize: 14, marginBottom: 28 },
  card: {
    border: '1px solid #ddd',
    borderRadius: 10,
    padding: 32,
    background: '#fff',
    boxShadow: '0 1px 4px rgba(0,0,0,.06)',
  },
  stepBar: { display: 'flex', gap: 24, marginBottom: 28 },
  stepItem: { display: 'flex', alignItems: 'center', gap: 8 },
  dot: (active, done) => ({
    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
    background: done ? '#4caf50' : active ? '#1976d2' : '#ccc',
  }),
  stepLabel: (active) => ({
    fontSize: 13,
    fontWeight: active ? 700 : 400,
    color: active ? '#1976d2' : '#888',
  }),
  hint: { fontSize: 14, color: '#444', marginBottom: 20, lineHeight: 1.55 },
  label: { display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6 },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 13,
    fontFamily: 'monospace',
    border: '1px solid #bbb',
    borderRadius: 6,
    marginBottom: 16,
    outline: 'none',
  },
  btn: (color = '#1976d2') => ({
    padding: '10px 22px',
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  }),
  btnDisabled: { opacity: 0.55, cursor: 'not-allowed' },
  successBox: {
    background: '#f0faf3',
    border: '1px solid #66bb6a',
    borderRadius: 8,
    padding: '16px 20px',
    marginBottom: 20,
  },
  errorBox: {
    background: '#fff5f5',
    border: '1px solid #ef9a9a',
    borderRadius: 8,
    padding: '16px 20px',
    color: '#c62828',
    marginTop: 16,
  },
  badge: (ok) => ({
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 4,
    marginRight: 6,
    marginTop: 10,
    background: ok ? '#c8e6c9' : '#fff3e0',
    color: ok ? '#2e7d32' : '#e65100',
  }),
  tokenBox: {
    marginTop: 16,
    background: '#f5f5f5',
    borderRadius: 6,
    padding: '12px 14px',
    fontFamily: 'monospace',
    fontSize: 12,
    wordBreak: 'break-all',
    color: '#333',
  },
};

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ['Start login', 'Paste URL', 'Done'];
  const order = [STEP_INIT, STEP_PASTE, STEP_DONE];
  const current = order.indexOf(step === STEP_ERROR ? STEP_PASTE : step);

  return (
    <div style={s.stepBar}>
      {steps.map((label, i) => (
        <div key={label} style={s.stepItem}>
          <div style={s.dot(i === current, i < current)} />
          <span style={s.stepLabel(i === current)}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [step, setStep] = useState(STEP_INIT);
  const [loginUrl, setLoginUrl] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Step 1 — get login URL, open it in new tab
  async function handleStartLogin() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/start-login', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not get login URL');
      setLoginUrl(data.loginUrl);
      window.open(data.loginUrl, '_blank', 'noopener,noreferrer');
      setStep(STEP_PASTE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 2 — exchange token
  async function handleExchangeToken() {
    if (!redirectUrl.trim()) {
      setError('Please paste the redirect URL first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUrl: redirectUrl.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Token exchange failed');
      setResult(data);
      setStep(STEP_DONE);
    } catch (err) {
      setError(err.message);
      setStep(STEP_ERROR);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep(STEP_INIT);
    setLoginUrl('');
    setRedirectUrl('');
    setResult(null);
    setError('');
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Zerodha Kite Login Helper</h1>
      <p style={s.sub}>Generates an access token and stores it in Supabase and your droplet.</p>

      <div style={s.card}>
        <StepBar step={step} />

        {/* ── Step 1: Start ─────────────────────────────────────────────── */}
        {step === STEP_INIT && (
          <div>
            <p style={s.hint}>
              Click below to open the Zerodha Kite login page. Log in with your
              credentials and TOTP, then copy the full redirect URL from the browser
              address bar.
            </p>
            <button
              style={{ ...s.btn(), ...(loading ? s.btnDisabled : {}) }}
              onClick={handleStartLogin}
              disabled={loading}
            >
              {loading ? 'Opening…' : '🔑 Login with Kite'}
            </button>
          </div>
        )}

        {/* ── Step 2: Paste URL ─────────────────────────────────────────── */}
        {(step === STEP_PASTE || step === STEP_ERROR) && (
          <div>
            <p style={s.hint}>
              After logging in, Zerodha will redirect you to a URL containing{' '}
              <code>?request_token=…</code>. Copy that full URL and paste it below.
              {loginUrl && (
                <>
                  {' '}
                  If the tab did not open,{' '}
                  <a href={loginUrl} target="_blank" rel="noreferrer">
                    click here
                  </a>
                  .
                </>
              )}
            </p>

            <label style={s.label} htmlFor="rurl">
              Full redirect URL
            </label>
            <input
              id="rurl"
              style={s.input}
              type="text"
              placeholder="https://…?request_token=abc123&status=success"
              value={redirectUrl}
              onChange={(e) => {
                setRedirectUrl(e.target.value);
                setError('');
              }}
              autoFocus
            />

            <button
              style={{ ...s.btn(), ...(loading ? s.btnDisabled : {}) }}
              onClick={handleExchangeToken}
              disabled={loading}
            >
              {loading ? 'Processing…' : 'Proceed →'}
            </button>

            {error && <div style={s.errorBox}>{error}</div>}
          </div>
        )}

        {/* ── Step 3: Done ──────────────────────────────────────────────── */}
        {step === STEP_DONE && result && (
          <div>
            <div style={s.successBox}>
              <strong>✅ Access token generated successfully!</strong>
              {result.userName && (
                <p style={{ marginTop: 8, fontSize: 14 }}>
                  Logged in as <strong>{result.userName}</strong>
                  {result.userId ? ` (${result.userId})` : ''}
                </p>
              )}
              <div>
                <span style={s.badge(result.stored?.supabase)}>
                  {result.stored?.supabase ? '✓ Supabase' : '⚠ Supabase failed'}
                </span>
                <span style={s.badge(result.stored?.droplet)}>
                  {result.stored?.droplet ? '✓ Droplet' : '⚠ Droplet failed'}
                </span>
              </div>
              {result.stored?.supabaseError && (
                <p style={{ fontSize: 12, color: '#e65100', marginTop: 6 }}>
                  Supabase: {result.stored.supabaseError}
                </p>
              )}
              {result.stored?.dropletError && (
                <p style={{ fontSize: 12, color: '#e65100', marginTop: 4 }}>
                  Droplet: {result.stored.dropletError}
                </p>
              )}
            </div>

            <label style={s.label}>Access Token</label>
            <div style={s.tokenBox}>{result.accessToken}</div>

            <button
              style={{ ...s.btn('#555'), marginTop: 20 }}
              onClick={reset}
            >
              Start Over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
