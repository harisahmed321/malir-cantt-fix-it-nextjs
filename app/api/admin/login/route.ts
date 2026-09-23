import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();

  if (!supabaseUrl || !publishableKey || !adminEmail) {
    return NextResponse.json({ error: 'Admin authentication is not configured.' }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid login request.' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !body.password) return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  if (email !== adminEmail) return NextResponse.json({ error: 'This account is not authorized for the admin portal.' }, { status: 403 });

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: body.password }),
  });

  if (!response.ok) {
    const authError = await response.json().catch(() => null) as { error_code?: string; msg?: string } | null;
    const error = authError?.error_code === 'email_not_confirmed'
      ? 'Confirm this admin email in Supabase Authentication, then try again.'
      : 'Supabase rejected the login. Check the email and password, and confirm the user exists.';
    return NextResponse.json({ error }, { status: 401 });
  }

  const session = await response.json();
  const result = NextResponse.json({ data: { email } });
  result.cookies.set('admin_access_token', session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: session.expires_in || 3600,
  });
  result.cookies.set('admin_refresh_token', session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return result;
}