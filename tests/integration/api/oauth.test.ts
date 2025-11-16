import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the authkit module
vi.mock('@workos-inc/authkit-nextjs', () => ({
  authkit: vi.fn(),
  withAuth: vi.fn(),
}));

describe('OAuth API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LINKEDIN_CLIENT_ID = 'test_linkedin_client_id';
    process.env.FACEBOOK_CLIENT_ID = 'test_facebook_client_id';
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
  });

  describe('LinkedIn OAuth', () => {
    it('should redirect to LinkedIn authorization URL', async () => {
      const { authkit } = await import('@workos-inc/authkit-nextjs');
      vi.mocked(authkit).mockResolvedValue({
        session: {
          user: {
            id: 'user_test123',
            email: 'test@example.com',
          },
        },
      } as any);

      const { GET } = await import('@/app/api/linkedin/oauth/route');
      const request = new NextRequest('http://localhost:3000/api/linkedin/oauth');

      const response = await GET(request);
      
      expect(response.status).toBe(307); // Redirect
      const location = response.headers.get('location');
      expect(location).toContain('linkedin.com/oauth/v2/authorization');
      expect(location).toContain('client_id=test_linkedin_client_id');
      expect(location).toContain('scope=openid');
    });

    it('should return 401 when not authenticated', async () => {
      const { authkit } = await import('@workos-inc/authkit-nextjs');
      vi.mocked(authkit).mockResolvedValue({
        session: null,
      } as any);

      const { GET } = await import('@/app/api/linkedin/oauth/route');
      const request = new NextRequest('http://localhost:3000/api/linkedin/oauth');

      const response = await GET(request);
      expect(response.status).toBe(404);
    });
  });

  describe('Facebook OAuth', () => {
    it('should redirect to Facebook authorization URL', async () => {
      const { authkit } = await import('@workos-inc/authkit-nextjs');
      vi.mocked(authkit).mockResolvedValue({
        session: {
          user: {
            id: 'user_test123',
            email: 'test@example.com',
          },
        },
      } as any);

      const { GET } = await import('@/app/api/facebook/oauth/route');
      const request = new NextRequest('http://localhost:3000/api/facebook/oauth');

      const response = await GET(request);
      
      expect(response.status).toBe(307); // Redirect
      const location = response.headers.get('location');
      expect(location).toContain('facebook.com/v18.0/dialog/oauth');
      expect(location).toContain('client_id=test_facebook_client_id');
    });
  });
});

