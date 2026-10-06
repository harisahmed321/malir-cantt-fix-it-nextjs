import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const phone = cookieStore.get('booking_phone_verified')?.value;
  return NextResponse.json({ data: { authenticated: Boolean(phone), phone: phone || null } });
}