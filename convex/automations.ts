import { v } from 'convex/values';
import { query, mutation, internalQuery } from './_generated/server';

// Query to get automations for the current user
export const getAutomations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query('automations')
      .withIndex('by_user', (q) => q.eq('userId', identity.subject))
      .collect();
  },
});

// Mutation to create an automation
export const createAutomation = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    platform: v.string(),
    description: v.string(),
    example: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    return await ctx.db.insert('automations', {
      userId: identity.subject,
      name: args.name,
      type: args.type,
      platform: args.platform,
      description: args.description,
      example: args.example,
      isActive: args.isActive,
    });
  },
});

// Mutation to update an automation
export const updateAutomation = mutation({
  args: {
    automationId: v.id('automations'),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    platform: v.optional(v.string()),
    description: v.optional(v.string()),
    example: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const automation = await ctx.db.get(args.automationId);
    if (!automation) {
      throw new Error('Automation not found');
    }

    if (automation.userId !== identity.subject) {
      throw new Error('Not authorized');
    }

    const update: {
      name?: string;
      type?: string;
      platform?: string;
      description?: string;
      example?: string;
      isActive?: boolean;
    } = {};

    if (args.name !== undefined) update.name = args.name;
    if (args.type !== undefined) update.type = args.type;
    if (args.platform !== undefined) update.platform = args.platform;
    if (args.description !== undefined) update.description = args.description;
    if (args.example !== undefined) update.example = args.example;
    if (args.isActive !== undefined) update.isActive = args.isActive;

    await ctx.db.patch(args.automationId, update);
    return { success: true };
  },
});

// Mutation to delete an automation
export const deleteAutomation = mutation({
  args: {
    automationId: v.id('automations'),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const automation = await ctx.db.get(args.automationId);
    if (!automation) {
      throw new Error('Automation not found');
    }

    if (automation.userId !== identity.subject) {
      throw new Error('Not authorized');
    }

    await ctx.db.delete(args.automationId);
    return { success: true };
  },
});

// Internal query to get automation by ID (for use in actions)
export const getAutomationById = internalQuery({
  args: {
    automationId: v.id('automations'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.automationId);
  },
});

// Internal query to get automations by user (for use in actions)
export const getAutomationsByUser = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('automations')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
  },
});

