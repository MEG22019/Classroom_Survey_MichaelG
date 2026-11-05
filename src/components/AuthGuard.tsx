import { Navigate } from 'react-router-dom';
import { useAuthState } from '../lib/auth';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = useAuthState();

  if (!ready) {
    return <div className="flex min-h-[40vh] items-center justify-center text-slate-500">Checking session…</div>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
