import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.json({ error: 'Provider details are not configured.' }, { status: 503 });
  }

  const query = new URLSearchParams({
    select: 'id,business_name,business_slug,provider_name,phone,email,description,experience_years,initial_price,currency,status,profile_image_url,service_radius_km,provider_services(service_name,service_description,starting_price,service_categories(name,slug)),provider_locations(address,area,city,latitude,longitude,is_primary),feedback(id,overall_rating,service_quality_rating,comment,created_at)',
    id: `eq.${id}`,
    status: 'eq.active',
    limit: '1',
  });

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/service_providers?${query}`, {
      headers: { apikey: supabasePublishableKey, Authorization: `Bearer ${supabasePublishableKey}` },
      next: { revalidate: 30 },
    });

    if (!response.ok) return NextResponse.json({ error: 'Unable to load provider details.' }, { status: response.status });
    const providers = await response.json();
    if (!providers[0]) return NextResponse.json({ error: 'Provider not found.' }, { status: 404 });
    return NextResponse.json({ data: providers[0] });
  } catch {
    return NextResponse.json({ error: 'Provider details are temporarily unavailable.' }, { status: 503 });
  }
}