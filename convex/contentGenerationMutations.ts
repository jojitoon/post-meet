import { v } from 'convex/values';
import { internalMutation } from './_generated/server';

// Internal mutation to save follow-up email
export const saveFollowUpEmail = internalMutation({
  args: {
    eventId: v.id('events'),
    userId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existing = await ctx.db
      .query('followUpEmails')
      .withIndex('by_event', (q) => q.eq('eventId', args.eventId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        createdAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert('followUpEmails', {
        eventId: args.eventId,
        userId: args.userId,
        content: args.content,
        createdAt: Date.now(),
      });
    }
  },
});

// Internal mutation to save generated post
export const saveGeneratedPost = internalMutation({
  args: {
    eventId: v.id('events'),
    userId: v.string(),
    automationId: v.optional(v.id('automations')),
    platform: v.string(),
    content: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('generatedPosts', {
      eventId: args.eventId,
      userId: args.userId,
      automationId: args.automationId,
      platform: args.platform,
      content: args.content,
      status: args.status,
    });
  },
});

