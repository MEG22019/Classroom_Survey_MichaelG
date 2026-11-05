import { Link, NavLink, useNavigate } from 'react-router-dom';
import { isAuthenticated, logout } from '../pages/LoginPage';

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const auth = isAuthenticated();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight text-slate-900">
            Classroom Survey
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            {auth ? (
              <>
                <NavLink to="/dashboard" className={({ isActive }) => `transition ${isActive ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`}>
                  Dashboard
                </NavLink>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-slate-700 transition hover:bg-slate-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="rounded-md bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-500">
                Instructor Login
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
