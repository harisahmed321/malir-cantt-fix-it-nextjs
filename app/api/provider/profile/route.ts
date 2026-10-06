import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, serviceRest, verifiedCustomerPhone } from '../../../../lib/supabase-admin';

type ProviderProfile = { id: string; owner_phone: string; business_name: string; business_slug: string; provider_name: string; phone: string; description: string | null; status: string };

async function getProvider(phone: string) {
  const query = new URLSearchParams({ select: 'id,owner_phone,business_name,business_slug,provider_name,phone,description,status', owner_phone: `eq.${phone}`, limit: '1' });
  return serviceRest<ProviderProfile[]>('service_providers', query.toString());
}

export async function GET() {
  try {
    const phone = await verifiedCustomerPhone();
    if (!phone) return NextResponse.json({ error: 'Verify your phone to access provider tools.' }, { status: 401 });
    const { response, data } = await getProvider(phone);
    if (!response.ok) return NextResponse.json({ error: 'Could not load provider profile.' }, { status: response.status });
    const provider = data?.[0];
    if (!provider) return NextResponse.json({ data: null });
    const subscriptionQuery = new URLSearchParams({ select: 'status,starts_at,expires_at,subscription_plans(name,duration_days)', provider_id: `eq.${provider.id}`, order: 'created_at.desc', limit: '1' });
    const subscriptionResult = await serviceRest<{ status: string; starts_at: string | null; expires_at: string | null; subscription_plans: { name: string; duration_days: number } | null }[]>('provider_subscriptions', subscriptionQuery.toString());
    const latestSubscription = subscriptionResult.data?.[0] || null;
    const isSubscriptionExpired = latestSubscription?.status === 'active' && latestSubscription.expires_at && new Date(latestSubscription.expires_at).getTime() <= Date.now();
    return NextResponse.json({ data: { ...provider, profile_status: isSubscriptionExpired ? 'expired' : provider.status, subscription: latestSubscription } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const phone = await verifiedCustomerPhone();
    if (!phone) return NextResponse.json({ error: 'Verify your phone before creating a provider profile.' }, { status: 401 });
    const body = await request.json().catch(() => null) as { business_name?: string; provider_name?: string; description?: string } | null;
    const businessName = body?.business_name?.trim();
    const providerName = body?.provider_name?.trim();
    if (!businessName || !providerName) return NextResponse.json({ error: 'Business name and provider name are required.' }, { status: 400 });

    const existing = await getProvider(phone);
    if (!existing.response.ok) return NextResponse.json({ error: 'Could not check for an existing provider profile.' }, { status: existing.response.status });
    if (existing.data?.[0]) return NextResponse.json({ error: 'A provider profile already exists for this verified phone. Edit it instead.' }, { status: 409 });

    const slug = `${businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${phone.slice(-4)}`;
    const query = new URLSearchParams({ select: 'id,owner_phone,business_name,business_slug,provider_name,phone,description,status' });
    const { response, data } = await serviceRest<ProviderProfile[]>('service_providers', query.toString(), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ owner_phone: phone, business_name: businessName, business_slug: slug, provider_name: providerName, phone, description: body?.description?.trim() || null, status: 'pending_verification' }),
    });
    if (!response.ok) return NextResponse.json({ error: 'Could not create provider profile.' }, { status: response.status });
    return NextResponse.json({ data: data?.[0] || null }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const phone = await verifiedCustomerPhone();
    if (!phone) return NextResponse.json({ error: 'Verify your phone to edit provider profile.' }, { status: 401 });
    const body = await request.json().catch(() => null) as { business_name?: string; provider_name?: string; description?: string } | null;
    if (!body?.business_name?.trim() || !body.provider_name?.trim()) return NextResponse.json({ error: 'Business name and provider name are required.' }, { status: 400 });
    const query = new URLSearchParams({ owner_phone: `eq.${phone}`, select: 'id,owner_phone,business_name,business_slug,provider_name,phone,description,status' });
    const { response, data } = await serviceRest<ProviderProfile[]>('service_providers', query.toString(), {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ business_name: body.business_name.trim(), provider_name: body.provider_name.trim(), description: body.description?.trim() || null, updated_at: new Date().toISOString() }),
    });
    if (!response.ok) return NextResponse.json({ error: 'Could not update provider profile.' }, { status: response.status });
    return NextResponse.json({ data: data?.[0] || null });
  } catch (error) {
    return errorResponse(error);
  }
}