import { NextRequest, NextResponse } from 'next/server';
import { authkit, withAuth } from '@workos-inc/authkit-nextjs';

export async function GET(request: NextRequest) {
  // Use request URL to determine base URL dynamically
  const requestUrl = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${requestUrl.protocol}//${requestUrl.host}`;

  const { session } = await authkit(request);

  if (!session || !session.user) {
    return NextResponse.redirect(`${baseUrl}/sign-in?error=unauthorized`);
  }

  const user = session.user;

  if (!user) {
    return NextResponse.redirect(`${baseUrl}/sign-in?error=unauthorized`);
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  if (error) {
    return NextResponse.redirect(`${baseUrl}/settings?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/settings?error=missing_code`);
  }

  // Verify state
  let stateData;
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64').toString());
  } catch {
    return NextResponse.redirect(`${baseUrl}/settings?error=invalid_state`);
  }

  if (stateData.userId !== user.id) {
    return NextResponse.redirect(`${baseUrl}/settings?error=invalid_user`);
  }

  const facebookClientId = process.env.FACEBOOK_CLIENT_ID;
  const facebookClientSecret = process.env.FACEBOOK_CLIENT_SECRET;

  if (!facebookClientId || !facebookClientSecret) {
    return NextResponse.redirect(`${baseUrl}/settings?error=config_error`);
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: facebookClientId,
        client_secret: facebookClientSecret,
        redirect_uri: `${baseUrl}/api/facebook/callback`,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Facebook token exchange failed:', errorText);
      return NextResponse.redirect(`${baseUrl}/settings?error=no_tokens`);
    }

    const tokens = await tokenResponse.json();

    if (!tokens || !tokens.access_token) {
      return NextResponse.redirect(`${baseUrl}/settings?error=no_tokens`);
    }

    // Get user profile
    const profileResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${tokens.access_token}`,
    );

    let profileId = '';
    let profileName = '';
    let pageId = '';
    let pageAccessToken = '';
    let pageName = '';

    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      profileId = profile.id || '';
      profileName = profile.name || '';
    }

    // Get user's Facebook Pages (required for posting)
    // Facebook only allows posting to Pages, not personal profiles
    // Note: This requires pages_show_list permission which needs App Review
    // For development, this will fail but we'll save the connection anyway
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${tokens.access_token}`,
    );

    if (pagesResponse.ok) {
      const pagesData = await pagesResponse.json();
      // Use the first page if available
      if (pagesData.data && pagesData.data.length > 0) {
        const firstPage = pagesData.data[0];
        pageId = firstPage.id || '';
        pageAccessToken = firstPage.access_token || '';
        pageName = firstPage.name || '';
      } else {
        // User doesn't have any pages - warn them but still save the connection
        console.warn('User connected Facebook but has no Pages. Posting will not be available.');
      }
    } else {
      // This is expected if page permissions haven't been approved through App Review
      const errorText = await pagesResponse.text();
      console.warn(
        'Failed to fetch Facebook Pages (this is expected if page permissions require App Review):',
        errorText,
      );
      // Still save the connection - user can use it once permissions are approved
    }

    // Get WorkOS access token for Convex authentication
    const { accessToken: workosToken } = await withAuth();
    if (!workosToken) {
      return NextResponse.redirect(`${baseUrl}/settings?error=auth_failed`);
    }

    // Save to Convex via HTTP action
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
    if (!convexUrl) {
      return NextResponse.redirect(`${baseUrl}/settings?error=config_error`);
    }

    const url = new URL(`${convexUrl}/saveSocialMediaConnection`);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workosToken}`,
      },
      body: JSON.stringify({
        platform: 'facebook',
        accessToken: tokens.access_token,
        expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
        profileId: profileId,
        profileName: profileName,
        pageId: pageId,
        pageAccessToken: pageAccessToken,
        pageName: pageName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to save Facebook connection:', errorText);
      return NextResponse.redirect(`${baseUrl}/settings?error=save_failed`);
    }

    return NextResponse.redirect(`${baseUrl}/settings?success=facebook_connected`);
  } catch (err) {
    console.error('Facebook OAuth callback error:', err);
    return NextResponse.redirect(`${baseUrl}/settings?error=${encodeURIComponent('oauth_error')}`);
  }
}
