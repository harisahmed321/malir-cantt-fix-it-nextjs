'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CustomerNav } from '../../components/customer-nav';

type CustomerProfile = { fullName: string; address: string };

const emptyProfile: CustomerProfile = { fullName: '', address: '' };

export default function ProfilePage() {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [profile, setProfile] = useState<CustomerProfile>(emptyProfile);
  const [otp, setOtp] = useState('');
  const [notification, setNotification] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [stage, setStage] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/customer/session', { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => {
        const activePhone = result.data?.phone as string | null;
        if (!activePhone) return;
        setPhone(activePhone);
        setPhoneInput(activePhone);
        setStage('profile');
        return fetch('/api/customer/profile', { cache: 'no-store' })
          .then((profileResponse) => profileResponse.json())
          .then((profileResult) => {
            if (profileResult.data) setProfile({ fullName: profileResult.data.full_name || '', address: profileResult.data.address || '' });
          });
      })
      .catch(() => setError('Could not load your current phone verification.'));
  }, []);

  useEffect(() => {
    if (!otpExpiresAt) return;
    const updateTimer = () => setSecondsLeft(Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000)));
    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [otpExpiresAt]);

  async function requestOtp(event?: FormEvent) {
    event?.preventDefault();
    const normalizedPhone = phoneInput.trim();
    if (!/^03\d{9}$/.test(normalizedPhone)) {
      setError('Enter an 11-digit number starting with 03.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const response = await fetch('/api/bookings/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalizedPhone }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(result.error || 'Could not send the verification code.');
      return;
    }
    setPhoneInput(normalizedPhone);
    setOtp('');
    setNotification(result.data.notification);
    setOtpExpiresAt(Date.now() + 180000);
    setStage('otp');
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    if (secondsLeft <= 0) {
      setError('The code expired. Request a new OTP.');
      return;
    }
    setBusy(true);
    setError(null);
    const response = await fetch('/api/bookings/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneInput, otp }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(result.error || 'The OTP could not be verified.');
      return;
    }
    setPhone(phoneInput);
    window.dispatchEvent(new Event('customer-session-changed'));
    const profileResponse = await fetch('/api/customer/profile', { cache: 'no-store' });
    const profileResult = await profileResponse.json();
    setProfile(profileResult.data ? { fullName: profileResult.data.full_name || '', address: profileResult.data.address || '' } : emptyProfile);
    setStage('profile');
    setOtpExpiresAt(null);
    setMessage('Phone verified successfully. Your profile is ready.');
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!phone) {
      setStage('phone');
      return;
    }
    setBusy(true);
    const response = await fetch('/api/customer/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: profile.fullName, address: profile.address }) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(result.error || 'Could not save profile.');
      return;
    }
    setError(null);
    router.replace('/services');
  }

  return <main className="min-h-screen bg-slate-50 text-slate-900"><CustomerNav /><section className="container max-w-3xl py-10"><p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-600">Customer account</p><h1 className="mt-3 text-4xl font-black tracking-tight">Your profile</h1><p className="mt-3 leading-7 text-slate-600">Verify your phone to access your customer area, then save your name and usual service address for quicker bookings.</p>
  {stage === 'phone' && <form onSubmit={requestOtp} className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Verify your phone</h2><label className="grid gap-2 text-sm font-semibold">Mobile number<input value={phoneInput} onChange={(event) => setPhoneInput(event.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="numeric" maxLength={11} placeholder="03001234567" className="rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label><p className="text-xs text-slate-500">Enter exactly 11 digits, starting with 03. Verification code expires in 3 minutes.</p>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={busy || !/^03\d{9}$/.test(phoneInput)} className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-40">{busy ? 'Sending code...' : 'Send verification code'}</button></form>}
  {stage === 'otp' && <form onSubmit={verifyOtp} className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Confirm your phone</h2><p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">{notification}</p><label className="grid gap-2 text-sm font-semibold">Six-digit OTP<input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" maxLength={6} placeholder="000000" className="rounded-xl border border-slate-200 px-4 py-3 text-center text-xl font-bold tracking-[0.4em]" /></label><p className="text-sm text-slate-500">Code expires in <strong>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}</strong></p>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex flex-wrap gap-3"><button type="submit" disabled={busy || otp.length !== 6 || secondsLeft === 0} className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-40">{busy ? 'Verifying...' : 'Verify phone'}</button><button type="button" disabled={busy || secondsLeft > 0} onClick={() => void requestOtp()} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold disabled:opacity-40">{secondsLeft > 0 ? 'Resend after expiry' : 'Resend OTP'}</button></div></form>}
  {stage === 'profile' && <form onSubmit={saveProfile} className="mt-8 grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-xl font-black">Profile details</h2><p className="mt-1 text-sm text-slate-500">Verified contact number: {phone}</p></div><button type="button" onClick={() => { setPhoneInput(''); setStage('phone'); setMessage(null); }} className="text-left text-sm font-bold text-emerald-700">Change phone number</button></div><label className="grid gap-2 text-sm font-semibold">Full name<input value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} placeholder="Your full name" className="rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label><label className="grid gap-2 text-sm font-semibold">Usual service address<textarea value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} placeholder="Street, area, city" rows={3} className="rounded-xl border border-slate-200 px-4 py-3 font-normal" /></label><p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">Your name, address, and verified phone are saved in your customer profile.</p>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p>}<button disabled={busy} className="rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Saving...' : 'Save profile'}</button></form>}
  </section></main>;
}