import { v } from 'convex/values';
import { query, mutation, internalQuery } from './_generated/server';

// Query to get social media connections for the current user
export const getSocialMediaConnections = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query('socialMediaConnections')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect();
  },
});

// Mutation to save social media connection
export const saveSocialMediaConnection = mutation({
  args: {
    platform: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    profileId: v.optional(v.string()),
    profileName: v.optional(v.string()),
    // Facebook-specific fields for Pages
    pageId: v.optional(v.string()),
    pageAccessToken: v.optional(v.string()),
    pageName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Check if connection already exists
    const existing = await ctx.db
      .query('socialMediaConnections')
      .withIndex('by_user_and_platform', (q) =>
        q.eq('userId', identity.subject).eq('platform', args.platform),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        profileId: args.profileId,
        profileName: args.profileName,
        pageId: args.pageId,
        pageAccessToken: args.pageAccessToken,
        pageName: args.pageName,
      });
      return existing._id;
    } else {
      return await ctx.db.insert('socialMediaConnections', {
        userId: identity.subject,
        platform: args.platform,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        profileId: args.profileId,
        profileName: args.profileName,
        pageId: args.pageId,
        pageAccessToken: args.pageAccessToken,
        pageName: args.pageName,
      });
    }
  },
});

// Mutation to remove social media connection
export const removeSocialMediaConnection = mutation({
  args: {
    connectionId: v.id('socialMediaConnections'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const connection = await ctx.db.get(args.connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    if (connection.userId !== identity.subject) {
      throw new Error('Not authorized');
    }

    await ctx.db.delete(args.connectionId);
    return { success: true };
  },
});

// Internal query to get connection by platform (for use in actions)
export const getConnectionByPlatform = internalQuery({
  args: {
    userId: v.string(),
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('socialMediaConnections')
      .withIndex('by_user_and_platform', (q) =>
        q.eq('userId', args.userId).eq('platform', args.platform),
      )
      .first();
  },
});

