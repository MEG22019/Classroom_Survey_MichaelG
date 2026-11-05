import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AUTH_KEY = 'classroom-survey-auth';

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export function login(email: string, password: string): boolean {
  if (!email.trim() || !password.trim()) return false;
  localStorage.setItem(AUTH_KEY, 'true');
  return true;
}

export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (login(email, password)) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">
        <h1 className="mb-6 text-3xl font-bold text-slate-900">Instructor Login</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none ring-0 transition focus:border-indigo-500"
              placeholder="instructor@school.edu"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none ring-0 transition focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition hover:bg-indigo-500">
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}
