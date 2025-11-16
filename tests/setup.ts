import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.NEXT_PUBLIC_CONVEX_URL = 'https://test.convex.cloud';
process.env.NEXT_PUBLIC_CONVEX_SITE_URL = 'https://test.convex.site';
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';

// Mock WorkOS AuthKit
vi.mock('@workos-inc/authkit-nextjs', () => ({
  authkit: vi.fn(() => ({
    session: {
      user: {
        id: 'user_test123',
        email: 'test@example.com',
      },
    },
  })),
  withAuth: vi.fn(() => ({
    accessToken: 'mock_workos_token',
  })),
}));

// Mock Convex
vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => null),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
  Authenticated: ({ children }: { children: React.ReactNode }) => children,
  Unauthenticated: ({ children }: { children: React.ReactNode }) => children,
}));

