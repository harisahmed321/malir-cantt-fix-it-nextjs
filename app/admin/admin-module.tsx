import Link from 'next/link';
import { cookies } from 'next/headers';

export type AdminModuleProps = {
  eyebrow: string;
  title: string;
  description: string;
  stats: { label: string; value: string; tone?: string }[];
  columns: string[];
  rows?: string[][];
  action?: string;
  dataError?: string | null;
};

export async function AdminModule({ eyebrow, title, description, stats, columns, rows = [], action, dataError = null }: AdminModuleProps) {
  const hasAdminSession = Boolean((await cookies()).get('admin_access_token')?.value);

  return <main className="p-5 md:p-8"><div className="mx-auto max-w-7xl"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-600">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{title}</h1><p className="mt-2 max-w-2xl text-slate-500">{description}</p></div>{action && <button className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">{action}</button>}</div><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{stat.label}</p><p className={`mt-3 text-3xl font-black ${stat.tone || 'text-slate-950'}`}>{stat.value}</p></div>)}</div><div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="font-bold">Recent records</h2><span className="text-xs font-semibold text-slate-400">Live Supabase data</span></div>{dataError ? <div className="px-5 py-14 text-center"><p className="font-bold text-red-700">Unable to load records</p><p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">{dataError}</p></div> : rows.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((column) => <th key={column} className="px-5 py-3 font-bold">{column}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="border-t border-slate-100">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-5 py-4 text-slate-700">{cell}</td>)}</tr>)}</tbody></table></div> : <div className="px-5 py-14 text-center"><p className="font-bold text-slate-700">{hasAdminSession ? 'No records found' : 'Admin authentication required'}</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{hasAdminSession ? 'The database query returned no records.' : <>Sign in with an administrator account to load private records. Public provider data remains available at <Link className="font-semibold text-emerald-700" href="/services">Services</Link>.</>}</p></div>}</div></div></main>;
}