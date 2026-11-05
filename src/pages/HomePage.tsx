import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-soft">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Classroom Survey</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Quick in-class understanding checks</h1>
        <p className="mt-4 text-lg text-slate-600">Create surveys, open them to students, collect responses, and review the results with a fast mobile-friendly workflow.</p>
        <div className="mt-8 flex justify-center">
          <Link to="/login" className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-500">
            Instructor Login
          </Link>
        </div>
      </div>
    </div>
  );
}
