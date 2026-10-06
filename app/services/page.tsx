'use client';

import { useEffect, useState } from 'react';
import { CustomerNav } from '../../components/customer-nav';

type Provider = {
  id: string;
  business_name: string;
  provider_name: string;
  description: string | null;
  initial_price: number | null;
  currency: string;
  provider_locations?: { area: string; city: string }[];
  provider_services?: { service_categories?: { name: string; slug: string } }[];
  distance_km?: number | null;
  base_price?: number | null;
  average_rating?: number | null;
  review_count?: number;
  service_ad_id?: string;
  ad_title?: string;
};

type ProviderResponse = { data?: Provider[]; error?: string; total?: number };

const categories = ['All services', 'Plumbing', 'Electrical', 'Car Mechanics', 'AC Repair', 'Appliance Repair'];

export default function ServicesPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [category, setCategory] = useState('All services');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState('Select your area');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [minRating, setMinRating] = useState('0');
  const [sort, setSort] = useState('distance');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  function requestLocation() {
    if (!navigator.geolocation) return setLocation('Location unavailable');
    setLocation('Detecting location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocation('Location detected');
      },
      () => setLocation('Choose an area manually'),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 },
    );
  }

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (category !== 'All services') params.set('category', category.toLowerCase().replaceAll(' ', '-'));
    if (coordinates) {
      params.set('lat', String(coordinates.latitude));
      params.set('lng', String(coordinates.longitude));
    }
    if (minRating !== '0') params.set('minRating', minRating);
    params.set('sort', sort);

    setLoading(true);
    fetch(`/api/providers?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const result = (await response.json()) as ProviderResponse;
        if (!response.ok) throw new Error(result.error || 'Unable to load providers.');
        setProviders(result.data || []);
        setError(null);
      })
      .catch((requestError: Error) => {
        if (requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [category, coordinates, minRating, search, sort]);

  function stars(rating: number | null | undefined) {
    const roundedRating = Math.round(rating || 0);
    return Array.from({ length: 5 }, (_, index) => index < roundedRating ? '★' : '☆').join('');
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <CustomerNav />
      <header className="border-b border-slate-200 bg-white">
        <div className="container flex flex-col gap-5 py-8 md:flex-row md:items-end md:justify-between">
          <div>
            <a href="/" className="text-sm font-bold text-emerald-700">Malir Cantt Fix It</a>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Find a trusted local expert.</h1>
            <p className="mt-2 text-slate-600">Browse approved service providers near your preferred area.</p>
          </div>
          <a href="/admin" className="text-sm font-semibold text-slate-600 hover:text-slate-900">Admin portal →</a>
        </div>
      </header>

      <section className="container py-8">
        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_auto]">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search providers or services" className="rounded-2xl border border-slate-200 px-4 py-3 outline-none ring-emerald-500 focus:ring-2" />
          <div className="flex flex-wrap gap-2">
            {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-4 py-2 text-sm font-semibold ${category === item ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{item}</button>)}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-emerald-950">Find help near you</p><p className="mt-1 text-sm text-emerald-800">We use your approximate location only for this browsing session.</p></div><button onClick={requestLocation} className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white">{location}</button></div>

        <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end"><label className="grid flex-1 gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">Rating<select value={minRating} onChange={(event) => setMinRating(event.target.value)} className="h-10.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-800"><option value="0">All ratings</option><option value="4">★★★★☆</option><option value="4.5">★★★★⯨</option><option value="5">★★★★★</option></select></label><label className="grid flex-1 gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">Filter by<select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-800"><option value="distance">Distance - Near First</option><option value="price-high">Price Higher - Lower</option><option value="price-low">Price Lower - Higher</option><option value="name-a-z">Sort A - Z</option><option value="name-z-a">Sort Z - A</option></select></label><div className="flex gap-2"><button onClick={() => setView('grid')} className={`rounded-xl px-3 py-2 text-sm font-bold ${view === 'grid' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`} aria-label="Grid view">▦ Grid</button><button onClick={() => setView('list')} className={`rounded-xl px-3 py-2 text-sm font-bold ${view === 'list' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`} aria-label="List view">☷ List</button></div></div>

        {loading && <div className="py-16 text-center text-slate-500">Loading available providers...</div>}
        {!loading && error && <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-900"><p className="font-bold">Provider discovery is not ready yet.</p><p className="mt-2 text-sm">{error}</p><p className="mt-4 text-sm">Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then apply the migration.</p></div>}
        {!loading && !error && providers.length === 0 && <div className="py-16 text-center text-slate-500">No approved providers match this search yet.</div>}
        {!loading && !error && providers.length > 0 && <div className={`mt-8 ${view === 'grid' ? 'grid gap-5 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}`}>{providers.map((provider, index) => <article key={provider.service_ad_id || `${provider.id}-${index}`} className={`border border-slate-200 bg-white p-6 shadow-sm ${view === 'grid' ? 'flex h-full flex-col rounded-3xl' : 'flex flex-col gap-4 rounded-2xl md:flex-row md:items-center md:justify-between'}`}><div className="flex min-w-0 items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-black text-emerald-700">{provider.business_name.slice(0, 1)}</div><div className="min-w-0 flex-1"><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h2 className="min-h-14 wrap-break-word text-xl font-bold leading-7">{provider.ad_title || provider.business_name}</h2><p className="mt-1 text-sm text-slate-500">{provider.business_name} · {provider.provider_name}</p></div><span className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Verified</span></div><p className={`mt-4 text-sm leading-6 text-slate-600 ${view === 'grid' ? 'min-h-14' : 'max-w-2xl'}`}>{provider.description || 'Local service professional ready to help.'}</p><div className="mt-3 flex flex-wrap items-center gap-3 text-sm"><span className="font-bold tracking-wide text-amber-500">{stars(provider.average_rating)}</span><span className="font-semibold text-slate-700">{provider.average_rating ?? 'New'}</span><span className="text-slate-500">({provider.review_count ?? 0} reviews)</span><span className="font-semibold text-slate-700">From {provider.currency} {provider.base_price ?? provider.initial_price ?? '—'}</span><span className="text-slate-500">{provider.distance_km != null ? `${provider.distance_km} km away` : provider.provider_locations?.[0]?.area || 'Service area'}</span></div></div></div><a href={`/providers/${provider.id}${provider.service_ad_id ? `?ad=${provider.service_ad_id}` : ''}`} className={`block shrink-0 rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-bold text-white ${view === 'grid' ? 'mt-auto w-full' : 'md:w-auto'}`}>View details & book</a></article>)}</div>}
      </section>
    </main>
  );
}