import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, serviceRest, verifiedCustomerPhone } from '../../../../lib/supabase-admin';

type Provider = { id: string };
type Plan = { id: string; name: string; duration_days: number; price: number | null; currency: string; max_ads: number | null };
type ProviderSubscription = { id: string; status: string; starts_at: string | null; expires_at: string | null; subscription_plans: { name: string; duration_days: number; max_ads: number | null } | null };

export async function GET() {
  try {
    const phone = await verifiedCustomerPhone();
    if (!phone) return NextResponse.json({ error: 'Verify your phone to view subscriptions.' }, { status: 401 });
    const providerQuery = new URLSearchParams({ select: 'id', owner_phone: `eq.${phone}`, limit: '1' });
    const provider = await serviceRest<Provider[]>('service_providers', providerQuery.toString());
    const plansQuery = new URLSearchParams({ select: 'id,name,duration_days,price,currency,max_ads', is_active: 'eq.true', order: 'duration_days.asc' });
    const plans = await serviceRest<Plan[]>('subscription_plans', plansQuery.toString());
    if (!plans.response.ok) return NextResponse.json({ error: 'Could not load subscription plans.' }, { status: plans.response.status });
    if (!provider.response.ok || !provider.data?.[0]) return NextResponse.json({ data: { plans: plans.data || [], applications: [], activeSubscription: null } });
    const applicationsQuery = new URLSearchParams({ select: 'id,plan_id,status,starts_at,expires_at,created_at,subscription_plans(name,duration_days,price,currency,max_ads)', provider_id: `eq.${provider.data[0].id}`, order: 'created_at.desc' });
    const applications = await serviceRest<unknown[]>('provider_subscriptions', applicationsQuery.toString());
    const activeQuery = new URLSearchParams({ select: 'id,status,starts_at,expires_at,subscription_plans(name,duration_days,max_ads)', provider_id: `eq.${provider.data[0].id}`, status: 'eq.active', expires_at: `gt.${new Date().toISOString()}`, order: 'created_at.desc', limit: '1' });
    const active = await serviceRest<ProviderSubscription[]>('provider_subscriptions', activeQuery.toString());
    return NextResponse.json({ data: { plans: plans.data || [], applications: applications.data || [], activeSubscription: active.data?.[0] || null } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const phone = await verifiedCustomerPhone();
    if (!phone) return NextResponse.json({ error: 'Verify your phone before applying for a subscription.' }, { status: 401 });
    const body = await request.json().catch(() => null) as { plan_id?: string } | null;
    if (!body?.plan_id) return NextResponse.json({ error: 'Choose a subscription plan.' }, { status: 400 });
    const providerQuery = new URLSearchParams({ select: 'id', owner_phone: `eq.${phone}`, limit: '1' });
    const provider = await serviceRest<Provider[]>('service_providers', providerQuery.toString());
    const providerId = provider.data?.[0]?.id;
    if (!provider.response.ok || !providerId) return NextResponse.json({ error: 'Create a provider profile before applying for a subscription.' }, { status: 409 });
    const existingQuery = new URLSearchParams({ select: 'id', provider_id: `eq.${providerId}`, status: 'eq.pending', limit: '1' });
    const existing = await serviceRest<{ id: string }[]>('provider_subscriptions', existingQuery.toString());
    if (existing.data?.length) return NextResponse.json({ error: 'You already have a subscription application awaiting admin review.' }, { status: 409 });

    const query = new URLSearchParams({ select: 'id,provider_id,plan_id,status,created_at' });
    const result = await serviceRest<unknown[]>('provider_subscriptions', query.toString(), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ provider_id: providerId, plan_id: body.plan_id, starts_at: null, expires_at: null, status: 'pending' }),
    });
    if (!result.response.ok) return NextResponse.json({ error: 'Could not submit subscription application.' }, { status: result.response.status });
    return NextResponse.json({ data: result.data?.[0] || null }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}