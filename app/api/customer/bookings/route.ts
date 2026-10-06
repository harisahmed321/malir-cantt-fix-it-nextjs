import { NextResponse } from 'next/server';
import { errorResponse, serviceRest, verifiedCustomerPhone } from '../../../../lib/supabase-admin';

export async function GET() {
  try {
    const phone = await verifiedCustomerPhone();
    if (!phone) return NextResponse.json({ error: 'Verify your phone to view booking history.' }, { status: 401 });
    const query = new URLSearchParams({ select: 'reference,customer_name,customer_phone,service_required,preferred_date,preferred_time,status,created_at,service_providers(business_name)', customer_phone: `eq.${phone}`, order: 'created_at.desc' });
    const { response, data } = await serviceRest<unknown[]>('bookings', query.toString());
    if (!response.ok) return NextResponse.json({ error: 'Could not load booking history.' }, { status: response.status });
    return NextResponse.json({ data: data || [] });
  } catch (error) {
    return errorResponse(error);
  }
}