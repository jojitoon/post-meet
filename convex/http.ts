import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { api } from './_generated/api';

const http = httpRouter();

// HTTP endpoint to add a calendar (called from Next.js API route)
http.route({
  path: '/addCalendarFromServer',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { email, accessToken, refreshToken, calendarId, calendarName, isPrimary } = body;

    if (!email || !accessToken || !refreshToken || !calendarId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const calendarId_result = await ctx.runMutation(api.calendars.addCalendar, {
        email,
        accessToken,
        refreshToken,
        calendarId,
        calendarName: calendarName || 'Calendar',
        isPrimary: isPrimary || false,
      });

      return new Response(JSON.stringify({ success: true, id: calendarId_result }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error adding calendar:', error);
      return new Response(JSON.stringify({ error: 'Failed to add calendar' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }),
});

// HTTP endpoint to save social media connection (called from Next.js API route)
http.route({
  path: '/saveSocialMediaConnection',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const {
      platform,
      accessToken,
      refreshToken,
      expiresAt,
      profileId,
      profileName,
      pageId,
      pageAccessToken,
      pageName,
    } = body;

    if (!platform || !accessToken) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const connectionId = await ctx.runMutation(api.socialMedia.saveSocialMediaConnection, {
        platform,
        accessToken,
        refreshToken,
        expiresAt,
        profileId,
        profileName,
        pageId,
        pageAccessToken,
        pageName,
      });

      return new Response(JSON.stringify({ success: true, id: connectionId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error saving social media connection:', error);
      return new Response(JSON.stringify({ error: 'Failed to save connection' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }),
});

export default http;

