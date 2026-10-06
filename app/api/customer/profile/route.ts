import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, serviceRest, verifiedCustomerPhone } from '../../../../lib/supabase-admin';

type CustomerProfile = { phone: string; full_name: string; address: string | null; updated_at: string };

async function upstreamError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { message?: string; hint?: string } | null;
  return NextResponse.json({ error: body?.message || fallback, hint: body?.hint }, { status: response.status });
}

export async function GET() {
  try {
    const phone = await verifiedCustomerPhone();
    if (!phone) return NextResponse.json({ error: 'Verify your phone to access your profile.' }, { status: 401 });
    const query = new URLSearchParams({ select: 'phone,full_name,address,updated_at', phone: `eq.${phone}`, limit: '1' });
    const { response, data } = await serviceRest<CustomerProfile[]>('customer_profiles', query.toString());
    if (!response.ok) return upstreamError(response, 'Could not load customer profile.');
    return NextResponse.json({ data: data?.[0] || null });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const phone = await verifiedCustomerPhone();
    if (!phone) return NextResponse.json({ error: 'Verify your phone to update your profile.' }, { status: 401 });
    const body = await request.json().catch(() => null) as { full_name?: string; address?: string } | null;
    const fullName = body?.full_name?.trim();
    if (!fullName) return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    const query = new URLSearchParams({ on_conflict: 'phone', select: 'phone,full_name,address,updated_at' });
    const { response, data } = await serviceRest<CustomerProfile[]>('customer_profiles', query.toString(), {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({ phone, full_name: fullName, address: body?.address?.trim() || null, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) return upstreamError(response, 'Could not save customer profile.');
    return NextResponse.json({ data: data?.[0] || null });
  } catch (error) {
    return errorResponse(error);
  }
}