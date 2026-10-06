'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CustomerNav } from '../../components/customer-nav';

type ProviderProfile = {
  id: string;
  business_name: string;
  provider_name: string;
  description: string | null;
  status: string;
  profile_status?: string;
  subscription?: { status: string; expires_at: string | null; subscription_plans?: { name: string; duration_days: number; max_ads: number | null } | null } | null;
};
type Category = { id: string; name: string };
type ProviderAd = { id: string; title: string; description: string; base_price: number; status: string; category_id: string; service_categories?: { name: string } };
type Plan = { id: string; name: string; duration_days: number; price: number | null; currency: string; max_ads: number | null };
type Application = { id: string; status: string; subscription_plans?: { name: string; duration_days: number; price: number | null; currency: string; max_ads: number | null } };
type ProviderBooking = { id: string; reference: string; customer_name: string; customer_phone: string; service_required: string; preferred_date: string | null; status: string; created_at: string };
type AdDraft = { title: string; description: string; category_id: string; base_price: string };
type Section = 'dashboard' | 'ads' | 'bookings';

const blankAd: AdDraft = { title: '', description: '', category_id: '', base_price: '' };
const sections: { id: Section; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'ads', label: 'Ads', icon: '◇' },
  { id: 'bookings', label: 'Bookings', icon: '▤' },
];

function profileStatusLabel(status: string) {
  if (status === 'active' || status === 'approved') return 'Approved';
  if (status === 'expired') return 'Expired';
  if (status === 'rejected') return 'Rejected';
  if (status === 'under_review') return 'Under review';
  return 'Pending';
}

