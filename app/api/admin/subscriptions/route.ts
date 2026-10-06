import { NextRequest, NextResponse } from 'next/server';
import { authorizedAdmin, errorResponse, serviceRest } from '../../../../lib/supabase-admin';

type Subscription = { id: string; provider_id: string; plan_id: string; status: string; subscription_plans: { duration_days: number; name: string; max_ads: number | null } | null };
type AdStatus = { id: string; status: string };

export async function GET() {
  try {
    if (!(await authorizedAdmin())) return NextResponse.json({ error: 'Administrator sign-in required.' }, { status: 401 });
    const query = new URLSearchParams({ select: 'id,provider_id,plan_id,status,created_at,service_providers(business_name,provider_name,owner_phone),subscription_plans(name,duration_days,price,currency,max_ads)', status: 'eq.pending', order: 'created_at.asc' });
    const { response, data } = await serviceRest<unknown[]>('provider_subscriptions', query.toString());
    if (!response.ok) return NextResponse.json({ error: 'Could not load subscription applications.' }, { status: response.status });
    return NextResponse.json({ data: data || [] });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await authorizedAdmin())) return NextResponse.json({ error: 'Administrator sign-in required.' }, { status: 401 });
    const body = await request.json().catch(() => null) as { subscription_id?: string; action?: 'approve' | 'reject'; note?: string } | null;
    if (!body?.subscription_id || !['approve', 'reject'].includes(body.action || '')) return NextResponse.json({ error: 'Choose a subscription and approve or reject it.' }, { status: 400 });
    const lookupQuery = new URLSearchParams({ select: 'id,provider_id,plan_id,status,subscription_plans(name,duration_days,max_ads)', id: `eq.${body.subscription_id}`, limit: '1' });
    const selected = await serviceRest<Subscription[]>('provider_subscriptions', lookupQuery.toString());
    const subscription = selected.data?.[0];
    if (!selected.response.ok || !subscription || subscription.status !== 'pending') return NextResponse.json({ error: 'Pending subscription application not found.' }, { status: 404 });

    const now = new Date();
    const durationDays = subscription.subscription_plans?.duration_days || 30;
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const approved = body.action === 'approve';
    const updateQuery = new URLSearchParams({ id: `eq.${subscription.id}` });
    const updated = await serviceRest<unknown[]>('provider_subscriptions', updateQuery.toString(), {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify(approved
        ? { status: 'active', starts_at: now.toISOString(), expires_at: expiresAt.toISOString() }
        : { status: 'rejected' }),
    });
    if (!updated.response.ok) return NextResponse.json({ error: 'Could not update subscription application.' }, { status: updated.response.status });

    if (approved) {
      await serviceRest('service_providers', `id=eq.${subscription.provider_id}`, { method: 'PATCH', body: JSON.stringify({ status: 'active', verified_at: now.toISOString() }) });
      const adLimit = subscription.subscription_plans?.max_ads ?? 0;
      const adsQuery = new URLSearchParams({ select: 'id,status', provider_id: `eq.${subscription.provider_id}`, status: 'in.(active,pending_subscription)', order: 'created_at.asc', limit: '1000' });
      const providerAds = await serviceRest<AdStatus[]>('service_ads', adsQuery.toString());
      if (!providerAds.response.ok) return NextResponse.json({ error: 'Subscription approved, but provider ads could not be synchronized.' }, { status: providerAds.response.status });
      const orderedAds = providerAds.data || [];
      const allowedAds = orderedAds.slice(0, adLimit);
      const excessActiveAds = orderedAds.slice(adLimit).filter((ad) => ad.status === 'active');
      if (allowedAds.length) {
        const ids = allowedAds.map((ad) => ad.id).join(',');
        const activated = await serviceRest('service_ads', `id=in.(${ids})`, { method: 'PATCH', body: JSON.stringify({ status: 'active', updated_at: now.toISOString() }) });
        if (!activated.response.ok) return NextResponse.json({ error: 'Subscription approved, but allowed ads could not be activated.' }, { status: activated.response.status });
      }
      if (excessActiveAds.length) {
        const ids = excessActiveAds.map((ad) => ad.id).join(',');
        await serviceRest('service_ads', `id=in.(${ids})`, { method: 'PATCH', body: JSON.stringify({ status: 'pending_subscription', updated_at: now.toISOString() }) });
      }
      body.note = `${body.note || ''} Ads active: ${allowedAds.length}/${adLimit}.`;
    }
    await serviceRest('audit_logs', '', { method: 'POST', body: JSON.stringify({ action: approved ? 'provider_subscription_approved' : 'provider_subscription_rejected', entity_type: 'provider_subscription', entity_id: subscription.id, metadata: { duration_days: durationDays, note: body.note || null } }) });
    return NextResponse.json({ data: { subscription_id: subscription.id, status: approved ? 'active' : 'rejected', expires_at: approved ? expiresAt.toISOString() : null, max_ads: approved ? subscription.subscription_plans?.max_ads ?? 0 : null, payment_status: 'not_marked_paid' } });
  } catch (error) {
    return errorResponse(error);
  }
}