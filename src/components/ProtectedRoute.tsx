import { Navigate } from 'react-router-dom';

import { useAdminSession } from '../lib/auth';

interface ProtectedRouteProps {
  children: (email: string | null) => JSX.Element;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isAdmin, loading } = useAdminSession();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-muted">
        Checking permissions…
      </div>
    );
  }

  if (user == null) return <Navigate to="/login" replace />;

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="bg-white max-w-md w-full rounded-xl border border-gray-100 shadow-soft p-8 text-center">
          <div className="text-4xl mb-3">🛡️</div>
          <div className="text-lg font-bold text-ink mb-1">
            Not an admin account
          </div>
          <p className="text-sm text-ink-soft mb-4">
            <strong>{user.email}</strong> is signed in but isn't listed in the
            admins collection. To bootstrap, open the Flutter app on this same
            account, go to <em>Profile → Dev tools → Make me an admin</em>,
            then refresh this page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-brand-900 hover:bg-brand-800 text-white font-medium px-4 py-2"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return children(user.email);
}
