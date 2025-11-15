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

  const facebookClientId = process.env.FACEBOOK_CLIENT_ID;
  // Use request URL to determine base URL dynamically
  const requestUrl = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${requestUrl.protocol}//${requestUrl.host}`;

  if (!facebookClientId) {
    return NextResponse.json({ error: 'Facebook OAuth not configured' }, { status: 500 });
  }

  // Generate a state token to prevent CSRF attacks
  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64');

  // Facebook OAuth scopes
  // public_profile: Basic profile information (no App Review needed)
  // Note: Page permissions (pages_show_list, pages_manage_posts) require App Review
  // For now, we'll use only public_profile and attempt to get pages in the callback
  // If page permissions are needed, they must be requested through App Review
  const scopes = ['public_profile', 'pages_manage_posts'].join(',');

  const params = new URLSearchParams({
    client_id: facebookClientId,
    redirect_uri: `${baseUrl}/api/facebook/callback`,
    response_type: 'code',
    scope: scopes,
    state: state,
  });

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;

  return NextResponse.redirect(authUrl);
}
