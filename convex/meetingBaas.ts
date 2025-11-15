'use node';

import { v } from 'convex/values';
import { internalAction, action } from './_generated/server';
import { internal } from './_generated/api';
import { createBaasClient } from '@meeting-baas/sdk';

const MBAAS_API_KEY = process.env.MBAAS;

// Helper function to create Meeting BaaS client
function createClient() {
  if (!MBAAS_API_KEY) {
    throw new Error('MBAAS API key is not set');
  }
  return createBaasClient({
    api_key: MBAAS_API_KEY,
    timeout: 60000,
  });
}

// Helper function to join a meeting with Meeting BaaS
async function joinMeetingHelper(meetingUrl: string, botName?: string) {
  console.log('joinMeetingHelper', meetingUrl, botName);
  const client = createClient();

  const joinResult = await client.joinMeeting({
    meeting_url: meetingUrl,
    bot_name: botName || 'Notetaker Bot',
    speech_to_text: 'Gladia',
    // reserved: false,
    // recording_mode: 'speaker_view',
    // speech_to_text: { provider: 'Gladia' },
  });
  if (!joinResult.success) {
    throw new Error(`Meeting BaaS join failed: ${joinResult.error || 'Unknown error'}`);
  }

  return joinResult.data;
}

// Helper function to get meeting data with transcripts
async function getMeetingDataHelper(botId: string) {
  const client = createClient();

  const meetingDataResult = await client.getMeetingData({
    bot_id: botId,
    include_transcripts: true,
  });

  if (!meetingDataResult.success) {
    throw new Error(`Meeting BaaS get data failed: ${meetingDataResult.error || 'Unknown error'}`);
  }

  return meetingDataResult.data;
}

// Helper function to leave a meeting
async function leaveMeetingHelper(botId: string) {
  const client = createClient();

  const leaveResult = await client.leaveMeeting({
    uuid: botId,
  });

  if (!leaveResult.success) {
    throw new Error(`Meeting BaaS leave failed: ${leaveResult.error || 'Unknown error'}`);
  }

  return leaveResult;
}

// Helper function to delete bot data
async function deleteBotDataHelper(botId: string) {
  const client = createClient();

  const deleteResult = await client.deleteBotData({
    uuid: botId,
  });

  if (!deleteResult.success) {
    throw new Error(`Meeting BaaS delete failed: ${deleteResult.error || 'Unknown error'}`);
  }

  return deleteResult;
}

// Send bot to meeting (called by cron or manually)
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

    if (event.meetingBaasBotId) {
      // Bot already created, check status
      try {
        const meetingData = await getMeetingDataHelper(event.meetingBaasBotId);
        // Update event with current status
        await ctx.runMutation(internal.eventsQueries.updateMeetingBaasBotInfo, {
          eventId: args.eventId,
          botId: event.meetingBaasBotId,
          botStatus: 'in_meeting',
        });
        return meetingData;
      } catch (error) {
        console.error('Failed to get Meeting BaaS bot status:', error);
        throw error;
      }
    }

    // Create new bot
    try {
      const botData = await joinMeetingHelper(event.meetingLink, `Notetaker for ${event.title}`);
      await ctx.runMutation(internal.eventsQueries.updateMeetingBaasBotInfo, {
        eventId: args.eventId,
        botId: botData.bot_id,
        botStatus: 'in_meeting', // Set status to in_meeting when bot is sent
      });
      return botData;
    } catch (error) {
      console.error('Failed to create Meeting BaaS bot:', error);
      throw error;
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
    await ctx.scheduler.runAfter(0, internal.meetingBaas.sendBotToMeeting, {
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
        // Only process events that use Meeting BaaS (or don't have a provider set yet)
        if (event.botProvider && event.botProvider !== 'meeting_baas') {
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
          // Check if bot hasn't been sent yet (don't send another bot if one already exists)
          if (!event.meetingBaasBotId) {
            await ctx.runAction(internal.meetingBaas.sendBotToMeeting, {
              eventId: event._id,
            });
          }
        }
      } catch (error) {
        console.error(`Failed to process Meeting BaaS bot for event ${event._id}:`, error);
      }
    }
  },
});

