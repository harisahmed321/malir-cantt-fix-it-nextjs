import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const otpSecret = process.env.OTP_SECRET || 'malir-cantt-development-otp';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { phone?: string; otp?: string } | null;
  const phone = body?.phone?.trim();
  const otp = body?.otp?.trim();
  const cookieStore = await cookies();
  const expectedHash = cookieStore.get('booking_otp_hash')?.value;
  const expectedPhone = cookieStore.get('booking_otp_phone')?.value;
  const actualHash = phone && otp ? createHash('sha256').update(`${phone}:${otp}:${otpSecret}`).digest('hex') : '';

  if (!phone || !/^03\d{9}$/.test(phone)) return NextResponse.json({ error: 'Phone number must be exactly 11 digits and start with 03.' }, { status: 400 });
  if (!phone || !otp || phone !== expectedPhone || actualHash !== expectedHash) return NextResponse.json({ error: 'Invalid or expired OTP.' }, { status: 401 });

  const response = NextResponse.json({ data: { verified: true } });
  response.cookies.set('booking_phone_verified', phone, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1800, path: '/' });
  return response;
}