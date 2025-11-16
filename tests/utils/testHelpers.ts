import { Id } from '@/convex/_generated/dataModel';

/**
 * Test helper utilities
 */

export function createMockUserIdentity(subject: string = 'user_test123') {
  return {
    subject,
    email: 'test@example.com',
    emailVerified: true,
    name: 'Test User',
    pictureUrl: 'https://example.com/avatar.jpg',
    issuer: 'https://test.workos.com',
    token: 'mock_token',
  };
}

export function createMockEvent(overrides?: Partial<any>) {
  return {
    _id: 'event_123' as Id<'events'>,
    _creationTime: Date.now(),
    userId: 'user_test123',
    calendarId: 'calendar_123' as Id<'calendars'>,
    googleEventId: 'google_event_123',
    title: 'Test Meeting',
    description: 'Test description',
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    location: 'Test Location',
    attendees: ['attendee1@example.com', 'attendee2@example.com'],
    status: 'confirmed',
    htmlLink: 'https://calendar.google.com/event',
    notetakerRequested: false,
    ...overrides,
  };
}

export function createMockCalendar(overrides?: Partial<any>) {
  return {
    _id: 'calendar_123' as Id<'calendars'>,
    _creationTime: Date.now(),
    userId: 'user_test123',
    email: 'test@example.com',
    accessToken: 'mock_access_token',
    refreshToken: 'mock_refresh_token',
    calendarId: 'primary',
    calendarName: 'Test Calendar',
    isPrimary: true,
    ...overrides,
  };
}

export function createMockSocialMediaConnection(overrides?: Partial<any>) {
  return {
    _id: 'connection_123' as Id<'socialMediaConnections'>,
    _creationTime: Date.now(),
    userId: 'user_test123',
    platform: 'linkedin',
    accessToken: 'mock_access_token',
    refreshToken: 'mock_refresh_token',
    expiresAt: Date.now() + 3600000,
    profileId: 'profile_123',
    profileName: 'Test User',
    ...overrides,
  };
}

export function createMockAutomation(overrides?: Partial<any>) {
  return {
    _id: 'automation_123' as Id<'automations'>,
    _creationTime: Date.now(),
    userId: 'user_test123',
    name: 'Test Automation',
    type: 'Generate post',
    platform: 'LinkedIn post',
    description: 'Test description',
    isActive: true,
    ...overrides,
  };
}

