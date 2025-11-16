import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '@/app/settings/page';
import { useQuery, useMutation } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { api } from '@/convex/_generated/api';

// Mock Convex hooks
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
  Authenticated: ({ children }: { children: React.ReactNode }) => <div data-testid="authenticated">{children}</div>,
  Unauthenticated: ({ children }: { children: React.ReactNode }) => <div data-testid="unauthenticated">{children}</div>,
}));

// Mock WorkOS AuthKit
vi.mock('@workos-inc/authkit-nextjs/components', () => ({
  useAuth: vi.fn(),
}));

// Mock Next.js router and search params
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/settings',
}));

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render settings page title', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.calendars.listCalendars) {
        return [] as any;
      }
      if (query === api.userSettings.getUserSettings) {
        return null;
      }
      if (query === api.socialMedia.getSocialMediaConnections) {
        return [] as any;
      }
      if (query === api.automations.getAutomations) {
        return [] as any;
      }
      return undefined;
    });

    render(<SettingsPage />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should render calendar management section', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.calendars.listCalendars) {
        return [] as any;
      }
      if (query === api.userSettings.getUserSettings) {
        return null;
      }
      if (query === api.socialMedia.getSocialMediaConnections) {
        return [] as any;
      }
      if (query === api.automations.getAutomations) {
        return [] as any;
      }
      return undefined;
    });

    render(<SettingsPage />);

    // Use getAllByText and check that at least one exists
    const connectedCalendarsElements = screen.getAllByText(/Connected Calendars/i);
    expect(connectedCalendarsElements.length).toBeGreaterThan(0);
  });

  it('should render social media tabs', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.calendars.listCalendars) {
        return [] as any;
      }
      if (query === api.userSettings.getUserSettings) {
        return null;
      }
      if (query === api.socialMedia.getSocialMediaConnections) {
        return [] as any;
      }
      if (query === api.automations.getAutomations) {
        return [] as any;
      }
      return undefined;
    });

    render(<SettingsPage />);

    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
  });

  it('should render bot settings section', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.calendars.listCalendars) {
        return [] as any;
      }
      if (query === api.userSettings.getUserSettings) {
        return { botJoinMinutesBefore: 5 } as any;
      }
      if (query === api.socialMedia.getSocialMediaConnections) {
        return [] as any;
      }
      if (query === api.automations.getAutomations) {
        return [] as any;
      }
      return undefined;
    });

    render(<SettingsPage />);

    expect(screen.getByText(/Notetaker Bot Settings/i)).toBeInTheDocument();
  });

  it('should render calendars when available', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    const mockCalendars = [
      {
        _id: 'cal_1',
        calendarName: 'Test Calendar',
        email: 'test@example.com',
        isPrimary: true,
      },
    ];

    // Mock useQuery calls in order: listCalendars, getUserSettings, getSocialMediaConnections, getAutomations
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockCalendars as any) // listCalendars
      .mockReturnValueOnce(null) // getUserSettings
      .mockReturnValueOnce([] as any) // getSocialMediaConnections
      .mockReturnValueOnce([] as any); // getAutomations

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Calendar')).toBeInTheDocument();
    });
  });

  it('should render loading state', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockImplementation(() => undefined);

    render(<SettingsPage />);

    // Settings page should render even when loading
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should render social media connection status', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    const mockConnections = [
      {
        _id: 'conn_1',
        platform: 'linkedin',
        profileName: 'Test User',
      },
    ];

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.calendars.listCalendars) {
        return [] as any;
      }
      if (query === api.userSettings.getUserSettings) {
        return null;
      }
      if (query === api.socialMedia.getSocialMediaConnections) {
        return mockConnections as any;
      }
      if (query === api.automations.getAutomations) {
        return [] as any;
      }
      return undefined;
    });

    render(<SettingsPage />);

    await waitFor(() => {
      // Use getAllByText and check that at least one exists
      const linkedInElements = screen.getAllByText(/LinkedIn/i);
      expect(linkedInElements.length).toBeGreaterThan(0);
    });
  });

  it('should render automations section', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    const mockAutomations = [
      {
        _id: 'auto_1',
        name: 'LinkedIn Post',
        platform: 'linkedin',
        isActive: true,
      },
    ];

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.calendars.listCalendars) {
        return [] as any;
      }
      if (query === api.userSettings.getUserSettings) {
        return null;
      }
      if (query === api.socialMedia.getSocialMediaConnections) {
        return [] as any;
      }
      if (query === api.automations.getAutomations) {
        return mockAutomations as any;
      }
      return undefined;
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Content Generation/i)).toBeInTheDocument();
    });
  });

  it('should render connect buttons for social media', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === api.calendars.listCalendars) {
        return [] as any;
      }
      if (query === api.userSettings.getUserSettings) {
        return null;
      }
      if (query === api.socialMedia.getSocialMediaConnections) {
        return [] as any;
      }
      if (query === api.automations.getAutomations) {
        return [] as any;
      }
      return undefined;
    });

    render(<SettingsPage />);

    // Should show connect buttons when not connected
    const connectButtons = screen.getAllByText(/Connect/i);
    expect(connectButtons.length).toBeGreaterThan(0);
  });
});
