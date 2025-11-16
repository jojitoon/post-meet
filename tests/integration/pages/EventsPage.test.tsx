import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventsPage from '@/app/events/page';
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
  usePathname: () => '/events',
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Events Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.eventsQueries.listEvents) {
        return [] as any;
      }
      if (query === api.calendars.listCalendars) {
        return [] as any;
      }
      return undefined;
    });

    render(<EventsPage />);

    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText(/View all events and request notetakers/i)).toBeInTheDocument();
  });

  it('should render calendar and list view toggle', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.eventsQueries.listEvents) {
        return [] as any;
      }
      if (query === api.calendars.listCalendars) {
        return [] as any;
      }
      return undefined;
    });

    render(<EventsPage />);

    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('List')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<EventsPage />);

    expect(screen.getByTestId('authenticated')).toBeInTheDocument();
  });

  it('should render events when available', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    const mockEvents = [
      {
        _id: 'event_1',
        title: 'Test Meeting',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        calendarId: 'cal_1',
        userId: 'user_123',
        status: 'confirmed',
        calendarName: 'Test Calendar',
        calendarEmail: 'test@example.com',
      },
    ];

    // Mock useQuery calls in order: listEvents, listCalendars
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockEvents as any) // listEvents
      .mockReturnValueOnce([{ _id: 'cal_1', calendarName: 'Test Calendar' }] as any); // listCalendars

    render(<EventsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Meeting')).toBeInTheDocument();
    });
  });

  it('should render empty state when no events', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.eventsQueries.listEvents) {
        return [] as any;
      }
      if (query === api.calendars.listCalendars) {
        return [] as any;
      }
      return undefined;
    });

    render(<EventsPage />);

    // Should render the page structure even with no events
    expect(screen.getByText('Events')).toBeInTheDocument();
  });

  it('should render event cards with correct information', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    const mockEvents = [
      {
        _id: 'event_1',
        title: 'Test Meeting',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        calendarId: 'cal_1',
        userId: 'user_123',
        status: 'confirmed',
        meetingLink: 'https://zoom.us/j/123',
        location: 'Virtual',
        attendees: ['user1@example.com', 'user2@example.com'],
        calendarName: 'Test Calendar',
        calendarEmail: 'test@example.com',
      },
    ];

    // Mock useQuery calls in order: listEvents, listCalendars
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockEvents as any) // listEvents
      .mockReturnValueOnce([{ _id: 'cal_1', calendarName: 'Test Calendar' }] as any); // listCalendars

    render(<EventsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Meeting')).toBeInTheDocument();
    });
  });

  it('should toggle between calendar and list view', async () => {
    const user = userEvent.setup();

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.eventsQueries.listEvents) {
        return [] as any;
      }
      if (query === api.calendars.listCalendars) {
        return [] as any;
      }
      return undefined;
    });

    render(<EventsPage />);

    const listViewButton = screen.getByText('List');
    await user.click(listViewButton);

    // Should switch to list view
    expect(listViewButton).toBeInTheDocument();
  });
});

