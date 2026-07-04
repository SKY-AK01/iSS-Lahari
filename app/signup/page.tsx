'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      let msg = error.message;
      if (!msg || msg === '{}') msg = "Signup failed. This email might already be registered.";
      setError(msg);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--bg)' }}>
        <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '3rem', textAlign: 'center', background: '#FFDE00', border: '3px solid #000', boxShadow: '8px 8px 0px 0px #000' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem', color: '#000' }}>
            <CheckCircle2 size={64} strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '0.75rem', color: '#000' }}>DONE.</h2>
          <p style={{ marginBottom: '2rem', fontSize: '0.95rem', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', color: '#000', letterSpacing: '0.02em' }}>
            Account created — you can now log in. Ask your mentor to assign your role.
          </p>
          <a href="/login" className="btn" style={{ display: 'inline-flex', justifyContent: 'center', background: '#000', color: '#FFDE00', border: '3px solid #000', boxShadow: '4px 4px 0 0 rgba(0,0,0,0.3)' }}>
            Go to Login →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      background: 'var(--bg)',
    }}>
      {/* Left panel */}
      <div style={{
        borderRight: '3px solid #000',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '3rem',
        background: '#FF3B00',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ClipboardCheck size={32} strokeWidth={2.5} color="#FFF" />
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.5rem', letterSpacing: '-0.04em', textTransform: 'uppercase', color: '#FFF' }}>
            Lahari<span style={{ color: '#FFDE00' }}>.</span>
          </span>
        </div>
        <div>
          <h1 style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', lineHeight: 0.95, color: '#FFF', marginBottom: '1.5rem' }}>
            JOIN<br/>THE<br/>GRIND.
          </h1>
          <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FFF', opacity: 0.8 }}>
            Create your free account
          </p>
        </div>
        <div style={{ borderTop: '3px solid rgba(255,255,255,0.4)', paddingTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          IIS & SSC CGL PREPARATION.
        </div>
      </div>

      {/* Right panel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>SIGN UP</h2>
            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.85rem', color: 'var(--cream-dim)' }}>
              Create your account
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
              <AlertTriangle size={18} /> <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input id="name" type="text" className="input" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input id="signup-email" type="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input id="signup-password" type="password" className="input" placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" minLength={6} />
            </div>
            <button id="signup-submit" type="submit" className="btn btn-primary w-full" disabled={loading} style={{ justifyContent: 'center', padding: '1.25rem', marginTop: '0.5rem' }}>
              {loading ? <>Creating…</> : 'Create account →'}
            </button>
          </form>

          <div className="divider" style={{ margin: '2rem 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--cream-dim)' }}>Have an account?</p>
            <a href="/login" className="btn btn-ghost btn-sm">Sign in →</a>
          </div>
        </div>
      </div>

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
