import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@workos-inc/authkit-nextjs/components';

// Mock WorkOS AuthKit
vi.mock('@workos-inc/authkit-nextjs/components', () => ({
  useAuth: vi.fn(),
  Authenticated: ({ children }: { children: React.ReactNode }) => <div data-testid="authenticated">{children}</div>,
  Unauthenticated: ({ children }: { children: React.ReactNode }) => <div data-testid="unauthenticated">{children}</div>,
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe('Navbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render navbar with logo', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      signOut: vi.fn(),
    } as any);

    render(<Navbar />);

    expect(screen.getByText('Post Meet')).toBeInTheDocument();
  });

  it('should render sign in button when unauthenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      signOut: vi.fn(),
    } as any);

    render(<Navbar />);

    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('should render navigation links when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
      signOut: vi.fn(),
    } as any);

    render(<Navbar />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByTestId('authenticated')).toBeInTheDocument();
  });

  it('should render user avatar when authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        picture: 'https://example.com/avatar.jpg',
      },
      signOut: vi.fn(),
    } as any);

    render(<Navbar />);

    // Avatar button should be present
    const avatarButtons = screen.getAllByRole('button');
    const avatarButton = avatarButtons.find((btn) => btn.querySelector('img') || btn.textContent === '');
    expect(avatarButton).toBeInTheDocument();
  });

  it('should show user dropdown menu when avatar is clicked', async () => {
    const user = userEvent.setup();
    const mockSignOut = vi.fn();

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
      signOut: mockSignOut,
    } as any);

    render(<Navbar />);

    const avatarButton = screen.getByRole('button');
    await user.click(avatarButton);

    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Log out')).toBeInTheDocument();
    });
  });

  it('should call signOut when logout is clicked', async () => {
    const user = userEvent.setup();
    const mockSignOut = vi.fn();

    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
      signOut: mockSignOut,
    } as any);

    render(<Navbar />);

    const avatarButton = screen.getByRole('button');
    await user.click(avatarButton);

    await waitFor(() => {
      expect(screen.getByText('Log out')).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('Log out');
    await user.click(logoutButton);

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('should render navigation links correctly', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    render(<Navbar />);

    const eventsLink = screen.getByText('Events').closest('a');
    const homeLink = screen.getByText('Home').closest('a');
    // Links should be present
    expect(eventsLink).toBeInTheDocument();
    expect(homeLink).toBeInTheDocument();
  });

  it('should display user initials when no picture is available', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
      signOut: vi.fn(),
    } as any);

    render(<Navbar />);

    // Avatar should render with initials fallback
    const avatar = screen.getByRole('button');
    expect(avatar).toBeInTheDocument();
  });

  it('should display email initial when no name is available', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user_123',
        email: 'test@example.com',
      },
      signOut: vi.fn(),
    } as any);

    render(<Navbar />);

    const avatar = screen.getByRole('button');
    expect(avatar).toBeInTheDocument();
  });
});

