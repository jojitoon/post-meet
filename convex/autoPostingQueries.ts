import { v } from 'convex/values';
import { internalQuery } from './_generated/server';

// Internal query to find events that need auto-processing
export const getEventsNeedingAutoProcessing = internalQuery({
  args: {
    currentTime: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date(args.currentTime);

    // Get all events
    const allEvents = await ctx.db.query('events').collect();

    // Filter events that:
    // 1. Have ended
    // 2. Have transcription
    // 3. Don't have follow-up email yet OR don't have social media posts yet
    const eventsNeedingProcessing = [];

    for (const event of allEvents) {
      const eventEnd = new Date(event.endTime);
      if (eventEnd > now) continue; // Event hasn't ended yet
      if (!event.meetingBaasTranscription) continue; // No transcription

      // Check if follow-up email exists
      const followUpEmail = await ctx.db
        .query('followUpEmails')
        .withIndex('by_event', (q) => q.eq('eventId', event._id))
        .first();

      // Check if social media posts exist
      const existingPosts = await ctx.db
        .query('generatedPosts')
        .withIndex('by_event', (q) => q.eq('eventId', event._id))
        .collect();

      // Check if user has social media connections
      const connections = await ctx.db
        .query('socialMediaConnections')
        .withIndex('by_user', (q) => q.eq('userId', event.userId))
        .collect();

      const hasConnections = connections.length > 0;

      // Need processing if:
      // - No follow-up email exists, OR
      // - No posts exist but user has social media connections
      if (!followUpEmail || (existingPosts.length === 0 && hasConnections)) {
        eventsNeedingProcessing.push({
          event,
          needsFollowUpEmail: !followUpEmail,
          needsSocialMediaPosts: existingPosts.length === 0 && hasConnections,
          connections: connections, // Include all connections, not just autoPost ones
        });
      }
    }

    return eventsNeedingProcessing;
  },
});

