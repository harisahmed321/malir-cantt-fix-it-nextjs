import { NextRequest, NextResponse } from 'next/server';
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

export async function PATCH(request: NextRequest) {
  try {
    const phone = await verifiedCustomerPhone();
    if (!phone) return NextResponse.json({ error: 'Verify your phone to manage provider bookings.' }, { status: 401 });
    const body = await request.json().catch(() => null) as { booking_id?: string; action?: string } | null;
    if (!body?.booking_id || body.action !== 'accept') return NextResponse.json({ error: 'A booking and supported action are required.' }, { status: 400 });

    const providerQuery = new URLSearchParams({ select: 'id', owner_phone: `eq.${phone}`, limit: '1' });
    const provider = await serviceRest<{ id: string }[]>('service_providers', providerQuery.toString());
    const providerId = provider.data?.[0]?.id;
    if (!provider.response.ok || !providerId) return NextResponse.json({ error: 'Provider profile not found.' }, { status: 404 });

    const bookingQuery = new URLSearchParams({ id: `eq.${body.booking_id}`, provider_id: `eq.${providerId}`, status: 'eq.pending', select: 'id,status,reference' });
    const updated = await serviceRest<{ id: string; status: string; reference: string }[]>('bookings', bookingQuery.toString(), {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ status: 'accepted', updated_at: new Date().toISOString() }),
    });
    if (!updated.response.ok) return NextResponse.json({ error: 'Could not accept this booking.' }, { status: updated.response.status });
    const booking = updated.data?.[0];
    if (!booking) return NextResponse.json({ error: 'Booking is no longer pending or does not belong to this provider.' }, { status: 409 });

    const history = await serviceRest('booking_status_history', '', {
      method: 'POST',
      body: JSON.stringify({ booking_id: booking.id, from_status: 'pending', to_status: 'accepted', note: `Accepted by provider for phone ${phone}` }),
    });
    if (!history.response.ok) return NextResponse.json({ error: 'Booking accepted, but status history could not be recorded.' }, { status: 500 });
    return NextResponse.json({ data: booking });
  } catch (error) {
    return errorResponse(error);
  }
}