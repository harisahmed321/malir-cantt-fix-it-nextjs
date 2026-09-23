'use client';

export function CustomerNav() {
  return <header className="border-b border-slate-200 bg-white"><div className="container flex items-center justify-between gap-5 py-4"><a href="/" className="shrink-0 text-lg font-black tracking-tight text-slate-950">Fix It <span className="text-emerald-600">Malir</span></a><nav className="flex items-center gap-2 overflow-x-auto text-sm font-semibold text-slate-600"><a href="/services" className="whitespace-nowrap rounded-xl px-3 py-2 hover:bg-slate-100">Services</a><a href="/bookings" className="whitespace-nowrap rounded-xl px-3 py-2 hover:bg-slate-100">My bookings</a><a href="/profile" className="whitespace-nowrap rounded-xl px-3 py-2 hover:bg-slate-100">Profile</a></nav></div></header>;
}