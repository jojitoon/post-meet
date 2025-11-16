import { NextRequest, NextResponse } from 'next/server';
import { authkit, withAuth } from '@workos-inc/authkit-nextjs';

export async function GET(request: NextRequest) {
  const { session } = await authkit(request);

  if (!session || !session.user) {
    return NextResponse.redirect('/sign-in?error=unauthorized');
  }

  const user = session.user;

  if (!user) {
    return NextResponse.redirect('/sign-in?error=unauthorized');
  }

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  if (error) {
    return NextResponse.redirect(`/settings?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect('/settings?error=missing_code');
  }

  // Verify state
  let stateData;
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64').toString());
  } catch {
    return NextResponse.redirect('/settings?error=invalid_state');
  }

  if (stateData.userId !== user.id) {
    return NextResponse.redirect('/settings?error=invalid_user');
  }

  const linkedinClientId = process.env.LINKEDIN_CLIENT_ID;
  const linkedinClientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  // Use request URL to determine base URL dynamically
  const requestUrl = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${requestUrl.protocol}//${requestUrl.host}`;

  if (!linkedinClientId || !linkedinClientSecret) {
    return NextResponse.redirect(baseUrl + '/settings?error=config_error');
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${baseUrl}/api/linkedin/callback`,
        client_id: linkedinClientId,
        client_secret: linkedinClientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('LinkedIn token exchange failed:', errorText);
      return NextResponse.redirect(baseUrl + '/settings?error=no_tokens');
    }

    const tokens = await tokenResponse.json();

    if (!tokens || !tokens.access_token) {
      return NextResponse.redirect(baseUrl + '/settings?error=no_tokens');
    }

    // Get user profile (with timeout and error handling)
    // This is optional - if it fails, we'll still save the connection
    let profileId = '';
    let profileName = '';

    try {
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        profileId = profile.sub || '';
        profileName = profile.name || '';
      } else {
        console.warn('LinkedIn profile fetch failed:', await profileResponse.text());
      }
    } catch (profileError: unknown) {
      // Handle timeout or other errors gracefully
      if (profileError instanceof Error && profileError.name === 'AbortError') {
        console.warn('LinkedIn profile fetch timed out - connection will still be saved');
      } else if (profileError instanceof Error) {
        console.warn('LinkedIn profile fetch error:', profileError.message);
      } else {
        console.warn('LinkedIn profile fetch error:', String(profileError));
      }
      // Continue without profile info - connection will still be saved
    }

    // Get WorkOS access token for Convex authentication
    const { accessToken: workosToken } = await withAuth();
    if (!workosToken) {
      return NextResponse.redirect(baseUrl + '/settings?error=auth_failed');
    }

    // Save to Convex via HTTP action
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
    if (!convexUrl) {
      return NextResponse.redirect(baseUrl + '/settings?error=config_error');
    }

    const url = new URL(`${convexUrl}/saveSocialMediaConnection`);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${workosToken}`,
      },
      body: JSON.stringify({
        platform: 'linkedin',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
        profileId: profileId,
        profileName: profileName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to save LinkedIn connection:', errorText);
      return NextResponse.redirect(baseUrl + '/settings?error=save_failed');
    }

    return NextResponse.redirect(baseUrl + '/settings?success=linkedin_connected');
  } catch (err) {
    console.error('LinkedIn OAuth callback error:', err);
    return NextResponse.redirect(baseUrl + `/settings?error=${encodeURIComponent('oauth_error')}`);
  }
}

