import { NextRequest, NextResponse } from 'next/server';
import { authkit } from '@workos-inc/authkit-nextjs';

export async function GET(request: NextRequest) {
  const { session } = await authkit(request);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 404 });
  }

  const user = session.user;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';

  if (!googleClientId || !googleClientSecret) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
  }

  // Generate a state token to prevent CSRF attacks
  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64');

  // Google OAuth scopes for calendar access and user info
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: `${baseUrl}/api/google/callback`,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
    state: state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