export default function ProviderPortalPage() {
  const [section, setSection] = useState<Section>('dashboard');
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ads, setAds] = useState<ProviderAd[]>([]);
  const [adLimit, setAdLimit] = useState(0);
  const [adsRemaining, setAdsRemaining] = useState(0);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [bookings, setBookings] = useState<ProviderBooking[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [planId, setPlanId] = useState('');
  const [adSearch, setAdSearch] = useState('');
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<string | null>(null);
  const [adDraft, setAdDraft] = useState<AdDraft>(blankAd);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadPortal() {
    setLoading(true);
    setError(null);
    try {
      const [providerResponse, categoriesResponse, subscriptionsResponse] = await Promise.all([
        fetch('/api/provider/profile', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/provider/subscriptions', { cache: 'no-store' }),
      ]);
      const [providerResult, categoriesResult, subscriptionsResult] = await Promise.all([
        providerResponse.json(), categoriesResponse.json(), subscriptionsResponse.json(),
      ]);
      if (!providerResponse.ok) throw new Error(providerResult.error || 'Verify your phone to open the provider portal.');
      if (!categoriesResponse.ok) throw new Error(categoriesResult.error || 'Could not load categories.');
      if (!subscriptionsResponse.ok) throw new Error(subscriptionsResult.error || 'Could not load subscription plans.');
      setProvider(providerResult.data);
      setCategories(categoriesResult.data || []);
      setPlans(subscriptionsResult.data?.plans || []);
      setApplications(subscriptionsResult.data?.applications || []);

      if (providerResult.data) {
        const [adsResponse, bookingsResponse] = await Promise.all([
          fetch('/api/provider/ads', { cache: 'no-store' }),
          fetch('/api/provider/bookings', { cache: 'no-store' }),
        ]);
        const [adsResult, bookingsResult] = await Promise.all([adsResponse.json(), bookingsResponse.json()]);
        if (!adsResponse.ok) throw new Error(adsResult.error || 'Could not load ads.');
        if (!bookingsResponse.ok) throw new Error(bookingsResult.error || 'Could not load bookings.');
        setAds(adsResult.data || []);
        setAdLimit(adsResult.ad_limit || 0);
        setAdsRemaining(adsResult.ads_remaining || 0);
        setHasActiveSubscription(Boolean(adsResult.subscription));
        setAdLimit(adsResult.ad_limit || 0);
        setAdsRemaining(adsResult.ads_remaining || 0);
        setHasActiveSubscription(Boolean(adsResult.subscription));
        setAdLimit(0);
        setAdsRemaining(0);
        setHasActiveSubscription(false);
        setBookings(bookingsResult.data || []);
      } else {
        setAds([]);
        setAdLimit(0);
        setAdsRemaining(0);
        setHasActiveSubscription(false);
        setBookings([]);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load provider portal.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadPortal(); }, []);

  async function saveProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/provider/profile', {
      method: provider ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_name: form.get('business_name'), provider_name: form.get('provider_name'), description: form.get('description') }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Could not save provider profile.');
      return;
    }
    setNotice(provider ? 'Provider profile updated.' : 'Provider profile created and submitted for review.');
    await loadPortal();
  }

  async function saveAd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch('/api/provider/ads', {
      method: editingAd ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingAd, ...adDraft, base_price: Number(adDraft.base_price) }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Could not save ad.');
      return;
    }
    setNotice(result.subscription_required ? 'Ad saved as pending. Subscription approval is required before it is public.' : 'Ad saved successfully.');
    setEditingAd(null);
    setAdDraft(blankAd);
    setAdModalOpen(false);
    await loadPortal();
  }

  async function applyForPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch('/api/provider/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: planId }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || 'Could not apply for subscription.');
      return;
    }
    setNotice('Subscription application submitted for admin review.');
    await loadPortal();
  }

  function createAd() {
    if (!hasActiveSubscription || adsRemaining < 1) {
      setNotice(!hasActiveSubscription ? 'Apply for a subscription from Dashboard and wait for admin approval before creating ads.' : `Your plan allows ${adLimit} ads. Apply for a plan with a higher ad limit to add more.`);
      setSection('dashboard');
      return;
    }
    setEditingAd(null);
    setAdDraft(blankAd);
    setAdModalOpen(true);
  }

  function editAd(ad: ProviderAd) {
    setEditingAd(ad.id);
    setAdDraft({ title: ad.title, description: ad.description, category_id: ad.category_id, base_price: String(ad.base_price) });
    setAdModalOpen(true);
  }

  const profileStatus = provider?.profile_status || provider?.status || 'pending_verification';
  const statusClasses = profileStatus === 'active' || profileStatus === 'approved'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : profileStatus === 'expired' || profileStatus === 'rejected'
      ? 'border-red-200 bg-red-50 text-red-900'
      : 'border-amber-200 bg-amber-50 text-amber-950';
  const visibleAds = ads.filter((ad) => `${ad.title} ${ad.description} ${ad.service_categories?.name || ''} ${ad.status}`.toLowerCase().includes(adSearch.toLowerCase()));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <CustomerNav />
      <div className="lg:flex">
        <aside className="border-b border-slate-200 bg-white p-4 lg:min-h-[calc(100vh-65px)] lg:w-64 lg:border-b-0 lg:border-r lg:p-5">
          <p className="px-3 pb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Provider workspace</p>
          <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-1">
            {sections.map((item) => <button key={item.id} onClick={() => setSection(item.id)} className={`flex w-full shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold ${section === item.id ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-50'}`}><span aria-hidden="true">{item.icon}</span>{item.label}<span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{item.id === 'ads' ? ads.length : item.id === 'bookings' ? bookings.length : ''}</span></button>)}
          </nav>
        </aside>

        <section className="min-w-0 flex-1 p-5 md:p-8">
          <div className={`mb-6 flex flex-col justify-between gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center ${statusClasses}`}>
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] opacity-70">Profile status</p><h1 className="mt-1 text-2xl font-black">{provider ? profileStatusLabel(profileStatus) : 'Profile not created'}</h1><p className="mt-1 text-sm opacity-80">{provider?.business_name || 'Create your service provider profile to get started.'}</p></div>
            <div className="text-sm sm:text-right"><p className="font-bold">{provider?.subscription?.subscription_plans?.name || 'No active subscription'}</p><p className="mt-1">{provider?.subscription?.expires_at ? `Expires ${new Date(provider.subscription.expires_at).toLocaleDateString()}` : provider?.subscription?.status === 'pending' ? 'Subscription pending admin approval' : 'Apply for a plan to activate ads'}</p>{hasActiveSubscription && <p className="mt-1 font-semibold">Ad allowance: {ads.length}/{adLimit}</p>}</div>
          </div>
          {error && <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="mb-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{notice}</p>}
          {loading && <p className="py-8 text-slate-500">Loading provider workspace...</p>}

          {!loading && section === 'dashboard' && <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-5 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Ads used</p><p className="mt-2 text-3xl font-black">{ads.length}{hasActiveSubscription && <span className="text-lg text-slate-400"> / {adLimit}</span>}</p><p className="mt-1 text-xs text-slate-500">{hasActiveSubscription ? `${adsRemaining} available on your plan` : 'Subscription required'}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Bookings</p><p className="mt-2 text-3xl font-black">{bookings.length}</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Pending subscription applications</p><p className="mt-2 text-3xl font-black">{applications.filter((application) => application.status === 'pending').length}</p></div>
            </div>
            {provider ? <form onSubmit={saveProvider} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Provider profile</h2><p className="text-sm text-slate-500">This provider profile belongs to your customer account.</p><input name="provider_name" required defaultValue={provider.provider_name} placeholder="Your name" className="rounded-xl border border-slate-200 px-4 py-3" /><input name="business_name" required defaultValue={provider.business_name} placeholder="Business name" className="rounded-xl border border-slate-200 px-4 py-3" /><textarea name="description" rows={3} defaultValue={provider.description || ''} placeholder="Business description" className="rounded-xl border border-slate-200 px-4 py-3" /><button className="justify-self-start rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold">Save profile changes</button></form> : <form onSubmit={saveProvider} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-xl font-black">Become a service provider</h2><input name="provider_name" required placeholder="Your name" className="rounded-xl border border-slate-200 px-4 py-3" /><input name="business_name" required placeholder="Business name" className="rounded-xl border border-slate-200 px-4 py-3" /><textarea name="description" rows={3} placeholder="Business description" className="rounded-xl border border-slate-200 px-4 py-3" /><button className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white">Create provider profile</button></form>}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2"><h2 className="text-xl font-black">Subscription</h2><p className="mt-1 text-sm text-slate-500">An administrator manually approves the plan term. Approval does not record payment.</p><form onSubmit={applyForPlan} className="mt-5 flex flex-col gap-3 sm:flex-row"><select required value={planId} onChange={(event) => setPlanId(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3"><option value="">Choose a 30 / 60 / 360 day plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {plan.duration_days} days{plan.price == null ? ' · fee set by admin' : ` · ${plan.currency} ${plan.price}`}</option>)}</select><button className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white">Apply for subscription</button></form><div className="mt-4 grid gap-2">{applications.map((application) => <div key={application.id} className="flex justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm"><span>{application.subscription_plans?.name} · {application.subscription_plans?.duration_days} days</span><strong className="capitalize">{application.status}</strong></div>)}</div></section>
          </div>}

          {!loading && section === 'ads' && <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-xl font-black">Ads</h2><p className="mt-1 text-sm text-slate-500">Search and manage your service ads and base prices.</p>{hasActiveSubscription && <p className="mt-1 text-xs font-semibold text-emerald-700">Plan usage: {ads.length} of {adLimit} ads</p>}</div><button onClick={createAd} disabled={!hasActiveSubscription || adsRemaining < 1} className="shrink-0 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">Create ad</button></div>
            <div className="mt-5"><input value={adSearch} onChange={(event) => setAdSearch(event.target.value)} placeholder="Search ads by title, category, or status" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></div>
            <div className="mt-5 grid gap-3">{visibleAds.length === 0 ? <div className="rounded-xl bg-slate-50 p-8 text-center"><p className="font-semibold text-slate-700">{ads.length ? 'No ads match your search.' : 'No ads created yet.'}</p><p className="mt-1 text-sm text-slate-500">Create an ad and add its category, description, and base price.</p></div> : visibleAds.map((ad) => <article key={ad.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{ad.title}</h3><span className={`rounded-full px-2 py-1 text-xs font-bold capitalize ${ad.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{ad.status.replaceAll('_', ' ')}</span></div><p className="mt-1 text-sm text-slate-500">{ad.service_categories?.name || 'Uncategorized'} · PKR {ad.base_price}</p><p className="mt-1 text-sm text-slate-600">{ad.description}</p></div><button onClick={() => { setEditingAd(ad.id); setAdDraft({ title: ad.title, description: ad.description, category_id: ad.category_id, base_price: String(ad.base_price) }); setAdModalOpen(true); }} className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-50">Edit</button></article>)}</div>
          </section>}

          {!loading && section === 'bookings' && <section className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">Bookings</h2><p className="mt-1 text-sm text-slate-500">Requests for your provider profile and ads.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold">{bookings.length}</span></div>{bookings.length === 0 ? <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No bookings yet.</p> : <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Service</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th></tr></thead><tbody>{bookings.map((booking) => <tr key={booking.id} className="border-t border-slate-100"><td className="px-4 py-3 font-bold">{booking.reference}</td><td className="px-4 py-3">{booking.customer_name}<span className="block text-xs text-slate-500">{booking.customer_phone}</span></td><td className="px-4 py-3">{booking.service_required}</td><td className="px-4 py-3">{booking.preferred_date || new Date(booking.created_at).toLocaleDateString()}</td><td className="px-4 py-3 capitalize">{booking.status.replaceAll('_', ' ')}</td></tr>)}</tbody></table></div>}</section>}
        </section>
      </div>

      {adModalOpen && <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="ad-modal-title" className="my-6 w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl md:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Service listing</p><h2 id="ad-modal-title" className="mt-1 text-2xl font-black">{editingAd ? 'Edit ad' : 'Create ad'}</h2><p className="mt-2 text-sm text-slate-500">Set a clear service description and starting price.</p></div><button onClick={() => setAdModalOpen(false)} className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100" aria-label="Close ad modal">×</button></div><form onSubmit={saveAd} className="mt-6 grid gap-4 md:grid-cols-2"><label className="grid gap-2 text-sm font-semibold md:col-span-2">Ad title<input required autoFocus value={adDraft.title} onChange={(event) => setAdDraft({ ...adDraft, title: event.target.value })} placeholder="For example: Leak and pipe repair" className="rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label><label className="grid gap-2 text-sm font-semibold">Category<select required value={adDraft.category_id} onChange={(event) => setAdDraft({ ...adDraft, category_id: event.target.value })} className="rounded-xl border border-slate-200 px-4 py-3 font-normal"><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold">Base price (PKR)<input required type="number" min="0" step="1" value={adDraft.base_price} onChange={(event) => setAdDraft({ ...adDraft, base_price: event.target.value })} placeholder="1500" className="rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label><label className="grid gap-2 text-sm font-semibold md:col-span-2">Service details<textarea required rows={4} value={adDraft.description} onChange={(event) => setAdDraft({ ...adDraft, description: event.target.value })} placeholder="Describe the work included at the starting price" className="rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label><p className="text-xs leading-5 text-slate-500 md:col-span-2">New ads stay pending until your subscription is active and approved by an administrator.</p><div className="flex justify-end gap-3 md:col-span-2"><button type="button" onClick={() => { setAdModalOpen(false); setEditingAd(null); setAdDraft(blankAd); }} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold">Cancel</button><button className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white">{editingAd ? 'Save changes' : 'Create ad'}</button></div></form></section></div>}
    </main>
  );
}
