import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Home from '@/app/page';
import { useQuery, useMutation, useAction } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { api } from '@/convex/_generated/api';

// Mock Convex hooks
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
  Authenticated: ({ children }: { children: React.ReactNode }) => <div data-testid="authenticated">{children}</div>,
  Unauthenticated: ({ children }: { children: React.ReactNode }) => <div data-testid="unauthenticated">{children}</div>,
}));

// Mock WorkOS AuthKit
vi.mock('@workos-inc/authkit-nextjs/components', () => ({
  useAuth: vi.fn(),
}));

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render unauthenticated state', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      signOut: vi.fn(),
    } as any);

    render(<Home />);

    expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
  });

  it('should render authenticated state with content', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.eventsQueries.getUpcomingEvents) {
        return [] as any;
      }
      if (query === api.eventsQueries.getPastEvents) {
        return [] as any;
      }
      if (query === api.calendars.listCalendars) {
        return [] as any;
      }
      return undefined;
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
    });
  });

  it('should render upcoming events when available', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    const mockUpcomingEvents = [
      {
        _id: 'event_1',
        title: 'Upcoming Meeting',
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 9000000).toISOString(),
      },
    ];

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.eventsQueries.getUpcomingEvents) {
        return mockUpcomingEvents as any;
      }
      if (query === api.eventsQueries.getPastEvents) {
        return [] as any;
      }
      if (query === api.calendars.listCalendars) {
        return [] as any;
      }
      return undefined;
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Upcoming Meeting')).toBeInTheDocument();
    });
  });

  it('should render past events when available', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    const mockPastEvents = [
      {
        _id: 'event_2',
        title: 'Past Meeting',
        startTime: new Date(Date.now() - 86400000).toISOString(),
        endTime: new Date(Date.now() - 82800000).toISOString(),
      },
    ];

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === 'api.eventsQueries.getUpcomingEvents') {
        return [] as any;
      }
      if (query === 'api.eventsQueries.getPastEvents') {
        return mockPastEvents as any;
      }
      if (query === 'api.calendars.listCalendars') {
        return [] as any;
      }
      return null;
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Past Meeting')).toBeInTheDocument();
    });
  });

  it('should render page content correctly', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.eventsQueries.getUpcomingEvents) {
        return [] as any;
      }
      if (query === api.eventsQueries.getPastEvents) {
        return [] as any;
      }
      if (query === api.calendars.listCalendars) {
        return [] as any;
      }
      return undefined;
    });

    render(<Home />);

    // Page should render without errors
    expect(screen.getByTestId('authenticated')).toBeInTheDocument();
  });

  it('should handle loading state', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<Home />);

    expect(screen.getByTestId('authenticated')).toBeInTheDocument();
  });
});

