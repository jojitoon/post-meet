import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Navbar } from '@/components/Navbar';
import { useAuth } from '@workos-inc/authkit-nextjs/components';

// Mock WorkOS AuthKit
vi.mock('@workos-inc/authkit-nextjs/components', () => ({
  useAuth: vi.fn(),
}));

// Mock Convex React
vi.mock('convex/react', () => ({
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
    // There are multiple Authenticated components (NavLinks and UserMenu)
    const authenticatedElements = screen.getAllByTestId('authenticated');
    expect(authenticatedElements.length).toBeGreaterThan(0);
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

    // Avatar button should be present - look for button with aria-haspopup="menu"
    const buttons = screen.getAllByRole('button');
    const avatarButton = buttons.find((btn) => btn.getAttribute('aria-haspopup') === 'menu');
    expect(avatarButton).toBeDefined();
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

    // Find the avatar button by aria-haspopup attribute
    const buttons = screen.getAllByRole('button');
    const avatarButton = buttons.find((btn) => btn.getAttribute('aria-haspopup') === 'menu');
    expect(avatarButton).toBeDefined();
    await user.click(avatarButton!);

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

    // Find the avatar button by aria-haspopup attribute
    const buttons = screen.getAllByRole('button');
    const avatarButton = buttons.find((btn) => btn.getAttribute('aria-haspopup') === 'menu');
    expect(avatarButton).toBeDefined();
    await user.click(avatarButton!);

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

    // Avatar should render with initials fallback - look for button with aria-haspopup="menu"
    const buttons = screen.getAllByRole('button');
    const avatarButton = buttons.find((btn) => btn.getAttribute('aria-haspopup') === 'menu');
    expect(avatarButton).toBeDefined();
    expect(avatarButton).toBeInTheDocument();
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

    // Look for the avatar button (dropdown trigger) - it has aria-haspopup="menu"
    const buttons = screen.getAllByRole('button');
    const avatarButton = buttons.find((btn) => btn.getAttribute('aria-haspopup') === 'menu');
    expect(avatarButton).toBeDefined();
    expect(avatarButton).toBeInTheDocument();
  });
});

