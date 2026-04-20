'use client';

import { useState } from 'react';

const STEP_INIT  = 'init';
const STEP_PASTE = 'paste';
const STEP_DONE  = 'done';
const STEP_ERROR = 'error';

// All CSS lives in app/globals.css

function Spinner() {
  return <div className="kite-spinner" />;
}

function StepBar({ step }) {
  const labels = ['Start Login', 'Paste URL', 'Done'];
  const order  = [STEP_INIT, STEP_PASTE, STEP_DONE];
  const cur    = order.indexOf(step === STEP_ERROR ? STEP_PASTE : step);

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 36 }}>
      {labels.map((label, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < labels.length - 1 ? 1 : 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
            <div className={`step-circle ${i < cur ? 'done' : i === cur ? 'active' : 'idle'}`}>
              {i < cur ? '✓' : i + 1}
            </div>
            <span style={{
              fontSize: 11, whiteSpace: 'nowrap', letterSpacing: '.03em',
              fontWeight: i === cur ? 700 : 500,
              color: i === cur ? '#ff6600' : i < cur ? '#64748b' : '#94a3b8',
            }}>
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div className="step-connector">
              <div className="step-connector-fill" style={{ width: i < cur ? '100%' : '0%' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button className={`kite-copy-btn${copied ? ' copied' : ''}`} onClick={copy}>
      {copied ? '✓ Copied!' : '⎘ Copy'}
    </button>
  );
}

export default function Home() {
  const [step,        setStep]        = useState(STEP_INIT);
  const [loginUrl,    setLoginUrl]    = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState('');

  async function handleStartLogin() {
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/start-login', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Could not get login URL');
      setLoginUrl(data.loginUrl);
      window.open(data.loginUrl, '_blank', 'noopener,noreferrer');
      setStep(STEP_PASTE);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleExchangeToken() {
    if (!redirectUrl.trim()) { setError('Please paste the redirect URL first.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirectUrl: redirectUrl.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Token exchange failed');
      setResult(data);
      setStep(STEP_DONE);
    } catch (err) { setError(err.message); setStep(STEP_ERROR); }
    finally { setLoading(false); }
  }

  function reset() {
    setStep(STEP_INIT); setLoginUrl(''); setRedirectUrl(''); setResult(null); setError('');
  }

  const UpperLabel = ({ children }) => (
    <span style={{
      display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b',
      letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 8,
    }}>
      {children}
    </span>
  );

  const badgeClass = (val) =>
    val === true ? 'status-badge badge-ok' : val === false ? 'status-badge badge-warn' : 'status-badge badge-skip';

  const badgeLabel = (label, val) =>
    val === true ? ('\u2713 ' + label) : val === false ? ('\u26a0 ' + label) : ('\u2014 ' + label);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #fff7ed 0%, #f8fafc 45%, #eff6ff 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 60, height: 60,
          background: 'linear-gradient(135deg, #ff6600, #e85500)',
          borderRadius: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, margin: '0 auto 18px',
          boxShadow: '0 6px 20px rgba(255,102,0,.35)',
        }}>{String.fromCodePoint(0x1F510)}</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', letterSpacing: '-.03em' }}>
          Zerodha Kite Login
        </h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 7, fontWeight: 500 }}>
          Generate your access token in a few clicks
        </p>
      </div>

      <div className="kite-card">
        <StepBar step={step} />

        {step === STEP_INIT && (
          <div className="fade-up">
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
              Sign in to Kite
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65, marginBottom: 22 }}>
              Opens the official Zerodha login page. After authenticating with your
              credentials and TOTP, copy the full URL from the address bar and paste
              it in the next step.
            </p>
            <div className="kite-tip">
              <span style={{ fontSize: 19, flexShrink: 0 }}>{String.fromCodePoint(0x1F4A1)}</span>
              <p style={{ fontSize: 13, color: '#9a3412', lineHeight: 1.55 }}>
                Look for{' '}
                <code style={{ background: '#fde8d0', borderRadius: 4, padding: '1px 6px', fontSize: 12, fontWeight: 600 }}>
                  request_token=
                </code>
                {' '}in the redirect URL — paste the <strong>entire URL</strong>, not just the token.
              </p>
            </div>
            <button className="kite-btn-primary" onClick={handleStartLogin} disabled={loading}>
              {loading ? <Spinner /> : <span>{String.fromCodePoint(0x1F511)}</span>}
              {loading ? 'Opening Kite…' : 'Open Kite Login'}
            </button>
            {error && <div className="kite-error"><span>⚠️</span><span>{error}</span></div>}
          </div>
        )}

        {(step === STEP_PASTE || step === STEP_ERROR) && (
          <div className="fade-up">
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
              Paste the redirect URL
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.65, marginBottom: 22 }}>
              After login, Zerodha redirects to a URL containing{' '}
              <code style={{ background: '#f1f5f9', borderRadius: 4, padding: '1px 6px', fontSize: 12 }}>
                ?request_token=…
              </code>
              . Paste the full URL below.
              {loginUrl && (
                <>
                  {' '}Tab did not open?{' '}
                  <a href={loginUrl} target="_blank" rel="noreferrer"
                    style={{ color: '#ff6600', fontWeight: 600, textDecoration: 'none' }}>
                    Click here ↗
                  </a>
                </>
              )}
            </p>
            <UpperLabel>Full Redirect URL</UpperLabel>
            <input
              id="rurl"
              className="kite-input"
              type="text"
              placeholder="https://…?request_token=abc123&status=success"
              value={redirectUrl}
              onChange={(e) => { setRedirectUrl(e.target.value); setError(''); }}
              autoFocus
              style={{ marginBottom: 20 }}
            />
            <button className="kite-btn-primary" onClick={handleExchangeToken} disabled={loading}>
              {loading ? <Spinner /> : null}
              {loading ? 'Exchanging token…' : 'Exchange Token →'}
            </button>
            {error && <div className="kite-error"><span style={{ flexShrink: 0 }}>⚠️</span><span>{error}</span></div>}
          </div>
        )}

        {step === STEP_DONE && result && (
          <div className="fade-up">
            <div className="kite-success-box">
              <div className="pop-in" style={{
                width: 62, height: 62, margin: '0 auto 14px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 26, color: '#fff',
                boxShadow: '0 6px 18px rgba(22,163,74,.35)',
              }}>✓</div>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: '#14532d', marginBottom: 6 }}>
                Token Generated!
              </h2>
              {result.userName && (
                <p style={{ fontSize: 14, color: '#166534' }}>
                  Signed in as <strong>{result.userName}</strong>
                  {result.userId && <span style={{ color: '#4ade80' }}> · {result.userId}</span>}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
              <span className={badgeClass(result.stored?.supabase)}>
                {badgeLabel('Supabase', result.stored?.supabase)}
              </span>
              <span className={badgeClass(result.stored?.droplet)}>
                {badgeLabel('Droplet', result.stored?.droplet)}
              </span>
              {result.expiresAt && (
                <span className="status-badge badge-skip">
                  {String.fromCodePoint(0x1F550)} Expires {new Date(result.expiresAt).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              )}
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <UpperLabel>Access Token</UpperLabel>
                <CopyButton text={result.accessToken} />
              </div>
              <div className="kite-token-box">{result.accessToken}</div>
            </div>

            {(result.stored?.supabaseError || result.stored?.dropletError) && (
              <div className="kite-error" style={{ marginBottom: 20 }}>
                <span style={{ flexShrink: 0 }}>⚠️</span>
                <div>
                  {result.stored?.supabaseError && <div>Supabase: {result.stored.supabaseError}</div>}
                  {result.stored?.dropletError   && <div>Droplet: {result.stored.dropletError}</div>}
                </div>
              </div>
            )}

            <button className="kite-btn-ghost" onClick={reset}>↺ Start Over</button>
          </div>
        )}
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
        Token stored securely in Supabase · Droplet restarted automatically
      </p>
    </div>
  );
}