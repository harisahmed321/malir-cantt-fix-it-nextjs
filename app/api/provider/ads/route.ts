import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, serviceRest, verifiedCustomerPhone } from '../../../../lib/supabase-admin';

type OwnerProvider = { id: string };
type ProviderAd = { id: string; title: string; description: string; base_price: number; status: string; category_id: string; service_categories?: { name: string } };
type ActiveSubscription = { id: string; status: string; expires_at: string; subscription_plans: { name: string; duration_days: number; max_ads: number | null } | null };

async function ownedProviderId(phone: string) {
  const query = new URLSearchParams({ select: 'id', owner_phone: `eq.${phone}`, limit: '1' });
  const { response, data } = await serviceRest<OwnerProvider[]>('service_providers', query.toString());
  return response.ok ? data?.[0]?.id || null : null;
}

export async function GET() {
  try {
    const phone = await verifiedCustomerPhone();
    if (!phone) return NextResponse.json({ error: 'Verify your phone to view provider ads.' }, { status: 401 });
    const providerId = await ownedProviderId(phone);
    if (!providerId) return NextResponse.json({ data: [], subscription: null, ad_limit: 0, ad_count: 0, ads_remaining: 0 });
    const query = new URLSearchParams({ select: 'id,title,description,base_price,status,category_id,service_categories(name)', provider_id: `eq.${providerId}`, order: 'created_at.desc' });
    const subscriptionQuery = new URLSearchParams({ select: 'id,status,expires_at,subscription_plans(name,duration_days,max_ads)', provider_id: `eq.${providerId}`, status: 'eq.active', order: 'created_at.desc', limit: '1' });
    const [adsResult, subscriptionResult] = await Promise.all([
      serviceRest<ProviderAd[]>('service_ads', query.toString()),
      serviceRest<ActiveSubscription[]>('provider_subscriptions', subscriptionQuery.toString()),
    ]);
    if (!adsResult.response.ok) return NextResponse.json({ error: 'Could not load provider ads.' }, { status: adsResult.response.status });
    if (!subscriptionResult.response.ok) return NextResponse.json({ error: 'Could not load subscription quota.' }, { status: subscriptionResult.response.status });
    const subscription = subscriptionResult.data?.[0] || null;
    const subscriptionActive = Boolean(subscription && new Date(subscription.expires_at).getTime() > Date.now());
    const adLimit = subscriptionActive ? subscription?.subscription_plans?.max_ads ?? 0 : 0;
    const data = adsResult.data || [];
    return NextResponse.json({ data, subscription: subscriptionActive ? subscription : null, ad_limit: adLimit, ad_count: data.length, ads_remaining: Math.max(0, adLimit - data.length) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const phone = await verifiedCustomerPhone();
    if (!phone) return NextResponse.json({ error: 'Verify your phone before creating an ad.' }, { status: 401 });
    const providerId = await ownedProviderId(phone);
    if (!providerId) return NextResponse.json({ error: 'Create your provider profile before creating an ad.' }, { status: 409 });
    const body = await request.json().catch(() => null) as { category_id?: string; title?: string; description?: string; base_price?: number } | null;
    const title = body?.title?.trim();
    const description = body?.description?.trim();
    const basePrice = Number(body?.base_price);
    if (!body?.category_id || !title || !description || !Number.isFinite(basePrice) || basePrice < 0) return NextResponse.json({ error: 'Category, title, description, and a non-negative base price are required.' }, { status: 400 });

    const subscriptionQuery = new URLSearchParams({ select: 'id,expires_at,subscription_plans(name,max_ads)', provider_id: `eq.${providerId}`, status: 'eq.active', expires_at: `gt.${new Date().toISOString()}`, order: 'created_at.desc', limit: '1' });
    const activeSubscription = await serviceRest<ActiveSubscription[]>('provider_subscriptions', subscriptionQuery.toString());
    if (!activeSubscription.response.ok) return NextResponse.json({ error: 'Could not check provider subscription.' }, { status: activeSubscription.response.status });
    const subscription = activeSubscription.data?.[0];
    if (!subscription) return NextResponse.json({ error: 'Apply for a subscription on your provider dashboard and wait for admin approval before creating ads.' }, { status: 403 });

    const adsCountQuery = new URLSearchParams({ select: 'id', provider_id: `eq.${providerId}` });
    const existingAds = await serviceRest<{ id: string }[]>('service_ads', adsCountQuery.toString());
    if (!existingAds.response.ok) return NextResponse.json({ error: 'Could not check your ad allowance.' }, { status: existingAds.response.status });
    const adLimit = subscription.subscription_plans?.max_ads ?? 0;
    const currentCount = existingAds.data?.length || 0;
    if (currentCount >= adLimit) return NextResponse.json({ error: `Your ${subscription.subscription_plans?.name || 'active'} plan allows ${adLimit} ads. Remove an existing ad or apply for a higher-capacity plan.` }, { status: 409 });

    const status = 'active';
    const query = new URLSearchParams({ select: 'id,title,description,base_price,status,category_id' });
    const { response, data } = await serviceRest<ProviderAd[]>('service_ads', query.toString(), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ provider_id: providerId, category_id: body.category_id, title, description, base_price: basePrice, status }),
    });
    if (!response.ok) return NextResponse.json({ error: 'Could not create service ad.' }, { status: response.status });
    return NextResponse.json({ data: data?.[0] || null, subscription_required: false, ad_limit: adLimit, ads_remaining: Math.max(0, adLimit - currentCount - 1) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const phone = await verifiedCustomerPhone();
    if (!phone) return NextResponse.json({ error: 'Verify your phone to edit provider ads.' }, { status: 401 });
    const providerId = await ownedProviderId(phone);
    const body = await request.json().catch(() => null) as { id?: string; title?: string; description?: string; base_price?: number; category_id?: string } | null;
    if (!providerId || !body?.id) return NextResponse.json({ error: 'Provider ad not found.' }, { status: 404 });
    const query = new URLSearchParams({ id: `eq.${body.id}`, provider_id: `eq.${providerId}`, select: 'id,title,description,base_price,status,category_id' });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) patch.title = body.title.trim();
    if (body.description !== undefined) patch.description = body.description.trim();
    if (body.base_price !== undefined && Number.isFinite(Number(body.base_price)) && Number(body.base_price) >= 0) patch.base_price = Number(body.base_price);
    if (body.category_id !== undefined) patch.category_id = body.category_id;
    const { response, data } = await serviceRest<ProviderAd[]>('service_ads', query.toString(), { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
    if (!response.ok) return NextResponse.json({ error: 'Could not update provider ad.' }, { status: response.status });
    return NextResponse.json({ data: data?.[0] || null });
  } catch (error) {
    return errorResponse(error);
  }
}