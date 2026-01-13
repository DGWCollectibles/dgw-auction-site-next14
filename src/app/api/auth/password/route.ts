import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const sitePassword = process.env.SITE_PASSWORD;

  // If no password configured, always succeed
  if (!sitePassword) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('site_auth', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  }

  if (password === sitePassword) {
    const response = NextResponse.json({ success: true });
    
    response.cookies.set('site_auth', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  }

  return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
}
