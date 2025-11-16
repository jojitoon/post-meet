/**
 * Test helpers for Convex functions
 * 
 * Since Convex functions are wrapped, we need to extract and test the handler logic.
 * This file provides utilities to test Convex function handlers.
 */

import { GenericQueryCtx, GenericMutationCtx, GenericActionCtx } from 'convex/server';
import type { DataModel } from '@/convex/_generated/dataModel';

export type MockQueryCtx = Partial<GenericQueryCtx<DataModel>>;
export type MockMutationCtx = Partial<GenericMutationCtx<DataModel>>;
export type MockActionCtx = Partial<GenericActionCtx<DataModel>>;

/**
 * Create a mock query context for testing
 */
export function createMockQueryCtx(overrides?: MockQueryCtx): MockQueryCtx {
  return {
    auth: {
      getUserIdentity: async () => null,
    },
    db: {
      query: () => ({
        withIndex: () => ({
          first: async () => null,
          collect: async () => [],
        }),
        first: async () => null,
        collect: async () => [],
      }),
      get: async () => null,
    },
    ...overrides,
  } as MockQueryCtx;
}

/**
 * Create a mock mutation context for testing
 */
export function createMockMutationCtx(overrides?: MockMutationCtx): MockMutationCtx {
  return {
    auth: {
      getUserIdentity: async () => null,
    },
    db: {
      query: () => ({
        withIndex: () => ({
          first: async () => null,
          collect: async () => [],
        }),
        first: async () => null,
        collect: async () => [],
      }),
      get: async () => null,
      insert: async () => 'mock_id' as any,
      patch: async () => {},
      delete: async () => {},
    },
    ...overrides,
  } as MockMutationCtx;
}

/**
 * Create a mock action context for testing
 */
export function createMockActionCtx(overrides?: MockActionCtx): MockActionCtx {
  return {
    auth: {
      getUserIdentity: async () => null,
    },
    runQuery: async () => null,
    runMutation: async () => null,
    ...overrides,
  } as MockActionCtx;
}

