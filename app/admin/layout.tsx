import Link from 'next/link';
import { cookies } from 'next/headers';
import { LogoutButton } from './session-actions';

const navigation = [
  ['Dashboard', '/admin'],
  ['Providers', '/admin/providers'],
  ['Customers', '/admin/customers'],
  ['Bookings', '/admin/bookings'],
  ['Services', '/admin/services'],
  ['Subscriptions', '/admin/subscriptions'],
  ['Feedback', '/admin/feedback'],
  ['Reports', '/admin/reports'],
];

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const hasAdminSession = Boolean((await cookies()).get('admin_access_token')?.value);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <aside className="w-full border-b border-slate-200 bg-slate-950 text-white lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:border-slate-800">
        <div className="flex items-center justify-between px-6 py-6 lg:block">
          <Link href="/admin" className="text-lg font-black tracking-tight">Fix It <span className="text-emerald-400">Admin</span></Link>
          <Link href="/" className="text-xs font-semibold text-slate-400 hover:text-white lg:mt-2 lg:block">← View customer app</Link>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:block lg:space-y-1 lg:px-4">
          {navigation.map(([label, href]) => <Link key={href} href={href} className="block whitespace-nowrap rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">{label}</Link>)}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 md:px-8">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Operations</p><p className="mt-1 text-sm font-semibold text-slate-500">Malir Cantt service platform</p></div>
          <div className="flex items-center gap-3">{hasAdminSession ? <LogoutButton /> : <Link href="/admin/login" className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white">Sign in</Link>}<span className="hidden text-right text-xs text-slate-500 sm:block"><strong className="block text-slate-900">{hasAdminSession ? 'Administrator' : 'Guest'}</strong>{hasAdminSession ? 'Permission-based access' : 'Not signed in'}</span><div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-black text-emerald-700">{hasAdminSession ? 'A' : '?'}</div></div>
        </header>
        {children}
      </div>
    </div>
  );
}