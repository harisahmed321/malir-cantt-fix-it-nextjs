import { NextResponse } from 'next/server';
import { errorResponse, serviceRest, verifiedCustomerPhone } from '../../../../lib/supabase-admin';

export async function GET() {
  try {
    const phone = await verifiedCustomerPhone();
    if (!phone) return NextResponse.json({ error: 'Verify your phone to view provider bookings.' }, { status: 401 });
    const providerQuery = new URLSearchParams({ select: 'id', owner_phone: `eq.${phone}`, limit: '1' });
    const provider = await serviceRest<{ id: string }[]>('service_providers', providerQuery.toString());
    const providerId = provider.data?.[0]?.id;
    if (!provider.response.ok || !providerId) return NextResponse.json({ error: 'Provider profile not found.' }, { status: 404 });
    const bookingsQuery = new URLSearchParams({ select: 'id,reference,customer_name,customer_phone,service_required,problem_description,preferred_date,preferred_time,service_address,status,created_at', provider_id: `eq.${providerId}`, order: 'created_at.desc' });
    const bookings = await serviceRest<unknown[]>('bookings', bookingsQuery.toString());
    if (!bookings.response.ok) return NextResponse.json({ error: 'Could not load provider bookings.' }, { status: bookings.response.status });
    return NextResponse.json({ data: bookings.data || [] });
  } catch (error) {
    return errorResponse(error);
  }
}