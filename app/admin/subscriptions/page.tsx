'use client';

import { useEffect, useState } from 'react';

type SubscriptionApplication = {
  id: string;
  created_at: string;
  service_providers?: { business_name: string; provider_name: string; owner_phone: string };
  subscription_plans?: { name: string; duration_days: number; price: number | null; currency: string; max_ads: number | null };
};

export default function AdminSubscriptionsPage() {
  const [applications, setApplications] = useState<SubscriptionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadApplications() {
    setLoading(true);
    const response = await fetch('/api/admin/subscriptions', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) setError(result.error || 'Could not load applications.');
    else {
      setApplications(result.data || []);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => { void loadApplications(); }, []);

  async function decide(applicationId: string, action: 'approve' | 'reject') {
    setBusyId(applicationId);
    setMessage(null);
    const response = await fetch('/api/admin/subscriptions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription_id: applicationId, action }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error || 'Could not update subscription.');
    else {
      setError(null);
      setMessage(action === 'approve'
        ? `Approved. Provider ads are active until ${new Date(result.data.expires_at).toLocaleDateString()}. Payment is not recorded as received.`
        : 'Subscription application rejected.');
      await loadApplications();
    }
    setBusyId(null);
  }

  return (
    <main className="p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-600">Provider monetization</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Subscription approvals</h1>
          <p className="mt-2 text-slate-500">Review provider applications. Approval activates the selected duration and publishes eligible ads. It does not confirm payment.</p>
        </header>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Pending applications</p><p className="mt-3 text-3xl font-black">{applications.length}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Default terms</p><p className="mt-3 text-lg font-black">30 / 60 / 360 days</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Payment status</p><p className="mt-3 text-lg font-black">Manually verified only</p></div>
        </div>
        {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p>}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-bold">Awaiting review</h2></div>
          {loading ? <p className="p-8 text-center text-slate-500">Loading applications...</p> : applications.length === 0 ? <p className="p-12 text-center text-slate-500">No pending subscription applications.</p> : <div className="divide-y divide-slate-100">
            {applications.map((application) => <article key={application.id} className="flex flex-col justify-between gap-5 p-5 lg:flex-row lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Pending subscription</p>
                <h3 className="mt-1 text-lg font-black">{application.service_providers?.business_name || 'Provider'}</h3>
                <p className="mt-1 text-sm text-slate-500">{application.service_providers?.provider_name} · {application.service_providers?.owner_phone}</p>
                <p className="mt-3 text-sm font-semibold text-slate-800">{application.subscription_plans?.name} · {application.subscription_plans?.duration_days} days · up to {application.subscription_plans?.max_ads ?? '—'} ads</p>
                <p className="mt-1 text-xs text-slate-500">{application.subscription_plans?.price == null ? 'Price not configured' : `${application.subscription_plans.currency} ${application.subscription_plans.price}`} · Applied {new Date(application.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-3">
                <button disabled={busyId === application.id} onClick={() => void decide(application.id, 'reject')} className="rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-700 disabled:opacity-50">Reject</button>
                <button disabled={busyId === application.id} onClick={() => void decide(application.id, 'approve')} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busyId === application.id ? 'Saving...' : 'Approve subscription'}</button>
              </div>
            </article>)}
          </div>}
        </section>
      </div>
    </main>
  );
}
