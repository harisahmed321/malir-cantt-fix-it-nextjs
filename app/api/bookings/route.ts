import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { serviceRest } from '../../../lib/supabase-admin';

type BookingRequest = {
  provider_id?: string;
  customer_name?: string;
  customer_phone?: string;
  service_required?: string;
  problem_description?: string;
  preferred_date?: string;
  preferred_time?: string;
  service_address?: string;
  latitude?: number;
  longitude?: number;
};

export async function POST(request: NextRequest) {
  let body: BookingRequest;
  try {
    body = (await request.json()) as BookingRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid booking request.' }, { status: 400 });
  }

  const requiredFields: (keyof BookingRequest)[] = ['provider_id', 'customer_name', 'customer_phone', 'service_required', 'service_address'];
  if (requiredFields.some((field) => !String(body[field] || '').trim())) return NextResponse.json({ error: 'Please complete all required booking fields.' }, { status: 400 });

  const verifiedPhone = (await cookies()).get('booking_phone_verified')?.value;
  if (!/^03\d{9}$/.test(String(body.customer_phone || '').trim())) return NextResponse.json({ error: 'Phone number must be exactly 11 digits and start with 03.' }, { status: 400 });
  if (!verifiedPhone || verifiedPhone !== body.customer_phone?.trim()) return NextResponse.json({ error: 'Verify the customer phone number with OTP before submitting the booking.' }, { status: 401 });

  const providerQuery = new URLSearchParams({ select: 'id', id: `eq.${body.provider_id}`, status: 'eq.active', limit: '1' });
  const providerResult = await serviceRest<{ id: string }[]>('service_providers', providerQuery.toString());
  if (!providerResult.response.ok || !providerResult.data?.length) return NextResponse.json({ error: 'This provider is not currently accepting booking requests.' }, { status: 404 });

  const profileQuery = new URLSearchParams({ on_conflict: 'phone' });
  const profileSave = await serviceRest<unknown[]>('customer_profiles', profileQuery.toString(), {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ phone: verifiedPhone, full_name: body.customer_name?.trim(), address: body.service_address?.trim(), updated_at: new Date().toISOString() }),
  });
  if (!profileSave.response.ok) {
    const profileError = profileSave.data as { message?: string } | null;
    return NextResponse.json({ error: profileError?.message || 'Could not save customer profile.' }, { status: profileSave.response.status });
  }

  const bookingQuery = new URLSearchParams({ select: 'reference,status,created_at' });
  const { response, data } = await serviceRest<{ reference: string; status: string; created_at: string }[]>('bookings', bookingQuery.toString(), {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      customer_id: null,
      provider_id: body.provider_id,
      customer_name: body.customer_name?.trim(),
      customer_phone: body.customer_phone?.trim(),
      service_required: body.service_required?.trim(),
      problem_description: body.problem_description?.trim() || null,
      preferred_date: body.preferred_date || null,
      preferred_time: body.preferred_time || null,
      service_address: body.service_address?.trim(),
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
    }),
  });

  if (!response.ok) {
    const databaseError = data as { message?: string; details?: string; hint?: string } | null;
    const message = databaseError?.message || databaseError?.details || 'Booking could not be submitted. Please try again.';
    return NextResponse.json({ error: message, hint: databaseError?.hint }, { status: response.status });
  }
  const booking = data?.[0];
  return NextResponse.json({ data: booking }, { status: 201 });
}