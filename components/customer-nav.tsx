'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function CustomerNav() {
  const [phone, setPhone] = useState<string | null>(null);
  const [hasProviderProfile, setHasProviderProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function refreshSession() {
      try {
        const response = await fetch('/api/customer/session', { cache: 'no-store' });
        const result = await response.json();
        const activePhone = result.data?.phone || null;
        setPhone(activePhone);
        if (activePhone) {
          const providerResponse = await fetch('/api/provider/profile', { cache: 'no-store' });
          const providerResult = await providerResponse.json();
          setHasProviderProfile(Boolean(providerResponse.ok && providerResult.data));
        } else {
          setHasProviderProfile(false);
        }
      } catch {
        setPhone(null);
        setHasProviderProfile(false);
      } finally {
        setLoading(false);
      }
    }
    const handleSessionChange = () => { void refreshSession(); };
    handleSessionChange();
    window.addEventListener('customer-session-changed', handleSessionChange);
    return () => window.removeEventListener('customer-session-changed', handleSessionChange);
  }, []);

  async function signOut() {
    await fetch('/api/customer/logout', { method: 'POST' });
    setPhone(null);
    setHasProviderProfile(false);
    setMenuOpen(false);
    window.dispatchEvent(new Event('customer-session-changed'));
    router.refresh();
  }

  return <header className="border-b border-slate-200 bg-white"><div className="container flex items-center justify-between gap-5 py-4"><a href="/" className="shrink-0 text-lg font-black tracking-tight text-slate-950">Fix It <span className="text-emerald-600">Malir</span></a><nav className="flex items-center gap-1 text-sm font-semibold text-slate-600"><a href="/services" className="whitespace-nowrap rounded-xl px-3 py-2 hover:bg-slate-100">Services</a><a href="/bookings" className="whitespace-nowrap rounded-xl px-3 py-2 hover:bg-slate-100">My bookings</a>{loading ? <span className="px-3 py-2 text-slate-400">Account…</span> : phone ? <div className="relative"><button onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-haspopup="menu" className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-slate-800 hover:bg-slate-50"><span className="hidden sm:inline">{phone}</span><span className="sm:hidden">Account</span><span aria-hidden="true" className="text-xs text-slate-400">⌄</span></button>{menuOpen && <><button aria-label="Close account menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} /><div role="menu" className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"><a role="menuitem" href="/profile" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Profile</a><a role="menuitem" href="/provider" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">{hasProviderProfile ? 'Provider portal' : 'Become a service provider'}</a><button role="menuitem" onClick={() => void signOut()} className="block w-full rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">Log out</button></div></>}</div> : <a href="/profile" className="whitespace-nowrap rounded-xl bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-500">Sign in</a>}</nav></div></header>;
}