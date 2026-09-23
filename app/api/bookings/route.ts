import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublishableKey) return NextResponse.json({ error: 'Booking service is not configured.' }, { status: 503 });

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

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/bookings?select=reference,status,created_at`, {
    method: 'POST',
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${supabasePublishableKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
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
    const databaseError = await response.json().catch(() => null) as { message?: string; details?: string; hint?: string } | null;
    const message = databaseError?.message || databaseError?.details || 'Booking could not be submitted. Please try again.';
    return NextResponse.json({ error: message, hint: databaseError?.hint }, { status: response.status });
  }
  const [booking] = await response.json();
  return NextResponse.json({ data: booking }, { status: 201 });
}