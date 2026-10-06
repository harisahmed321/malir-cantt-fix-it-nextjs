import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ data: { signed_out: true } });
  response.cookies.delete('booking_phone_verified');
  response.cookies.delete('booking_otp_hash');
  response.cookies.delete('booking_otp_phone');
  return response;
}