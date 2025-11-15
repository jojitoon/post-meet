'use node';

import { v } from 'convex/values';
import { internalAction, action } from './_generated/server';
import { internal } from './_generated/api';

const RECALL_API_REGION = process.env.RECALL_API_REGION || 'us-west-2';
const RECALL_API_KEY = process.env.RECALL_API_KEY;

// Helper function to create a bot (can be called from actions)
async function createBotHelper(
  meetingUrl: string,
  botName?: string,
  transcriptionMode: 'prioritize_accuracy' | 'prioritize_low_latency' = 'prioritize_accuracy',
) {
  if (!RECALL_API_KEY) {
    throw new Error('RECALL_API_KEY is not set');
  }

  const response = await fetch(`https://${RECALL_API_REGION}.recall.ai/api/v1/bot`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${RECALL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      meeting_url: meetingUrl,
      bot_name: botName || 'Notetaker Bot',
      recording_config: {
        transcript: {
          provider: {
            recallai_streaming: {
              mode: transcriptionMode,
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Recall.ai API error: ${response.status} ${errorText}`);
  }

  return await response.json();
}

// Helper function to get bot status (can be called from actions)
async function getBotStatusHelper(botId: string) {
  if (!RECALL_API_KEY) {
    throw new Error('RECALL_API_KEY is not set');
  }

  const response = await fetch(`https://${RECALL_API_REGION}.recall.ai/api/v1/bot/${botId}`, {
    method: 'GET',
    headers: {
      Authorization: `Token ${RECALL_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Recall.ai API error: ${response.status}`);
  }

  return await response.json();
}

// Create a bot for a meeting
export const createBot = internalAction({
  args: {
    eventId: v.id('events'),
    meetingUrl: v.string(),
    botName: v.optional(v.string()),
    transcriptionMode: v.optional(v.union(v.literal('prioritize_accuracy'), v.literal('prioritize_low_latency'))),
  },
  handler: async (ctx, args) => {
    try {
      const botData = await createBotHelper(
        args.meetingUrl,
        args.botName,
        args.transcriptionMode || 'prioritize_accuracy',
      );

      // Update event with bot ID
      await ctx.runMutation(internal.eventsQueries.updateEventBotInfo, {
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

// Get bot status
export const getBotStatus = internalAction({
  args: {
    botId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      return await getBotStatusHelper(args.botId);
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
    const event = await ctx.runQuery(internal.eventsQueries.getEventById, {
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
      const botStatus = await getBotStatusHelper(event.botId);
      await ctx.runMutation(internal.eventsQueries.updateEventBotInfo, {
        eventId: args.eventId,
        botId: event.botId,
        botStatus: botStatus.status,
      });
      return botStatus;
    }

    // Create new bot with transcription enabled (default to prioritize_accuracy for best quality)
    const botData = await createBotHelper(event.meetingLink, `Notetaker for ${event.title}`, 'prioritize_accuracy');
    await ctx.runMutation(internal.eventsQueries.updateEventBotInfo, {
      eventId: args.eventId,
      botId: botData.id,
      botStatus: botData.status || 'pending',
    });
    return botData;
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
    await ctx.scheduler.runAfter(0, internal.recall.sendBotToMeeting, {
      eventId: args.eventId,
    });

    return { success: true };
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
        // Only process events that use Recall.ai (or don't have a provider set yet)
        if (event.botProvider && event.botProvider !== 'recall') {
          continue;
        }

        // Get user settings for bot join time
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const settings = await ctx.runQuery((internal as any).userSettings.getUserSettingsForBot, {
          userId: event.userId,
        });

        const botJoinMinutesBefore = settings?.botJoinMinutesBefore || 5;
        const eventStart = new Date(event.startTime);
        const joinTime = new Date(eventStart.getTime() - botJoinMinutesBefore * 60 * 1000);

        // Check if it's time to send the bot
        if (now >= joinTime && now < eventStart) {
          // Check if bot hasn't been sent yet
          if (!event.botId) {
            await ctx.runAction(internal.recall.sendBotToMeeting, {
              eventId: event._id,
            });
          }
        }
      } catch (error) {
        console.error(`Failed to process Recall.ai bot for event ${event._id}:`, error);
      }
    }
  },
});
