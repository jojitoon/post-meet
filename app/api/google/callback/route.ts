import { NextRequest, NextResponse } from 'next/server';
import { authkit, withAuth } from '@workos-inc/authkit-nextjs';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  const { session } = await authkit(request);

  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 404 });
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

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  if (!googleClientId || !googleClientSecret) {
    return NextResponse.redirect(baseUrl + '/settings?error=config_error');
  }

  try {
    // Exchange authorization code for tokens
    const oauth2Client = new google.auth.OAuth2(googleClientId, googleClientSecret, `${baseUrl}/api/google/callback`);

    const tokenResponse = await oauth2Client.getToken(code);
    const tokens = tokenResponse.tokens;

    if (!tokens || !tokens.access_token) {
      console.error('Token exchange failed - no access token received');
      console.error('Token response:', JSON.stringify(tokenResponse, null, 2));
      return NextResponse.redirect(baseUrl + '/settings?error=no_tokens');
    }

    // getToken automatically sets credentials on oauth2Client, verify they're there
    if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
      // If not set automatically, set them explicitly
      oauth2Client.setCredentials(tokens);
    }

    // Verify credentials are set
    const credentials = oauth2Client.credentials;
    if (!credentials || !credentials.access_token) {
      console.error('Failed to set credentials on OAuth2 client');
      console.error('Tokens received:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        scope: tokens.scope,
      });
      return NextResponse.redirect(baseUrl + '/settings?error=token_set_failed');
    }

    console.log('OAuth2 client credentials verified:', {
      hasAccessToken: !!credentials.access_token,
      hasRefreshToken: !!credentials.refresh_token,
      tokenType: credentials.token_type,
      accessTokenLength: credentials.access_token?.length || 0,
    });

    // Ensure we can get an access token (this validates the credentials are working)
    try {
      const accessToken = await oauth2Client.getAccessToken();
      console.log('Successfully retrieved access token, length:', accessToken.token?.length || 0);
    } catch (tokenError) {
      const error = tokenError as Error;
      console.error('Failed to get access token:', error.message);
      return NextResponse.redirect(baseUrl + '/settings?error=token_validation_failed');
    }

    // Get user email from OAuth2 userinfo
    let email = user.email || 'unknown';
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      if (userInfo.data?.email) {
        email = userInfo.data.email;
        console.log('Got email from Google:', email);
      }
    } catch (userInfoError) {
      const error = userInfoError as Error & { code?: string; response?: { data?: unknown } };
      console.error('Failed to get user info:', error.message);
      console.error('Error code:', error.code);
      console.error('Error response:', error.response?.data);
      // Continue with fallback email - this is not critical
    }

    // Get calendar list
    let primaryCalendar;
    try {
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const calendarList = await calendar.calendarList.list();

      console.log('Calendar list retrieved, items:', calendarList.data.items?.length || 0);

      primaryCalendar = calendarList.data.items?.find((cal) => cal.primary === true);

      if (!primaryCalendar && calendarList.data.items && calendarList.data.items.length > 0) {
        // Use first calendar if no primary found
        primaryCalendar = calendarList.data.items[0];
        console.log('Using first calendar as primary:', primaryCalendar.summary);
      }
    } catch (calendarError) {
      const error = calendarError as Error & { code?: string; response?: { data?: unknown } };
      console.error('Failed to get calendar list:', error.message);
      console.error('Error code:', error.code);
      console.error('Error response:', JSON.stringify(error.response?.data, null, 2));

      // If we can't get the calendar list, use a default primary calendar
      primaryCalendar = {
        id: 'primary',
        summary: email,
        primary: true,
      };
    }

    if (!primaryCalendar) {
      // Final fallback to primary calendar
      primaryCalendar = {
        id: 'primary',
        summary: email,
        primary: true,
      };
    }

    // Store calendar in database via Convex action
    // We'll create a Convex action that can be called from server-side
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

    console.log('Convex URL:', convexUrl);
    if (!convexUrl) {
      return NextResponse.redirect(baseUrl + '/settings?error=config_error');
    }

    // Get WorkOS access token for Convex authentication
    const { accessToken: workosToken } = await withAuth();
    if (!workosToken) {
      return NextResponse.redirect(baseUrl + '/settings?error=auth_failed');
    }

    // Call Convex HTTP action with auth token as query parameter
    // Convex HTTP actions authenticate via access_token query param or cookies
    const url = new URL(`${convexUrl}/addCalendarFromServer`);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${workosToken}`,
      },
      body: JSON.stringify({
        email: email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        calendarId: primaryCalendar.id || 'primary',
        calendarName: primaryCalendar.summary || 'Primary Calendar',
        isPrimary: primaryCalendar.primary || false,
      }),
    });

    if (!response.ok) {
      console.log('Response:', JSON.stringify(response, null, 2));
      const errorText = await response.text();
      console.error('Failed to save calendar:', errorText);
      return NextResponse.redirect(baseUrl + '/settings?error=save_failed');
    }

    return NextResponse.redirect(baseUrl + '/settings?success=calendar_added');
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(baseUrl + `/settings?error=${encodeURIComponent('oauth_error')}`);
  }
}
