'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, AlertTriangle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      let msg = error.message;
      if (!msg || msg === '{}') msg = "Invalid email or password.";
      setError(msg);
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      background: 'var(--bg)',
    }}>
      {/* Left panel - branding */}
      <div style={{
        borderRight: '3px solid #000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem',
        background: '#FFDE00', /* Yellow panel */
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ClipboardCheck size={32} strokeWidth={2.5} color="#000" />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.04em', textTransform: 'uppercase', color: '#000' }}>
            Lahari<span style={{ color: '#FF3B00' }}>.</span>
          </span>
        </div>
        <div>
          <h1 style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', lineHeight: 0.95, color: '#000', marginBottom: '1.5rem' }}>
            EXAM<br/>PREP<br/>STUDIO.
          </h1>
          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#000', opacity: 0.7 }}>
            IIS & SSC CGL Platform
          </p>
        </div>
        <div style={{ borderTop: '3px solid #000', paddingTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: '#000', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          BUILT FOR SERIOUS STUDENTS.
        </div>
      </div>

      {/* Right panel - form */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>SIGN IN</h2>
            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.85rem', color: 'var(--cream-dim)' }}>
              Access your workspace
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
              <AlertTriangle size={18} /> <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
              style={{ justifyContent: 'center', marginTop: '0.5rem', padding: '1.25rem' }}
            >
              {loading ? <>Signing in…</> : 'Sign in →'}
            </button>
          </form>

          <div className="divider" style={{ margin: '2rem 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--cream-dim)' }}>New here?</p>
            <a href="/signup" className="btn btn-ghost btn-sm">
              Create account →
            </a>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--cream-dim)', marginTop: '1.5rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Ask your mentor to assign your role after sign-up.
          </p>
        </div>
      </div>

      {/* Mobile fallback */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr;
          }
          div[style*="border-right: 3px solid"] {
            min-height: 220px;
          }
        }
      `}</style>
    </div>
  );
}
