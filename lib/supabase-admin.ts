import { cookies } from 'next/headers';

const supabaseUrl = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const serviceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function serviceRest<T>(resource: string, query = '', init: RequestInit = {}): Promise<{ response: Response; data: T | null }> {
  const url = supabaseUrl();
  const key = serviceKey();
  if (!url || !key) throw new Error('Server data access is not configured. Set SUPABASE_SERVICE_ROLE_KEY in the server environment.');
  const response = await fetch(`${url}/rest/v1/${resource}${query ? `?${query}` : ''}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null) as T | null;
  return { response, data };
}

export async function verifiedCustomerPhone() {
  return (await cookies()).get('booking_phone_verified')?.value || null;
}

export async function authorizedAdmin() {
  const accessToken = (await cookies()).get('admin_access_token')?.value;
  const url = supabaseUrl();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const expectedEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!accessToken || !url || !publishableKey || !expectedEmail) return false;

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) return false;
  const user = await response.json() as { email?: string };
  return user.email?.toLowerCase() === expectedEmail;
}

export function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Request failed.';
  return Response.json({ error: message }, { status: message.includes('not configured') ? 503 : 500 });
}