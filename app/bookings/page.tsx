'use client';

import { useEffect, useState } from 'react';
import { CustomerNav } from '../../components/customer-nav';

type StoredBooking = { reference: string; service_required: string; status: string; created_at: string; service_providers?: { business_name: string } | null };

export default function BookingsPage() {
  const [bookings, setBookings] = useState<StoredBooking[]>([]);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    fetch('/api/customer/bookings', { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load bookings.');
        setAuthenticated(true);
        setBookings(result.data || []);
      })
      .catch(() => setAuthenticated(false));
  }, []);

  return <main className="min-h-screen bg-slate-50 text-slate-900"><CustomerNav /><section className="container py-10"><p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Customer area</p><h1 className="mt-3 text-4xl font-black tracking-tight">Booking history</h1><p className="mt-3 text-slate-600">Requests are retrieved from your verified phone number.</p>{bookings.length === 0 ? <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm"><p className="font-bold text-slate-800">{authenticated ? 'No bookings yet' : 'Verify your phone to view bookings'}</p><p className="mt-2 text-sm text-slate-500">{authenticated ? 'Choose a provider and submit your first request.' : 'Sign in with the phone number used for your booking.'}</p><a href={authenticated ? '/services' : '/profile'} className="mt-5 inline-flex rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white">{authenticated ? 'Browse services' : 'Verify phone'}</a></div> : <div className="mt-8 grid gap-4">{bookings.map((booking) => <article key={booking.reference} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{booking.reference}</p><h2 className="mt-1 text-lg font-bold">{booking.service_providers?.business_name || 'Provider'} · {booking.service_required}</h2></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold capitalize text-amber-800">{booking.status}</span></div><p className="mt-4 text-sm text-slate-500">Requested {new Date(booking.created_at).toLocaleString()}</p></article>)}</div>}</section></main>;
}