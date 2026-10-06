import { NextResponse } from 'next/server';
import { errorResponse, serviceRest } from '../../../lib/supabase-admin';

export async function GET() {
  try {
    const query = new URLSearchParams({ select: 'id,name,slug,description', is_active: 'eq.true', order: 'name.asc' });
    const { response, data } = await serviceRest<{ id: string; name: string; slug: string; description: string | null }[]>('service_categories', query.toString());
    if (!response.ok) return NextResponse.json({ error: 'Could not load categories.' }, { status: response.status });
    return NextResponse.json({ data: data || [] });
  } catch (error) {
    return errorResponse(error);
  }
}