export default function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-72px)] items-center justify-center px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-soft">
        <h1 className="text-3xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-3 text-slate-500">The page you requested does not exist.</p>
      </div>
    </div>
  );
}
