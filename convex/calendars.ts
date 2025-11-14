import { v } from 'convex/values';
import { query, mutation } from './_generated/server';

// Query to list all calendars for the current user
export const listCalendars = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const calendars = await ctx.db
      .query('calendars')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect();

    // Don't return sensitive tokens
    return calendars.map((cal) => ({
      _id: cal._id,
      email: cal.email,
      calendarId: cal.calendarId,
      calendarName: cal.calendarName,
      isPrimary: cal.isPrimary,
    }));
  },
});

// Mutation to add a calendar
export const addCalendar = mutation({
  args: {
    email: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    calendarId: v.string(),
    calendarName: v.string(),
    isPrimary: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // If this is marked as primary, unmark all other calendars as primary
    if (args.isPrimary) {
      const existingCalendars = await ctx.db
        .query('calendars')
        .withIndex('by_user', (q) => q.eq('userId', identity.subject))
        .collect();

      for (const cal of existingCalendars) {
        if (cal.isPrimary) {
          await ctx.db.patch(cal._id, { isPrimary: false });
        }
      }
    }

    const id = await ctx.db.insert('calendars', {
      userId: identity.subject,
      email: args.email,
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      calendarId: args.calendarId,
      calendarName: args.calendarName,
      isPrimary: args.isPrimary,
    });

    return id;
  },
});

// Mutation to remove a calendar
export const removeCalendar = mutation({
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
      throw new Error('Not authorized to delete this calendar');
    }

    await ctx.db.delete(args.calendarId);
  },
});

// Query to get calendar tokens (for internal use)
export const getCalendarTokens = query({
  args: {
    calendarId: v.id('calendars'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const calendar = await ctx.db.get(args.calendarId);
    if (!calendar || calendar.userId !== identity.subject) {
      throw new Error('Calendar not found or not authorized');
    }

    return {
      accessToken: calendar.accessToken,
      refreshToken: calendar.refreshToken,
    };
  },
});