// Poll for ended meetings and fetch transcripts (called by cron every 5 minutes)
export const pollEndedMeetingsForTranscripts = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = new Date();

    // Get all events with bots in meeting status (active events that need transcription)
    const events = await ctx.runQuery(internal.eventsQueries.getEndedEventsWithMeetingBaasBots, {
      currentTime: now.toISOString(),
    });

    console.log('events', events?.length);

    for (const event of events) {
      try {
        if (!event.meetingBaasBotId) {
          continue;
        }

        console.log(`Fetching transcript for Meeting BaaS bot ${event.meetingBaasBotId} for event ${event.title}`);

        // Get meeting data with transcripts
        const meetingData = await getMeetingDataHelper(event.meetingBaasBotId);

        // console.log('meetingData', JSON.stringify(meetingData, null, 2));

        // Extract transcription data (handle different possible response structures)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const meetingDataAny = meetingData as any;
        const transcription =
          meetingDataAny?.bot_data?.transcripts?.length > 0
            ? JSON.stringify(meetingDataAny?.bot_data?.transcripts)
            : null;

        // Update event with transcription if available (save as it comes, even if meeting is still active)
        if (transcription && !event.meetingBaasTranscription) {
          await ctx.runMutation(internal.eventsQueries.updateMeetingBaasTranscription, {
            eventId: event._id,
            transcription: transcription,
          });
        }

        // Check if meeting has ended (duration is available or status indicates ended)
        const meetingEnded =
          meetingDataAny.bot_data?.bot?.ended_at !== null && meetingDataAny.bot_data?.bot?.ended_at !== undefined;

        if (meetingEnded && event.meetingBaasBotId) {
          // Schedule leaving the meeting and deleting bot data
          // Leave immediately
          //   try {
          //     await leaveMeetingHelper(event.meetingBaasBotId);
          //     console.log(`Left Meeting BaaS bot ${event.meetingBaasBotId} from meeting`);
          //   } catch (error) {
          //     console.error(`Failed to leave Meeting BaaS bot ${event.meetingBaasBotId}:`, error);
          //   }

          // Only schedule deletion if transcription exists
          // Check if transcription was saved (either from this poll or already exists)
          const updatedEvent = await ctx.runQuery(internal.eventsQueries.getEventById, {
            eventId: event._id,
          });

          if (updatedEvent?.meetingBaasTranscription) {
            // Schedule deletion after 5 minutes to ensure transcription is saved
            await ctx.scheduler.runAfter(5 * 60 * 1000, internal.meetingBaas.deleteBotData, {
              eventId: event._id,
              botId: event.meetingBaasBotId,
            });
          } else {
            console.log(`Skipping bot deletion for event ${event._id} - no transcription available yet`);
          }
        }
      } catch (error) {
        console.error(`Failed to process transcript for event ${event._id}:`, error);
      }
    }
  },
});

// Internal action to delete bot data (called by scheduler)
export const deleteBotData = internalAction({
  args: {
    eventId: v.id('events'),
    botId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Check if event has transcription before deleting
      const event = await ctx.runQuery(internal.eventsQueries.getEventById, {
        eventId: args.eventId,
      });

      if (!event) {
        console.log(`Event ${args.eventId} not found, skipping bot deletion`);
        return;
      }

      if (!event.meetingBaasTranscription) {
        console.log(`Skipping bot deletion for event ${args.eventId} - no transcription available`);
        return;
      }

      await deleteBotDataHelper(args.botId);
      console.log(`Deleted Meeting BaaS bot data for ${args.botId}`);
    } catch (error) {
      console.error(`Failed to delete Meeting BaaS bot data ${args.botId}:`, error);
    }
  },
});

// Internal action to recall bot and get transcription
export const recallBotAndGetTranscript = internalAction({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const event = await ctx.runQuery(internal.eventsQueries.getEventById, {
      eventId: args.eventId,
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (!event.meetingBaasBotId) {
      throw new Error('No bot found for this event');
    }

    try {
      // Get meeting data with transcripts
      const meetingData = await getMeetingDataHelper(event.meetingBaasBotId);

      // Extract transcription data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meetingDataAny = meetingData as any;
      const transcription = meetingDataAny.transcripts
        ? JSON.stringify(meetingDataAny.transcripts)
        : meetingDataAny.transcript || meetingDataAny.transcription || null;

      // Update event with transcription
      if (transcription) {
        await ctx.runMutation(internal.eventsQueries.updateMeetingBaasTranscription, {
          eventId: args.eventId,
          transcription: transcription,
        });
      }

      return { success: true, transcription };
    } catch (error) {
      console.error('Failed to recall bot and get transcript:', error);
      throw error;
    }
  },
});
