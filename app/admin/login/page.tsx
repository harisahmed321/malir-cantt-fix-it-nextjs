'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Unable to sign in.');
      setLoading(false);
      return;
    }
    router.replace('/admin');
    router.refresh();
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10"><div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl"><a href="/" className="text-sm font-bold text-emerald-700">Malir Cantt Fix It</a><h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Admin sign in</h1><p className="mt-2 text-sm leading-6 text-slate-500">Use the authorized Supabase administrator account to access provider approvals and private operations.</p><form onSubmit={submit} className="mt-7 grid gap-4"><label className="grid gap-2 text-sm font-semibold text-slate-700">Email<input name="email" type="email" required autoComplete="username" className="rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-emerald-500" placeholder="admin@malircanttfixit.com" /></label><label className="grid gap-2 text-sm font-semibold text-slate-700">Password<input name="password" type="password" required autoComplete="current-password" className="rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-emerald-500" /></label>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={loading} className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-50">{loading ? 'Signing in...' : 'Sign in to admin'}</button></form><p className="mt-6 text-xs leading-5 text-slate-400">Admin access is restricted by the server-side `ADMIN_EMAIL` allowlist and Supabase Auth.</p></div></main>;
}