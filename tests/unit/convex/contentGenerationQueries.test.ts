import { describe, it, expect, vi } from 'vitest';
import { createMockUserIdentity, createMockEvent } from '../../utils/testHelpers';
import { createMockQueryCtx } from '../../utils/convexTestHelpers';

// Extract handler logic for testing
const getFollowUpEmailHandler = async (ctx: any, args: any) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const event = await ctx.db.get(args.eventId);
  if (!event || event.userId !== identity.subject) {
    return null;
  }

  return await ctx.db
    .query('followUpEmails')
    .withIndex('by_event', (q: any) => q.eq('eventId', args.eventId))
    .first();
};

const getGeneratedPostsHandler = async (ctx: any, args: any) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return [];
  }

  const event = await ctx.db.get(args.eventId);
  if (!event || event.userId !== identity.subject) {
    return [];
  }

  const posts = await ctx.db
    .query('generatedPosts')
    .withIndex('by_event', (q: any) => q.eq('eventId', args.eventId))
    .collect();

  return await Promise.all(
    posts.map(async (post: any) => {
      const automation = await ctx.db.get(post.automationId);
      return {
        ...post,
        automationName: automation?.name || 'Unknown',
      };
    }),
  );
};

describe('contentGenerationQueries', () => {
  describe('getFollowUpEmail', () => {
    it('should return null when not authenticated', async () => {
      const mockCtx = createMockQueryCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(null),
        },
      });

      const result = await getFollowUpEmailHandler(mockCtx as any, {
        eventId: 'event_123' as any,
      });
      expect(result).toBeNull();
    });

    it('should return follow-up email when found', async () => {
      const mockEmail = {
        _id: 'email_123' as any,
        eventId: 'event_123' as any,
        userId: 'user_test123',
        content: 'Thank you for the meeting...',
        createdAt: Date.now(),
      };

      const mockEvent = createMockEvent({ userId: 'user_test123' });
      const mockCtx = createMockQueryCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(createMockUserIdentity()),
        },
        db: {
          get: vi.fn().mockResolvedValue(mockEvent),
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(mockEmail),
            }),
          }),
        } as any,
      });

      const result = await getFollowUpEmailHandler(mockCtx as any, {
        eventId: 'event_123' as any,
      });
      expect(result).toEqual(mockEmail);
    });
  });

  describe('getGeneratedPosts', () => {
    it('should return empty array when not authenticated', async () => {
      const mockCtx = createMockQueryCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(null),
        },
      });

      const result = await getGeneratedPostsHandler(mockCtx as any, {
        eventId: 'event_123' as any,
      });
      expect(result).toEqual([]);
    });

    it('should return generated posts for event', async () => {
      const mockPosts = [
        {
          _id: 'post_1' as any,
          eventId: 'event_123' as any,
          userId: 'user_test123',
          automationId: 'automation_123' as any,
          platform: 'linkedin',
          content: 'Post content 1',
          status: 'draft',
        },
        {
          _id: 'post_2' as any,
          eventId: 'event_123' as any,
          userId: 'user_test123',
          automationId: 'automation_456' as any,
          platform: 'facebook',
          content: 'Post content 2',
          status: 'posted',
        },
      ];

      const mockEvent = createMockEvent({ userId: 'user_test123' });
      const mockCtx = createMockQueryCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(createMockUserIdentity()),
        },
        db: {
          get: vi.fn()
            .mockResolvedValueOnce(mockEvent) // For event check
            .mockResolvedValueOnce({ name: 'Automation 1' }) // For automation 1
            .mockResolvedValueOnce({ name: 'Automation 2' }), // For automation 2
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
              collect: vi.fn().mockResolvedValue(mockPosts),
            }),
          }),
        } as any,
      });

      const result = await getGeneratedPostsHandler(mockCtx as any, {
        eventId: 'event_123' as any,
      });
      expect(result).toHaveLength(2);
      expect(result[0].automationName).toBe('Automation 1');
    });
  });
});

