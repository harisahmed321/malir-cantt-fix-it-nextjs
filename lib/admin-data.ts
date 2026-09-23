import { cookies } from 'next/headers';

type QueryResult<T> = { data: T[]; error: string | null; status: number };

export async function adminQuery<T>(resource: string, select: string): Promise<QueryResult<T>> {
  const accessToken = (await cookies()).get('admin_access_token')?.value;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!accessToken || !supabaseUrl || !publishableKey) return { data: [], error: 'Admin session is not configured.', status: 401 };

  const query = new URLSearchParams({ select });
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/${resource}?${query}`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    return { data: [], error: body?.message || `Supabase returned ${response.status}.`, status: response.status };
  }

  return { data: await response.json() as T[], error: null, status: response.status };
}