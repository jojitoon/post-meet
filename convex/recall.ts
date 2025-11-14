'use node';

import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery, mutation, query } from './_generated/server';
import { internal } from './_generated/api';

const RECALL_API_REGION = process.env.RECALL_API_REGION || 'us-west-2';
const RECALL_API_KEY = process.env.RECALL_API_KEY;

// Create a bot for a meeting
export const createBot = internalAction({
  args: {
    eventId: v.id('events'),
    meetingUrl: v.string(),
    botName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!RECALL_API_KEY) {
      throw new Error('RECALL_API_KEY is not set');
    }

    try {
      const response = await fetch(`https://${RECALL_API_REGION}.recall.ai/api/v1/bot`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${RECALL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meeting_url: args.meetingUrl,
          bot_name: args.botName || 'Notetaker Bot',
          recording_config: {
            transcript: {
              provider: {
                meeting_captions: {},
              },
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Recall.ai API error: ${response.status} ${errorText}`);
      }

      const botData = await response.json();
      
      // Update event with bot ID
      await ctx.runMutation(internal.recall.updateEventBotInfo, {
        eventId: args.eventId,
        botId: botData.id,
        botStatus: botData.status || 'pending',
      });

      return botData;
    } catch (error) {
      console.error('Failed to create Recall.ai bot:', error);
      throw error;
    }
  },
});

// Update event with bot information
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
    });
  },
});

// Get bot status
export const getBotStatus = internalAction({
  args: {
    botId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!RECALL_API_KEY) {
      throw new Error('RECALL_API_KEY is not set');
    }

    try {
      const response = await fetch(`https://${RECALL_API_REGION}.recall.ai/api/v1/bot/${args.botId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${RECALL_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Recall.ai API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get bot status:', error);
      throw error;
    }
  },
});

// Send bot to meeting (called by cron)
export const sendBotToMeeting = internalAction({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    // Get event details
    const event = await ctx.runQuery(internal.recall.getEventForBot, {
      eventId: args.eventId,
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (!event.meetingLink) {
      throw new Error('Event does not have a meeting link');
    }

    if (!event.notetakerRequested) {
      throw new Error('Notetaker not requested for this event');
    }

    if (event.botId) {
      // Bot already created, check status
      const botStatus = await getBotStatus(ctx, { botId: event.botId });
      await ctx.runMutation(internal.recall.updateEventBotInfo, {
        eventId: args.eventId,
        botId: event.botId,
        botStatus: botStatus.status,
      });
      return botStatus;
    }

    // Create new bot
    return await createBot(ctx, {
      eventId: args.eventId,
      meetingUrl: event.meetingLink,
      botName: `Notetaker for ${event.title}`,
    });
  },
});

// Get event for bot (internal action)
export const getEventForBot = internalAction({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(internal.eventsQueries.getEventById, {
      eventId: args.eventId,
    });
  },
});

// Check and send bots for upcoming events (called by cron)
export const checkAndSendBotsForUpcomingEvents = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    
    // Get all events with notetaker requested that haven't started yet
    const events = await ctx.runQuery(internal.eventsQueries.getEventsNeedingBots, {
      currentTime: now.toISOString(),
    });

    for (const event of events) {
      try {
        // Get user settings for bot join time
        const settings = await ctx.runQuery(internal.recall.getUserSettingsForBot, {
          userId: event.userId,
        });

        const botJoinMinutesBefore = settings?.botJoinMinutesBefore || 5;
        const eventStart = new Date(event.startTime);
        const joinTime = new Date(eventStart.getTime() - botJoinMinutesBefore * 60 * 1000);

        // Check if it's time to send the bot
        if (now >= joinTime && now < eventStart) {
          // Check if bot hasn't been sent yet
          if (!event.botId) {
            await sendBotToMeeting(ctx, { eventId: event._id });
          }
        }
      } catch (error) {
        console.error(`Failed to process bot for event ${event._id}:`, error);
      }
    }
  },
});

// Get user settings for bot (internal query)
export const getUserSettingsForBot = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();
  },
});

// Query to get user settings
export const getUserSettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const settings = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .first();

    return settings || { botJoinMinutesBefore: 5 }; // Default 5 minutes
  },
});

// Mutation to update user settings
export const updateUserSettings = mutation({
  args: {
    botJoinMinutesBefore: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const existing = await ctx.db
      .query('userSettings')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        botJoinMinutesBefore: args.botJoinMinutesBefore,
      });
      return existing._id;
    } else {
      return await ctx.db.insert('userSettings', {
        userId: identity.subject,
        botJoinMinutesBefore: args.botJoinMinutesBefore,
      });
    }
  },
});

