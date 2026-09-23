import { createHash, randomInt } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

const otpSecret = process.env.OTP_SECRET || 'malir-cantt-development-otp';

function hashOtp(phone: string, otp: string) {
  return createHash('sha256').update(`${phone}:${otp}:${otpSecret}`).digest('hex');
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { phone?: string } | null;
  const phone = body?.phone?.trim();
  if (!phone || !/^03\d{9}$/.test(phone)) return NextResponse.json({ error: 'Phone number must be exactly 11 digits and start with 03.' }, { status: 400 });

  const otp = String(randomInt(100000, 1000000));
  const response = NextResponse.json({
    data: {
      phone,
      notification: `Development OTP for ${phone}: ${otp}`,
      expires_in_seconds: 300,
    },
  });
  response.cookies.set('booking_otp_hash', hashOtp(phone, otp), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 300, path: '/' });
  response.cookies.set('booking_otp_phone', phone, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 300, path: '/' });
  return response;
}