'use node';

import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';
import { google } from 'googleapis';

// Internal action to sync events from Google Calendar
export const syncCalendarEvents = internalAction({
  args: {
    calendarId: v.id('calendars'),
  },
  handler: async (ctx, args) => {
    // Get calendar details
    const calendar = await ctx.runMutation(internal.calendars.getCalendarData, {
      calendarId: args.calendarId,
    });

    if (!calendar) {
      console.error('Calendar not found:', args.calendarId);
      return;
    }

    try {
      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      // Set credentials
      oauth2Client.setCredentials({
        access_token: calendar.accessToken,
        refresh_token: calendar.refreshToken,
      });

      // Refresh token if needed
      if (oauth2Client.credentials.expiry_date && oauth2Client.credentials.expiry_date < Date.now()) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        
        // Update calendar with new access token
        await ctx.runMutation(internal.eventsQueries.updateCalendarToken, {
          calendarId: args.calendarId,
          accessToken: credentials.access_token || calendar.accessToken,
        });
      }

      // Get calendar API client
      const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });

      // Fetch events from the last 30 days and next 90 days
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 90);

      const response = await calendarApi.events.list({
        calendarId: calendar.calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: 2500,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      console.log(`Fetched ${events.length} events for calendar ${calendar.calendarName}`);

      // Helper function to extract meeting links
      const extractMeetingLink = (event: any): string | undefined => {
        // Check for Google Meet link in hangoutLink
        if (event.hangoutLink) {
          return event.hangoutLink;
        }

        // Check for Zoom or Google Meet links in location
        if (event.location) {
          const zoomMatch = event.location.match(/https?:\/\/(?:[a-z0-9-]+\.)?(?:zoom\.us|zoom\.com)\/[^\s]+/i);
          if (zoomMatch) {
            return zoomMatch[0];
          }
          const meetMatch = event.location.match(/https?:\/\/(?:meet\.google\.com|meet\.app\/)[^\s]+/i);
          if (meetMatch) {
            return meetMatch[0];
          }
        }

        // Check for Zoom or Google Meet links in description
        if (event.description) {
          const zoomMatch = event.description.match(/https?:\/\/(?:[a-z0-9-]+\.)?(?:zoom\.us|zoom\.com)\/[^\s<>"']+/i);
          if (zoomMatch) {
            return zoomMatch[0];
          }
          const meetMatch = event.description.match(/https?:\/\/(?:meet\.google\.com|meet\.app\/)[^\s<>"']+/i);
          if (meetMatch) {
            return meetMatch[0];
          }
        }

        return undefined;
      };

      // Sync events to database
      await ctx.runMutation(internal.eventsQueries.syncEventsToDb, {
        calendarId: args.calendarId,
        userId: calendar.userId,
        events: events.map((event) => ({
          googleEventId: event.id || '',
          title: event.summary || 'No Title',
          description: event.description || undefined,
          startTime: event.start?.dateTime || event.start?.date || '',
          endTime: event.end?.dateTime || event.end?.date || '',
          location: event.location || undefined,
          attendees: event.attendees?.map((a) => a.email || '').filter(Boolean) || undefined,
          status: event.status || 'confirmed',
          htmlLink: event.htmlLink || undefined,
          updated: event.updated || '',
          meetingLink: extractMeetingLink(event),
        })),
      });

      console.log(`Synced ${events.length} events to database`);
    } catch (error) {
      const err = error as Error;
      console.error('Error syncing calendar events:', err.message);
      throw err;
    }
  },
});

