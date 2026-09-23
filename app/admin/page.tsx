'use client';

import { useEffect, useState } from 'react';

type HealthState = {
  status: string;
  database: string;
  host?: string;
  port?: number;
  message?: string;
};

export default function AdminPage() {
  const [health, setHealth] = useState<HealthState | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshHealth() {
    setLoading(true);
    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      setHealth(await response.json());
    } catch {
      setHealth({ status: 'error', database: 'api-unavailable', message: 'Health API unavailable' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshHealth();
  }, []);

  const isHealthy = health?.database === 'reachable';

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Malir Cantt Fix It</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Admin portal</h1>
            <p className="mt-2 text-slate-400">System status and service operations.</p>
          </div>
          <button onClick={() => void refreshHealth()} className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400">
            Refresh status
          </button>
        </header>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-slate-400">Database status</p>
            <div className="mt-4 flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${loading ? 'bg-amber-400' : isHealthy ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className="text-2xl font-bold capitalize">{loading ? 'Checking' : health?.database ?? 'Unknown'}</span>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-slate-400">Environment</p>
            <p className="mt-4 text-2xl font-bold">{health?.host ? 'Configured' : 'Not configured'}</p>
            <p className="mt-2 text-sm text-slate-500">Credentials remain server-side</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-slate-400">Endpoint</p>
            <p className="mt-4 truncate text-lg font-bold">{health?.host ?? 'Waiting for check'}</p>
            <p className="mt-2 text-sm text-slate-500">Port {health?.port ?? '5432'}</p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Connection diagnostics</p>
          <p className="mt-4 max-w-2xl leading-7 text-slate-300">
            {loading ? 'Testing the Supabase Postgres endpoint...' : isHealthy ? 'The Supabase Postgres endpoint is reachable from this server.' : health?.message ?? 'The endpoint could not be reached.'}
          </p>
          {!isHealthy && !loading && <p className="mt-4 rounded-2xl bg-red-400/10 p-4 text-sm text-red-200">The API is working, but the database network path is currently unavailable. Check IPv6 routing, firewall rules, or use Supabase’s pooler endpoint.</p>}
        </section>
      </div>
    </main>
  );
}