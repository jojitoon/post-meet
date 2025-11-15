import { v } from 'convex/values';
import { query } from './_generated/server';

// Public query to get follow-up email for an event
export const getFollowUpEmail = query({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Verify event belongs to user
    const event = await ctx.db.get(args.eventId);
    if (!event || event.userId !== identity.subject) {
      return null;
    }

    return await ctx.db
      .query('followUpEmails')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .first();
  },
});

// Public query to get generated posts for an event
export const getGeneratedPosts = query({
  args: {
    eventId: v.id('events'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify event belongs to user
    const event = await ctx.db.get(args.eventId);
    if (!event || event.userId !== identity.subject) {
      return [];
    }

    const posts = await ctx.db
      .query('generatedPosts')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .collect();

    // Get automation details for each post
    return await Promise.all(
      posts.map(async (post) => {
        const automation = await ctx.db.get(post.automationId);
        return {
          ...post,
          automationName: automation?.name || 'Unknown',
        };
      }),
    );
  },
});

