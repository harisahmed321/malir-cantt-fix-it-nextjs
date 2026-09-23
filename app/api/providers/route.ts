import { NextRequest, NextResponse } from 'next/server';

const defaultPageSize = 12;
const maxPageSize = 50;

function distanceInKilometers(latitude: number, longitude: number, targetLatitude: number, targetLongitude: number) {
  const earthRadius = 6371;
  const latitudeDelta = ((targetLatitude - latitude) * Math.PI) / 180;
  const longitudeDelta = ((targetLongitude - longitude) * Math.PI) / 180;
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos((latitude * Math.PI) / 180) * Math.cos((targetLatitude * Math.PI) / 180) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return NextResponse.json(
      { error: 'Provider discovery is not configured. Add Supabase URL and anon key.' },
      { status: 503 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(Number(searchParams.get('page') || 1), 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') || defaultPageSize), 1), maxPageSize);
  const search = searchParams.get('search')?.trim();
  const category = searchParams.get('category')?.trim();
  const latitude = Number(searchParams.get('lat'));
  const longitude = Number(searchParams.get('lng'));
  const minRating = Number(searchParams.get('minRating'));
  const sort = searchParams.get('sort') || 'distance';
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  const offset = (page - 1) * pageSize;
  const query = new URLSearchParams({
    select: 'id,business_name,business_slug,provider_name,description,initial_price,currency,status,profile_image_url,provider_services!inner(category_id,service_name,starting_price,service_categories!inner(name,slug)),provider_locations(area,city,latitude,longitude),feedback(overall_rating)',
    status: 'eq.active',
    order: 'created_at.desc',
    limit: String(pageSize),
    offset: String(offset),
  });

  if (search) query.set('or', `(business_name.ilike.*${search}*,provider_name.ilike.*${search}*)`);
  if (category) query.set('provider_services.service_categories.slug', `eq.${category}`);

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/service_providers?${query}`, {
      headers: {
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${supabasePublishableKey}`,
        Prefer: 'count=exact',
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      const error = response.status === 404
        ? 'Supabase schema is not applied yet. Run the migration in supabase/migrations/.'
        : 'Provider discovery request failed.';
      return NextResponse.json({ error }, { status: response.status });
    }

    const providers = await response.json();
    const normalizedProviders = providers.map((provider: { initial_price: number | null; provider_services?: { starting_price: number | null }[]; feedback?: { overall_rating: number }[] }) => {
      const prices = provider.provider_services?.map((service) => service.starting_price).filter((price): price is number => price != null) || [];
      const reviews = provider.feedback || [];
      return {
        ...provider,
        base_price: prices.length ? Math.min(...prices) : provider.initial_price,
        average_rating: reviews.length ? Number((reviews.reduce((sum, review) => sum + review.overall_rating, 0) / reviews.length).toFixed(1)) : null,
        review_count: reviews.length,
      };
    });
    const filteredProviders = normalizedProviders.filter((provider: { average_rating: number | null; }) => {
      if (Number.isFinite(minRating) && (provider.average_rating ?? 0) < minRating) return false;
      return true;
    });
    const data = hasLocation
      ? filteredProviders.map((provider: { provider_locations?: { latitude: number; longitude: number }[] }) => {
        const location = provider.provider_locations?.[0];
        if (!location) return { ...provider, distance_km: null };
        return { ...provider, distance_km: Number(distanceInKilometers(location.latitude, location.longitude, latitude, longitude).toFixed(1)) };
      })
      : filteredProviders;
    const sortedData = [...data].sort((left: { distance_km?: number | null; base_price?: number | null; business_name: string }, right: { distance_km?: number | null; base_price?: number | null; business_name: string }) => {
      if (sort === 'price-high') return (right.base_price ?? 0) - (left.base_price ?? 0);
      if (sort === 'price-low') return (left.base_price ?? Number.POSITIVE_INFINITY) - (right.base_price ?? Number.POSITIVE_INFINITY);
      if (sort === 'name-a-z') return left.business_name.localeCompare(right.business_name);
      if (sort === 'name-z-a') return right.business_name.localeCompare(left.business_name);
      return (left.distance_km ?? Number.POSITIVE_INFINITY) - (right.distance_km ?? Number.POSITIVE_INFINITY);
    });
    const contentRange = response.headers.get('content-range');
    const total = sortedData.length || (contentRange ? Number(contentRange.split('/')[1]) || 0 : 0);
    return NextResponse.json({ data: sortedData, page, pageSize, total });
  } catch {
    return NextResponse.json({ error: 'Provider discovery is temporarily unavailable.' }, { status: 503 });
  }
}