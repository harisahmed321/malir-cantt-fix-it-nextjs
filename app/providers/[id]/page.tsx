'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { CustomerNav } from '../../../components/customer-nav';

type Provider = {
  id: string;
  business_name: string;
  provider_name: string;
  phone: string;
  email: string | null;
  description: string | null;
  experience_years: number | null;
  initial_price: number | null;
  currency: string;
  provider_services: { service_name: string | null; service_description: string | null; starting_price: number | null; service_categories: { name: string; slug: string } | null }[];
  service_ads?: { id: string; title: string; description: string; base_price: number; currency: string; status: string; service_categories: { name: string; slug: string } | null }[];
  provider_locations: { address: string; area: string; city: string; is_primary: boolean }[];
  feedback: { id: string; overall_rating: number; service_quality_rating: number | null; comment: string | null; created_at: string }[];
};

const emojis = ['😡', '😞', '😐', '🙂', '😍'];

export default function ProviderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const selectedAdId = searchParams.get('ad');
  const [provider, setProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [bookingPhone, setBookingPhone] = useState('');
  const [phonePromptOpen, setPhonePromptOpen] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpNotification, setOtpNotification] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSeconds, setOtpSeconds] = useState(180);
  const [customerName, setCustomerName] = useState('');
  const [serviceAddress, setServiceAddress] = useState('');

  useEffect(() => {
    fetch(`/api/providers/${id}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Provider not found.');
        setProvider(result.data);
      })
      .catch((requestError: Error) => setError(requestError.message));
  }, [id]);

  useEffect(() => {
    fetch('/api/customer/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        const verifiedPhone = result.data?.phone as string | null;
        if (!verifiedPhone) return;
        setBookingPhone(verifiedPhone);
        return fetch('/api/customer/profile', { cache: 'no-store' })
          .then((profileResponse) => profileResponse.json())
          .then((profileResult) => {
            setCustomerName(profileResult.data?.full_name || '');
            setServiceAddress(profileResult.data?.address || '');
          });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!otpOpen || otpSeconds <= 0) return;
    const timer = window.setInterval(() => setOtpSeconds((seconds) => Math.max(seconds - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [otpOpen, otpSeconds]);

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const customerPhone = String(form.get('customer_phone') || '').trim();
    const result = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider_id: id, customer_name: form.get('customer_name'), customer_phone: customerPhone, service_required: form.get('service_required'), problem_description: form.get('problem_description'), preferred_date: form.get('preferred_date'), preferred_time: form.get('preferred_time'), service_address: form.get('service_address') }) });
    const payload = await result.json();
    if (!result.ok) return setFormError(payload.error || 'Unable to submit booking.');
    setSubmitted(payload.data.reference);
    const history = JSON.parse(window.localStorage.getItem('fixit_booking_history') || '[]') as { reference: string; provider: string; status: string; phone?: string; saved_at: string }[];
    history.unshift({ reference: payload.data.reference, provider: provider?.business_name || 'Service provider', status: payload.data.status || 'pending', phone: customerPhone, saved_at: new Date().toISOString() });
    window.localStorage.setItem('fixit_booking_history', JSON.stringify(history.slice(0, 20)));
    setFormError(null);
  }

  function startBooking() {
    setPhonePromptOpen(true);
  }

  function continueToBooking() {
    if (!/^03\d{9}$/.test(bookingPhone)) return;
    setOtpLoading(true);
    setOtpError(null);
    fetch('/api/bookings/request-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: bookingPhone }) })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to generate OTP.');
        setOtpNotification(payload.data.notification);
        setOtpCode('');
        setOtpSeconds(180);
        setPhonePromptOpen(false);
        setOtpOpen(true);
      })
      .catch((requestError: Error) => setOtpError(requestError.message))
      .finally(() => setOtpLoading(false));
  }

  async function verifyBookingOtp() {
    if (!/^\d{6}$/.test(otpCode)) return setOtpError('Enter the six-digit OTP.');
    setOtpLoading(true);
    setOtpError(null);
    const response = await fetch('/api/bookings/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: bookingPhone, otp: otpCode }) });
    const payload = await response.json();
    if (!response.ok) {
      setOtpError(payload.error || 'Invalid or expired OTP.');
      setOtpLoading(false);
      return;
    }
    setOtpVerified(true);
    window.dispatchEvent(new Event('customer-session-changed'));
    setOtpOpen(false);
    setBookingOpen(true);
    setOtpLoading(false);
  }

  function resendOtp() {
    setOtpOpen(false);
    continueToBooking();
  }

  if (error) return <main className="container py-20"><a href="/services" className="font-semibold text-emerald-700">← Back to services</a><div className="mt-8 rounded-3xl bg-amber-50 p-8 text-amber-900">{error}</div></main>;
  if (!provider) return <main className="container py-20 text-slate-500">Loading provider details...</main>;

  const rating = provider.feedback.length ? (provider.feedback.reduce((sum, review) => sum + review.overall_rating, 0) / provider.feedback.length).toFixed(1) : 'New';
  const selectedAd = provider.service_ads?.find((ad) => ad.id === selectedAdId && ad.status === 'active');
  const offeredServices = [
    ...provider.provider_services,
    ...(provider.service_ads || []).filter((ad) => ad.status === 'active').map((ad) => ({ service_name: ad.title, service_description: ad.description, starting_price: ad.base_price, service_categories: ad.service_categories })),
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <CustomerNav />
      <div className="container pt-5"><a href="/services" className="text-sm font-bold text-emerald-700">← All services</a></div>
      <section className="container grid gap-8 py-10 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"><div className="flex flex-col gap-5 sm:flex-row sm:items-start"><div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-emerald-100 text-3xl font-black text-emerald-700">{provider.business_name.slice(0, 1)}</div><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-black tracking-tight">{provider.business_name}</h1><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Verified provider</span></div><p className="mt-2 text-slate-500">{provider.provider_name} · {provider.experience_years ?? 'Experienced'} years experience</p><div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-slate-700"><span>★ {rating} ({provider.feedback.length} reviews)</span><span>From {provider.currency} {provider.initial_price ?? '—'}</span></div></div></div><p className="mt-7 leading-7 text-slate-600">{provider.description || 'This local service professional is ready to help with your request.'}</p><p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">Starting price only. Final charges may vary based on the required work, materials, and service-provider assessment.</p></div>
          <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"><h2 className="text-xl font-black">Services offered</h2><div className="mt-5 grid gap-3 sm:grid-cols-2">{offeredServices.map((service, index) => <div key={`${service.service_name}-${service.service_categories?.slug}-${index}`} className={`rounded-2xl p-4 ${selectedAd?.title === service.service_name ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-slate-50'}`}><p className="font-bold">{service.service_name || service.service_categories?.name}</p><p className="mt-1 text-sm text-slate-500">{service.service_description || 'Professional service available on request.'}</p>{service.starting_price != null && <p className="mt-2 text-sm font-semibold text-slate-700">From PKR {service.starting_price}</p>}</div>)}</div><div className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-600">📍 {provider.provider_locations[0]?.address || provider.provider_locations[0]?.area || 'Service area available on request'}</div></div>
          <div className="mt-5 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Customer reviews</h2><span className="text-sm font-semibold text-emerald-700">{provider.feedback.length} total</span></div>{provider.feedback.length === 0 ? <p className="mt-5 text-slate-500">No reviews yet. Be the first customer to share feedback after a completed service.</p> : <div className="mt-5 space-y-4">{provider.feedback.map((review) => <div key={review.id} className="rounded-2xl bg-slate-50 p-4"><div className="flex justify-between gap-4"><span className="text-lg">{emojis[review.overall_rating - 1]} <span className="ml-1 text-sm font-bold text-slate-700">{review.overall_rating}/5</span></span><time className="text-xs text-slate-400">{new Date(review.created_at).toLocaleDateString()}</time></div>{review.comment && <p className="mt-3 leading-6 text-slate-600">{review.comment}</p>}</div>)}</div>}</div>
        </div>
        <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6"><h2 className="text-xl font-black">Ready to book?</h2><p className="mt-2 text-sm leading-6 text-slate-500">Send your request and the provider can confirm availability and final pricing.</p><div className="mt-5 grid gap-3"><a href={`tel:${provider.phone}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700">Call {provider.phone}</a><button onClick={startBooking} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white">Request booking</button></div></aside>
      </section>
      {phonePromptOpen && <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl"><div className="flex items-start justify-between gap-5"><div><p className="text-sm font-bold text-emerald-700">Before you book</p><h2 className="mt-1 text-2xl font-black tracking-tight">Where can we reach you?</h2><p className="mt-2 text-sm leading-6 text-slate-500">Enter an 11-digit Pakistani mobile number beginning with 03.</p></div><button onClick={() => setPhonePromptOpen(false)} className="text-2xl leading-none text-slate-400" aria-label="Close phone dialog">×</button></div><div className="mt-6 grid gap-3"><label className="text-sm font-bold text-slate-700" htmlFor="booking-phone">Phone number</label><input id="booking-phone" value={bookingPhone} onChange={(event) => setBookingPhone(event.target.value.replace(/\D/g, '').slice(0, 11))} autoFocus type="tel" inputMode="numeric" maxLength={11} pattern="03[0-9]{9}" placeholder="03001234567" className="rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /><p className="text-xs leading-5 text-slate-500">Format: 03XXXXXXXXX. OTP expires in 3 minutes.</p><button onClick={continueToBooking} disabled={!/^03\d{9}$/.test(bookingPhone) || otpLoading} className="mt-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">{otpLoading ? 'Generating OTP...' : 'Continue'}</button></div></div></div>}
      {otpOpen && <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"><div className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl"><div className="flex items-start justify-between gap-5"><div><p className="text-sm font-bold text-emerald-700">Phone verification</p><h2 className="mt-1 text-2xl font-black tracking-tight">Enter your OTP</h2><p className="mt-2 text-sm leading-6 text-slate-500">Enter the six-digit code for {bookingPhone}.</p></div><button onClick={() => setOtpOpen(false)} className="text-2xl leading-none text-slate-400" aria-label="Close OTP dialog">×</button></div><div className="mt-6 grid gap-4"><div className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"><span>{otpNotification}</span><span className="shrink-0 pl-3 text-emerald-700">{otpSeconds > 0 ? `${Math.floor(otpSeconds / 60)}:${String(otpSeconds % 60).padStart(2, '0')}` : 'Expired'}</span></div><input value={otpCode} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus inputMode="numeric" maxLength={6} placeholder="000000" className="rounded-xl border border-slate-200 px-4 py-4 text-center text-2xl font-black tracking-[0.4em] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />{otpSeconds === 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">This OTP expired. Request a new code.</p>}{otpError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{otpError}</p>}<button onClick={() => void verifyBookingOtp()} disabled={otpCode.length !== 6 || otpLoading || otpSeconds === 0} className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">{otpLoading ? 'Verifying...' : 'Verify phone'}</button><button onClick={resendOtp} disabled={otpSeconds > 0 || otpLoading} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">{otpSeconds > 0 ? `Resend OTP in ${Math.floor(otpSeconds / 60)}:${String(otpSeconds % 60).padStart(2, '0')}` : 'Resend OTP'}</button></div></div></div>}
      {bookingOpen && <div className="fixed inset-0 z-20 overflow-y-auto bg-slate-950/50 p-4"><div className="mx-auto my-8 max-w-xl rounded-[2rem] bg-white p-7 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-sm font-bold text-emerald-700">Booking request</p><h2 className="mt-1 text-2xl font-black">Tell us what you need</h2></div><button onClick={() => setBookingOpen(false)} className="text-2xl text-slate-400" aria-label="Close booking form">×</button></div>{submitted ? <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"><p className="font-bold">✓ Booking request submitted successfully.</p><p className="mt-2 text-sm">Your booking reference is <strong>{submitted}</strong>. Keep it for status updates.</p></div> : <form onSubmit={submitBooking} className="mt-6 grid gap-4"><input name="customer_name" required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Your name" className="rounded-xl border border-slate-200 px-4 py-3" /><input name="customer_phone" required type="tel" value={bookingPhone} onChange={(event) => setBookingPhone(event.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="Phone number" className="rounded-xl border border-slate-200 px-4 py-3" /><input name="service_required" required defaultValue={selectedAd?.title || provider.provider_services[0]?.service_name || ''} placeholder="Service required" className="rounded-xl border border-slate-200 px-4 py-3" /><textarea name="problem_description" placeholder="Describe the problem (optional)" rows={3} className="rounded-xl border border-slate-200 px-4 py-3" /><div className="grid gap-4 sm:grid-cols-2"><input name="preferred_date" type="date" className="rounded-xl border border-slate-200 px-4 py-3" /><input name="preferred_time" type="time" className="rounded-xl border border-slate-200 px-4 py-3" /></div><input name="service_address" required value={serviceAddress} onChange={(event) => setServiceAddress(event.target.value)} placeholder="Service address" className="rounded-xl border border-slate-200 px-4 py-3" />{formError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}<button className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white">Send booking request</button><p className="text-xs leading-5 text-slate-500">Your location is shared only as the service address you submit.</p></form>}</div></div>}
    </main>
  );
}