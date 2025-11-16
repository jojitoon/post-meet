import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '@/app/settings/page';
import { useQuery, useMutation } from 'convex/react';
import { useAuth } from '@workos-inc/authkit-nextjs/components';

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

    vi.mocked(useQuery).mockReturnValue({
      calendars: [],
      userSettings: null,
      socialMediaConnections: [],
      automations: [],
    } as any);

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

    vi.mocked(useQuery).mockReturnValue({
      calendars: [],
      userSettings: null,
      socialMediaConnections: [],
      automations: [],
    } as any);

    render(<SettingsPage />);

    expect(screen.getByText(/Calendars/i)).toBeInTheDocument();
  });

  it('should render social media tabs', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    vi.mocked(useQuery).mockReturnValue({
      calendars: [],
      userSettings: null,
      socialMediaConnections: [],
      automations: [],
    } as any);

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

    vi.mocked(useQuery).mockReturnValue({
      calendars: [],
      userSettings: { botJoinMinutesBefore: 5 },
      socialMediaConnections: [],
      automations: [],
    } as any);

    render(<SettingsPage />);

    expect(screen.getByText(/Bot Join Time/i)).toBeInTheDocument();
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

    vi.mocked(useQuery).mockImplementation((query) => {
      if (query === 'api.calendars.listCalendars') {
        return mockCalendars as any;
      }
      if (query === 'api.userSettings.getUserSettings') {
        return null;
      }
      if (query === 'api.socialMedia.getSocialMediaConnections') {
        return [];
      }
      if (query === 'api.automations.getAutomations') {
        return [];
      }
      return null;
    });

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

    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<SettingsPage />);

    expect(screen.getByTestId('authenticated')).toBeInTheDocument();
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
      if (query === 'api.calendars.listCalendars') {
        return [];
      }
      if (query === 'api.userSettings.getUserSettings') {
        return null;
      }
      if (query === 'api.socialMedia.getSocialMediaConnections') {
        return mockConnections as any;
      }
      if (query === 'api.automations.getAutomations') {
        return [];
      }
      return null;
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/LinkedIn/i)).toBeInTheDocument();
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
      if (query === 'api.calendars.listCalendars') {
        return [];
      }
      if (query === 'api.userSettings.getUserSettings') {
        return null;
      }
      if (query === 'api.socialMedia.getSocialMediaConnections') {
        return [];
      }
      if (query === 'api.automations.getAutomations') {
        return mockAutomations as any;
      }
      return null;
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Automations/i)).toBeInTheDocument();
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

    vi.mocked(useQuery).mockReturnValue({
      calendars: [],
      userSettings: null,
      socialMediaConnections: [],
      automations: [],
    } as any);

    render(<SettingsPage />);

    // Should show connect buttons when not connected
    const connectButtons = screen.getAllByText(/Connect/i);
    expect(connectButtons.length).toBeGreaterThan(0);
  });
});
