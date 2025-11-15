import { v } from 'convex/values';
import { internalQuery, internalMutation } from './_generated/server';

// Internal query to get post by ID (for use in actions)
export const getPostById = internalQuery({
  args: {
    postId: v.id('generatedPosts'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.postId);
  },
});

// Internal mutation to update post status (for use in actions)
export const updatePostStatus = internalMutation({
  args: {
    postId: v.id('generatedPosts'),
    status: v.string(),
    postedAt: v.optional(v.number()),
    platformPostId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const update: {
      status: string;
      postedAt?: number;
      platformPostId?: string;
    } = {
      status: args.status,
    };

    if (args.postedAt !== undefined) {
      update.postedAt = args.postedAt;
    }

    if (args.platformPostId !== undefined) {
      update.platformPostId = args.platformPostId;
    }

    await ctx.db.patch(args.postId, update);
    return { success: true };
  },
});

