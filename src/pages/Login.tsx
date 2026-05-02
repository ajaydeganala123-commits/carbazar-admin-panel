import { type FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { signInAdmin, useAdminSession } from '../lib/auth';

export default function Login() {
  const { user, loading } = useAdminSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInAdmin(email, password);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(friendlyAuthError(err?.code, err?.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700">
      <div className="w-full max-w-md mx-6">
        <div className="text-center mb-6">
          <div className="text-4xl font-extrabold text-white tracking-tight">
            CARBAZAR
          </div>
          <div className="text-brand-200 text-sm mt-1">Admin Console</div>
        </div>
        <form
          onSubmit={onSubmit}
          className="bg-white rounded-2xl shadow-2xl p-8 space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          {error && (
            <div className="text-sm rounded-lg bg-rose-50 text-rose-700 px-3 py-2 border border-rose-200">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brand-900 hover:bg-brand-800 disabled:opacity-60 text-white font-semibold py-2.5"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-xs text-ink-muted leading-relaxed pt-2">
            Sign in with the same account you marked as admin via the Flutter
            app's <em>Profile → Dev tools → Make me an admin</em> button.
          </p>
        </form>
      </div>
    </div>
  );
}

function friendlyAuthError(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email looks invalid.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email or password is incorrect.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a minute.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection.';
    default:
      return fallback || 'Sign-in failed.';
  }
}
