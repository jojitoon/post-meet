import { describe, it, expect, vi } from 'vitest';
import {
  createMockUserIdentity,
  createMockSocialMediaConnection,
} from '../../utils/testHelpers';
import { createMockQueryCtx, createMockMutationCtx } from '../../utils/convexTestHelpers';

// Extract handler logic for testing
const getSocialMediaConnectionsHandler = async (ctx: any) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return [];
  }
  return await ctx.db
    .query('socialMediaConnections')
    .withIndex('by_user', (q: any) => q.eq('userId', identity.subject))
    .collect();
};

const saveSocialMediaConnectionHandler = async (ctx: any, args: any) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Not authenticated');
  }

  const existing = await ctx.db
    .query('socialMediaConnections')
    .withIndex('by_user_and_platform', (q: any) =>
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
};

const removeSocialMediaConnectionHandler = async (ctx: any, args: any) => {
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
};

describe('socialMedia', () => {
  describe('getSocialMediaConnections', () => {
    it('should return empty array when not authenticated', async () => {
      const mockCtx = createMockQueryCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(null),
        },
      });

      const result = await getSocialMediaConnectionsHandler(mockCtx as any);
      expect(result).toEqual([]);
    });

    it('should return connections for authenticated user', async () => {
      const mockConnections = [
        createMockSocialMediaConnection({ platform: 'linkedin' }),
        createMockSocialMediaConnection({ platform: 'facebook' }),
      ];

      const mockCtx = createMockQueryCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(createMockUserIdentity()),
        },
        db: {
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
              collect: vi.fn().mockResolvedValue(mockConnections),
            }),
          }),
        } as any,
      });

      const result = await getSocialMediaConnectionsHandler(mockCtx as any);
      expect(result).toEqual(mockConnections);
    });
  });

  describe('saveSocialMediaConnection', () => {
    it('should create new connection when none exists', async () => {
      const mockInsert = vi.fn().mockResolvedValue('new_connection_id');
      const mockCtx = createMockMutationCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(createMockUserIdentity()),
        },
        db: {
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
            }),
          }),
          insert: mockInsert,
        } as any,
      });

      const args = {
        platform: 'linkedin',
        accessToken: 'token123',
        refreshToken: 'refresh123',
        expiresAt: Date.now() + 3600000,
        profileId: 'profile123',
        profileName: 'Test User',
      };

      const result = await saveSocialMediaConnectionHandler(mockCtx as any, args);
      expect(result).toBe('new_connection_id');
      expect(mockInsert).toHaveBeenCalledWith('socialMediaConnections', {
        userId: 'user_test123',
        ...args,
      });
    });

    it('should update existing connection', async () => {
      const existingConnection = createMockSocialMediaConnection();
      const mockPatch = vi.fn();
      const mockCtx = createMockMutationCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(createMockUserIdentity()),
        },
        db: {
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(existingConnection),
            }),
          }),
          patch: mockPatch,
        } as any,
      });

      const args = {
        platform: 'linkedin',
        accessToken: 'new_token',
        refreshToken: 'new_refresh',
        expiresAt: Date.now() + 3600000,
        profileId: 'profile123',
        profileName: 'Test User',
        pageId: undefined,
        pageAccessToken: undefined,
        pageName: undefined,
      };

      const result = await saveSocialMediaConnectionHandler(mockCtx as any, args);
      expect(result).toBe(existingConnection._id);
      expect(mockPatch).toHaveBeenCalledWith(existingConnection._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        profileId: args.profileId,
        profileName: args.profileName,
        pageId: args.pageId,
        pageAccessToken: args.pageAccessToken,
        pageName: args.pageName,
      });
    });

    it('should throw error when not authenticated', async () => {
      const mockCtx = createMockMutationCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(null),
        },
      });

      await expect(
        saveSocialMediaConnectionHandler(mockCtx as any, {
          platform: 'linkedin',
          accessToken: 'token',
        } as any),
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('removeSocialMediaConnection', () => {
    it('should delete connection when authorized', async () => {
      const connection = createMockSocialMediaConnection();
      const mockDelete = vi.fn();
      const mockCtx = createMockMutationCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(createMockUserIdentity()),
        },
        db: {
          get: vi.fn().mockResolvedValue(connection),
          delete: mockDelete,
        } as any,
      });

      const result = await removeSocialMediaConnectionHandler(mockCtx as any, {
        connectionId: connection._id,
      });

      expect(result).toEqual({ success: true });
      expect(mockDelete).toHaveBeenCalledWith(connection._id);
    });

    it('should throw error when connection not found', async () => {
      const mockCtx = createMockMutationCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(createMockUserIdentity()),
        },
        db: {
          get: vi.fn().mockResolvedValue(null),
        } as any,
      });

      await expect(
        removeSocialMediaConnectionHandler(mockCtx as any, {
          connectionId: 'connection_123' as any,
        }),
      ).rejects.toThrow('Connection not found');
    });

    it('should throw error when not authorized', async () => {
      const connection = createMockSocialMediaConnection({ userId: 'different_user' });
      const mockCtx = createMockMutationCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(createMockUserIdentity()),
        },
        db: {
          get: vi.fn().mockResolvedValue(connection),
        } as any,
      });

      await expect(
        removeSocialMediaConnectionHandler(mockCtx as any, {
          connectionId: connection._id,
        }),
      ).rejects.toThrow('Not authorized');
    });
  });
});

