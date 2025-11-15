'use node';

import { v } from 'convex/values';
import { internalAction, action } from './_generated/server';
import { internal } from './_generated/api';

// Check which bot service to use based on environment variable
function shouldUseRecall(): boolean {
  return process.env.USE_RECALL === 'true';
}

// Unified send bot to meeting (routes to correct service)
export const sendBotToMeeting = internalAction({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    if (shouldUseRecall()) {
      // Use Recall.ai
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await ctx.runAction((internal as any).recall.sendBotToMeeting, {
        eventId: args.eventId,
      });
    } else {
      // Use Meeting BaaS (default)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await ctx.runAction((internal as any).meetingBaas.sendBotToMeeting, {
        eventId: args.eventId,
      });
    }
  },
});

// Public action to manually send bot to meeting (called from UI)
export const sendBotToMeetingManually = action({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get event to verify ownership
    const event = await ctx.runQuery(internal.eventsQueries.getEventById, {
      eventId: args.eventId,
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.userId !== identity.subject) {
      throw new Error('Not authorized to send bot for this event');
    }

    // Trigger the internal action to send the bot
    await ctx.scheduler.runAfter(0, internal.botService.sendBotToMeeting, {
      eventId: args.eventId,
    });

    return { success: true };
  },
});

// Check and send bots for upcoming events (called by cron)
export const checkAndSendBotsForUpcomingEvents = internalAction({
  args: {},
  handler: async (ctx) => {
    if (shouldUseRecall()) {
      // Use Recall.ai
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await ctx.runAction((internal as any).recall.checkAndSendBotsForUpcomingEvents, {});
    } else {
      // Use Meeting BaaS (default)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await ctx.runAction((internal as any).meetingBaas.checkAndSendBotsForUpcomingEvents, {});
    }
  },
});

// Poll for ended meetings and fetch transcripts (called by cron)
export const pollEndedMeetingsForTranscripts = internalAction({
  args: {},
  handler: async (ctx) => {
    if (shouldUseRecall()) {
      // Recall.ai handles transcripts differently (via webhooks/real-time)
      // This might not be needed for Recall.ai, but keeping for consistency
      console.log('Recall.ai uses webhooks for transcripts, skipping polling');
      return;
    } else {
      // Use Meeting BaaS polling
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await ctx.runAction((internal as any).meetingBaas.pollEndedMeetingsForTranscripts, {});
    }
  },
});
