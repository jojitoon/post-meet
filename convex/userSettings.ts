import { v } from 'convex/values';
import { query, mutation, internalQuery } from './_generated/server';

// Query to get user settings
export const getUserSettings = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { botJoinMinutesBefore: 5 }; // Return default when not authenticated
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

// Internal query to get user settings for bot (used by cron)
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

