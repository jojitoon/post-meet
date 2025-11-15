import { v } from 'convex/values';
import { query, mutation, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';

// Internal mutation to update event bot information
export const updateEventBotInfo = internalMutation({
  args: {
    eventId: v.id('events'),
    botId: v.string(),
    botStatus: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      botId: args.botId,
      botStatus: args.botStatus,
      botProvider: 'recall', // Set provider when using Recall.ai
    });
  },
});

// Internal mutation to update bot status only
export const updateBotStatus = internalMutation({
  args: {
    eventId: v.id('events'),
    botStatus: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      botStatus: args.botStatus,
    });
  },
});

// Internal mutation to update Meeting BaaS bot information
export const updateMeetingBaasBotInfo = internalMutation({
  args: {
    eventId: v.id('events'),
    botId: v.string(),
    botStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      meetingBaasBotId: args.botId,
      botProvider: 'meeting_baas',
      botStatus: args.botStatus || 'in_meeting',
    });
  },
});

// Internal mutation to update Meeting BaaS transcription
export const updateMeetingBaasTranscription = internalMutation({
  args: {
    eventId: v.id('events'),
    transcription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      meetingBaasTranscription: args.transcription,
      botStatus: 'transcribed', // Set status to transcribed after getting transcription
    });
  },
});

// Internal query to get events with bots in meeting (for polling transcripts)
export const getEventsWithBotsInMeeting = internalQuery({
  args: {
    currentTime: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date(args.currentTime);

    // Get all events with bots
    const allEvents = await ctx.db.query('events').collect();

    return allEvents.filter((event) => {
      const eventEnd = new Date(event.endTime);
      const eventStart = new Date(event.startTime);
      // Event has ended or is currently happening, has a bot, and bot status is 'in_meeting'
      return (
        (eventEnd <= now || eventStart <= now) &&
        (event.botId !== undefined || event.meetingBaasBotId !== undefined) &&
        event.botStatus === 'in_meeting'
      );
    });
  },
});

// Internal mutation to update calendar token
export const updateCalendarToken = internalMutation({
  args: {
    calendarId: v.id('calendars'),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const update: { accessToken: string; refreshToken?: string } = {
      accessToken: args.accessToken,
    };

    // Only update refresh token if provided (Google sometimes doesn't return a new one)
    if (args.refreshToken) {
      update.refreshToken = args.refreshToken;
    }

    await ctx.db.patch(args.calendarId, update);
  },
});

// Internal mutation to sync events to database
export const syncEventsToDb = internalMutation({
  args: {
    calendarId: v.id('calendars'),
    userId: v.string(),
    events: v.array(
      v.object({
        googleEventId: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        startTime: v.string(),
        endTime: v.string(),
        location: v.optional(v.string()),
        attendees: v.optional(v.array(v.string())),
        status: v.string(),
        htmlLink: v.optional(v.string()),
        updated: v.string(),
        meetingLink: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Get existing events for this calendar
    const existingEvents = await ctx.db
      .query('events')
      .withIndex('by_calendar', (q) => q.eq('calendarId', args.calendarId))
      .collect();

    // Create a map of existing events by googleEventId
    const existingMap = new Map(existingEvents.map((e) => [e.googleEventId, e]));

    // Process new events
    const processedIds = new Set<string>();
    for (const event of args.events) {
      processedIds.add(event.googleEventId);
      const existing = existingMap.get(event.googleEventId);

      if (!existing) {
        // Insert new event
        await ctx.db.insert('events', {
          userId: args.userId,
          calendarId: args.calendarId,
          googleEventId: event.googleEventId,
          title: event.title,
          description: event.description,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          attendees: event.attendees,
          status: event.status,
          htmlLink: event.htmlLink,
          updated: event.updated,
          meetingLink: event.meetingLink,
        });
      } else {
        // Update existing event if it has changed
        if (existing.updated !== event.updated) {
          await ctx.db.patch(existing._id, {
            title: event.title,
            description: event.description,
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
            attendees: event.attendees,
            status: event.status,
            htmlLink: event.htmlLink,
            updated: event.updated,
            meetingLink: event.meetingLink,
          });
        }
      }
    }

    // Delete events that are no longer in Google Calendar
    for (const existing of existingEvents) {
      if (!processedIds.has(existing.googleEventId)) {
        await ctx.db.delete(existing._id);
      }
    }
  },
});

// Query to list all events for the current user
export const listEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const limit = args.limit || 100;

    const events = await ctx.db
      .query('events')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .order('asc')
      .take(limit);

    // Get calendar info for each event
    const eventsWithCalendars = await Promise.all(
      events.map(async (event) => {
        const calendar = await ctx.db.get(event.calendarId);
        return {
          ...event,
          calendarName: calendar?.calendarName || 'Unknown',
          calendarEmail: calendar?.email || 'Unknown',
        };
      }),
    );

    return eventsWithCalendars.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  },
});

