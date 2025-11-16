import { describe, it, expect, vi } from 'vitest';
import { createMockUserIdentity, createMockAutomation } from '../../utils/testHelpers';
import { createMockQueryCtx, createMockMutationCtx } from '../../utils/convexTestHelpers';

// Extract handler logic for testing
const getAutomationsHandler = async (ctx: any) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return [];
  }
  return await ctx.db
    .query('automations')
    .withIndex('by_user', (q: any) => q.eq('userId', identity.subject))
    .collect();
};

const createAutomationHandler = async (ctx: any, args: any) => {
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
};

const updateAutomationHandler = async (ctx: any, args: any) => {
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

  const update: any = {};
  if (args.name !== undefined) update.name = args.name;
  if (args.type !== undefined) update.type = args.type;
  if (args.platform !== undefined) update.platform = args.platform;
  if (args.description !== undefined) update.description = args.description;
  if (args.example !== undefined) update.example = args.example;
  if (args.isActive !== undefined) update.isActive = args.isActive;

  await ctx.db.patch(args.automationId, update);
  return { success: true };
};

const deleteAutomationHandler = async (ctx: any, args: any) => {
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
};

describe('automations', () => {
  describe('getAutomations', () => {
    it('should return empty array when not authenticated', async () => {
      const mockCtx = createMockQueryCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(null),
        },
      });

      const result = await getAutomationsHandler(mockCtx as any);
      expect(result).toEqual([]);
    });

    it('should return automations for authenticated user', async () => {
      const mockAutomations = [
        createMockAutomation({ name: 'Automation 1' }),
        createMockAutomation({ name: 'Automation 2' }),
      ];

      const mockCtx = createMockQueryCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(createMockUserIdentity()),
        },
        db: {
          query: vi.fn().mockReturnValue({
            withIndex: vi.fn().mockReturnValue({
              collect: vi.fn().mockResolvedValue(mockAutomations),
            }),
          }),
        } as any,
      });

      const result = await getAutomationsHandler(mockCtx as any);
      expect(result).toEqual(mockAutomations);
    });
  });

  describe('createAutomation', () => {
    it('should create automation successfully', async () => {
      const mockInsert = vi.fn().mockResolvedValue('automation_123');
      const mockCtx = createMockMutationCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(createMockUserIdentity()),
        },
        db: {
          insert: mockInsert,
        } as any,
      });

      const args = {
        name: 'Test Automation',
        type: 'Generate post',
        platform: 'LinkedIn post',
        description: 'Test description',
        example: 'Example post',
        isActive: true,
      };

      const result = await createAutomationHandler(mockCtx as any, args);
      expect(result).toBe('automation_123');
      expect(mockInsert).toHaveBeenCalledWith('automations', {
        userId: 'user_test123',
        ...args,
      });
    });

    it('should throw error when not authenticated', async () => {
      const mockCtx = createMockMutationCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(null),
        },
      });

      await expect(
        createAutomationHandler(mockCtx as any, {
          name: 'Test',
          type: 'Generate post',
          platform: 'LinkedIn',
          description: 'Test',
          isActive: true,
        }),
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('updateAutomation', () => {
    it('should update automation successfully', async () => {
      const automation = createMockAutomation();
      const mockPatch = vi.fn();
      const mockCtx = createMockMutationCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(createMockUserIdentity()),
        },
        db: {
          get: vi.fn().mockResolvedValue(automation),
          patch: mockPatch,
        } as any,
      });

      const result = await updateAutomationHandler(mockCtx as any, {
        automationId: automation._id,
        name: 'Updated Name',
        isActive: false,
      });

      expect(result).toEqual({ success: true });
      expect(mockPatch).toHaveBeenCalledWith(automation._id, {
        name: 'Updated Name',
        isActive: false,
      });
    });

    it('should throw error when automation not found', async () => {
      const mockCtx = createMockMutationCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(createMockUserIdentity()),
        },
        db: {
          get: vi.fn().mockResolvedValue(null),
        } as any,
      });

      await expect(
        updateAutomationHandler(mockCtx as any, {
          automationId: 'automation_123' as any,
          name: 'Updated',
        }),
      ).rejects.toThrow('Automation not found');
    });

    it('should throw error when not authorized', async () => {
      const automation = createMockAutomation({ userId: 'different_user' });
      const mockCtx = createMockMutationCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(createMockUserIdentity()),
        },
        db: {
          get: vi.fn().mockResolvedValue(automation),
        } as any,
      });

      await expect(
        updateAutomationHandler(mockCtx as any, {
          automationId: automation._id,
          name: 'Updated',
        }),
      ).rejects.toThrow('Not authorized');
    });
  });

  describe('deleteAutomation', () => {
    it('should delete automation successfully', async () => {
      const automation = createMockAutomation();
      const mockDelete = vi.fn();
      const mockCtx = createMockMutationCtx({
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue(createMockUserIdentity()),
        },
        db: {
          get: vi.fn().mockResolvedValue(automation),
          delete: mockDelete,
        } as any,
      });

      const result = await deleteAutomationHandler(mockCtx as any, {
        automationId: automation._id,
      });

      expect(result).toEqual({ success: true });
      expect(mockDelete).toHaveBeenCalledWith(automation._id);
    });
  });
});

