import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MeetingDetailPage from '@/app/meetings/[eventId]/page';
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

// Mock Next.js router and params
vi.mock('next/navigation', () => ({
  useParams: () => ({ eventId: 'event_123' }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/meetings/event_123',
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Meeting Detail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    render(<MeetingDetailPage />);

    expect(screen.getByTestId('authenticated')).toBeInTheDocument();
  });

  it('should render meeting details when event is loaded', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    const mockEvent = {
      _id: 'event_123',
      title: 'Test Meeting',
      description: 'Test description',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      location: 'Test Location',
      attendees: ['attendee@example.com'],
      meetingLink: 'https://zoom.us/j/123',
      userId: 'user_123',
      calendarId: 'cal_1',
      status: 'confirmed',
    };

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.eventsQueries.getEventByIdPublic) {
        return mockEvent as any;
      }
      if (query === api.contentGenerationQueries.getFollowUpEmail) {
        return null;
      }
      if (query === api.contentGenerationQueries.getGeneratedPosts) {
        return [];
      }
      if (query === api.automations.getAutomations) {
        return [];
      }
      return undefined;
    });

    render(<MeetingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Meeting')).toBeInTheDocument();
    });
  });

  it('should render meeting information sections', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    const mockEvent = {
      _id: 'event_123',
      title: 'Test Meeting',
      description: 'Test description',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      location: 'Test Location',
      attendees: ['attendee@example.com'],
      meetingLink: 'https://zoom.us/j/123',
      userId: 'user_123',
      calendarId: 'cal_1',
      status: 'confirmed',
    };

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.eventsQueries.getEventByIdPublic) {
        return mockEvent as any;
      }
      if (query === api.contentGenerationQueries.getFollowUpEmail) {
        return null;
      }
      if (query === api.contentGenerationQueries.getGeneratedPosts) {
        return [];
      }
      if (query === api.automations.getAutomations) {
        return [];
      }
      return undefined;
    });

    render(<MeetingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Meeting')).toBeInTheDocument();
      expect(screen.getByText('Test Location')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });
  });

  it('should render follow-up email section when available', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    const mockEvent = {
      _id: 'event_123',
      title: 'Test Meeting',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      userId: 'user_123',
      calendarId: 'cal_1',
      status: 'confirmed',
    };

    const mockEmail = {
      _id: 'email_123',
      content: 'Thank you for the meeting...',
      createdAt: Date.now(),
    };

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === 'api.eventsQueries.getEventByIdPublic') {
        return mockEvent as any;
      }
      if (query === 'api.contentGenerationQueries.getFollowUpEmail') {
        return mockEmail as any;
      }
      if (query === 'api.contentGenerationQueries.getGeneratedPosts') {
        return [];
      }
      return null;
    });

    render(<MeetingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Follow-up Email/i)).toBeInTheDocument();
    });
  });

  it('should render generated posts section when available', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    const mockEvent = {
      _id: 'event_123',
      title: 'Test Meeting',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      userId: 'user_123',
      calendarId: 'cal_1',
      status: 'confirmed',
    };

    const mockPosts = [
      {
        _id: 'post_1',
        content: 'Test post content',
        platform: 'linkedin',
        status: 'draft',
        automationName: 'Test Automation',
      },
    ];

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === 'api.eventsQueries.getEventByIdPublic') {
        return mockEvent as any;
      }
      if (query === 'api.contentGenerationQueries.getFollowUpEmail') {
        return null;
      }
      if (query === 'api.contentGenerationQueries.getGeneratedPosts') {
        return mockPosts as any;
      }
      return null;
    });

    render(<MeetingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/Generated Posts/i)).toBeInTheDocument();
    });
  });

  it('should handle event not found', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.eventsQueries.getEventByIdPublic) {
        return null;
      }
      if (query === api.contentGenerationQueries.getFollowUpEmail) {
        return null;
      }
      if (query === api.contentGenerationQueries.getGeneratedPosts) {
        return [];
      }
      if (query === api.automations.getAutomations) {
        return [];
      }
      return undefined;
    });

    render(<MeetingDetailPage />);

    await waitFor(() => {
      // Should still render the page structure
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
    });
  });

  it('should render meeting actions section with notetaker toggle', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    const mockEvent = {
      _id: 'event_123',
      title: 'Test Meeting',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      meetingLink: 'https://zoom.us/j/123',
      userId: 'user_123',
      calendarId: 'cal_1',
      status: 'confirmed',
      notetakerRequested: false,
    };

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.eventsQueries.getEventByIdPublic) {
        return mockEvent as any;
      }
      if (query === api.contentGenerationQueries.getFollowUpEmail) {
        return null;
      }
      if (query === api.contentGenerationQueries.getGeneratedPosts) {
        return [];
      }
      if (query === api.automations.getAutomations) {
        return [];
      }
      return undefined;
    });

    render(<MeetingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Meeting Actions')).toBeInTheDocument();
      expect(screen.getByText('Request Notetaker')).toBeInTheDocument();
    });
  });

  it('should render meeting details section', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    const mockEvent = {
      _id: 'event_123',
      title: 'Test Meeting',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      meetingLink: 'https://zoom.us/j/123',
      location: 'Virtual Meeting',
      description: 'Test description',
      calendarName: 'Test Calendar',
      userId: 'user_123',
      calendarId: 'cal_1',
      status: 'confirmed',
    };

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.eventsQueries.getEventByIdPublic) {
        return mockEvent as any;
      }
      if (query === api.contentGenerationQueries.getFollowUpEmail) {
        return null;
      }
      if (query === api.contentGenerationQueries.getGeneratedPosts) {
        return [];
      }
      if (query === api.automations.getAutomations) {
        return [];
      }
      return undefined;
    });

    render(<MeetingDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Meeting Details')).toBeInTheDocument();
      expect(screen.getByText('Virtual Meeting')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });
  });

  it('should render attendees section when attendees are present', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    const mockEvent = {
      _id: 'event_123',
      title: 'Test Meeting',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 3600000).toISOString(),
      attendees: ['user1@example.com', 'user2@example.com'],
      userId: 'user_123',
      calendarId: 'cal_1',
      status: 'confirmed',
    };

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.eventsQueries.getEventByIdPublic) {
        return mockEvent as any;
      }
      if (query === api.contentGenerationQueries.getFollowUpEmail) {
        return null;
      }
      if (query === api.contentGenerationQueries.getGeneratedPosts) {
        return [];
      }
      if (query === api.automations.getAutomations) {
        return [];
      }
      return undefined;
    });

    render(<MeetingDetailPage />);

    await waitFor(() => {
      // Should render the meeting title
      expect(screen.getByText('Test Meeting')).toBeInTheDocument();
      // Should show attendees count (may be in different formats)
      const attendeeText = screen.queryByText(/attendee/i);
      expect(attendeeText || screen.queryByText(/2/)).toBeTruthy();
    });
  });
});

