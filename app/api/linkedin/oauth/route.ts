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

  const linkedinClientId = process.env.LINKEDIN_CLIENT_ID;
  // Use request URL to determine base URL dynamically
  const requestUrl = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${requestUrl.protocol}//${requestUrl.host}`;

  if (!linkedinClientId) {
    return NextResponse.json({ error: 'LinkedIn OAuth not configured' }, { status: 500 });
  }

  // Generate a state token to prevent CSRF attacks
  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64');

  // LinkedIn OAuth scopes (using new OpenID Connect scopes)
  const scopes = ['openid', 'profile', 'email', 'w_member_social'].join(' ');

  const params = new URLSearchParams({
    client_id: linkedinClientId,
    redirect_uri: `${baseUrl}/api/linkedin/callback`,
    response_type: 'code',
    scope: scopes,
    state: state,
  });

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