// Query to get upcoming events (including currently happening events) for today
export const getUpcomingEvents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all events for the user
    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect();

    // Filter events that are upcoming or currently happening (for today)
    const upcomingEvents = allEvents.filter((event) => {
      const eventStart = new Date(event.startTime);
      const eventEnd = event.endTime ? new Date(event.endTime) : null;

      // Event must be today
      const isToday = eventStart >= today && eventStart < tomorrow;

      // Event is upcoming (hasn't started yet) or currently happening (started but not ended)
      const isUpcomingOrCurrent = eventStart >= now || (eventStart < now && eventEnd && eventEnd > now);

      return isToday && isUpcomingOrCurrent;
    });

    // Get calendar info for each event
    const eventsWithCalendars = await Promise.all(
      upcomingEvents.map(async (event) => {
        const calendar = await ctx.db.get(event.calendarId);
        return {
          ...event,
          calendarName: calendar?.calendarName || 'Unknown',
          calendarEmail: calendar?.email || 'Unknown',
        };
      }),
    );

    return eventsWithCalendars.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  },
});

// Query to get past events for today
export const getPastEvents = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all events for the user
    const allEvents = await ctx.db
      .query('events')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect();

    // Filter past events that occurred today
    const pastEvents = allEvents.filter((event) => {
      const eventStart = new Date(event.startTime);
      const eventEnd = event.endTime ? new Date(event.endTime) : null;

      // Event must be today
      const isToday = eventStart >= today && eventStart < tomorrow;

      // Event has ended (end time is in the past, or if no end time, start time is in the past)
      const hasEnded = eventEnd ? eventEnd < now : eventStart < now;

      return isToday && hasEnded;
    });

    // Get calendar info for each event
    const eventsWithCalendars = await Promise.all(
      pastEvents.map(async (event) => {
        const calendar = await ctx.db.get(event.calendarId);
        return {
          ...event,
          calendarName: calendar?.calendarName || 'Unknown',
          calendarEmail: calendar?.email || 'Unknown',
        };
      }),
    );

    // Sort by most recent first
    return eventsWithCalendars.sort((a, b) => {
      const aEnd = a.endTime ? new Date(a.endTime).getTime() : new Date(a.startTime).getTime();
      const bEnd = b.endTime ? new Date(b.endTime).getTime() : new Date(b.startTime).getTime();
      return bEnd - aEnd;
    });
  },
});

// Internal query to get event by ID
export const getEventById = internalQuery({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});

// Public query to get event by ID
export const getEventByIdPublic = query({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const event = await ctx.db.get(args.eventId);
    if (!event || event.userId !== identity.subject) {
      return null;
    }

    return event;
  },
});

// Internal query to get events that need bots
export const getEventsNeedingBots = internalQuery({
  args: {
    currentTime: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date(args.currentTime);

    // Get all events with notetaker requested
    const allEvents = await ctx.db.query('events').collect();

    return allEvents.filter((event) => {
      const eventStart = new Date(event.startTime);
      return eventStart > now && event.notetakerRequested === true;
    });
  },
});

// Internal query to get ended events with Meeting BaaS bots that need transcription
export const getEndedEventsWithMeetingBaasBots = internalQuery({
  args: {
    currentTime: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date(args.currentTime);

    // Get all events with Meeting BaaS bots
    const allEvents = await ctx.db.query('events').collect();

    return allEvents.filter((event) => {
      const eventEnd = new Date(event.endTime);
      // Event has ended, has Meeting BaaS bot, but no transcription yet
      return eventEnd <= now && event.meetingBaasBotId !== undefined && event.meetingBaasTranscription === undefined;
    });
  },
});

// Mutation to refresh events for a specific calendar
export const refreshCalendarEvents = mutation({
  args: {
    calendarId: v.id('calendars'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const calendar = await ctx.db.get(args.calendarId);
    if (!calendar) {
      throw new Error('Calendar not found');
    }

    if (calendar.userId !== identity.subject) {
      throw new Error('Not authorized to refresh this calendar');
    }

    // Trigger the sync action
    await ctx.scheduler.runAfter(0, internal.events.syncCalendarEvents, {
      calendarId: args.calendarId,
    });

    return { success: true };
  },
});

// Mutation to toggle notetaker request for an event
export const toggleNotetakerRequest = mutation({
  args: {
    eventId: v.id('events'),
    notetakerRequested: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    if (event.userId !== identity.subject) {
      throw new Error('Not authorized to modify this event');
    }

    await ctx.db.patch(args.eventId, {
      notetakerRequested: args.notetakerRequested,
    });

    return { success: true };
  },
});
