import { describe, it, expect } from 'vitest';
import { detectMeetingPlatform, getPlatformName, type MeetingPlatform } from '@/app/utils/meetingPlatform';

describe('meetingPlatform utilities', () => {
  describe('detectMeetingPlatform', () => {
    it('should detect Zoom links', () => {
      expect(detectMeetingPlatform('https://zoom.us/j/123456789')).toBe('zoom');
      expect(detectMeetingPlatform('https://us02web.zoom.us/j/123456789')).toBe('zoom');
      expect(detectMeetingPlatform('https://example.zoom.com/meeting/123')).toBe('zoom');
    });

    it('should detect Google Meet links', () => {
      expect(detectMeetingPlatform('https://meet.google.com/abc-defg-hij')).toBe('google-meet');
      expect(detectMeetingPlatform('https://meet.app.goo.gl/abc123')).toBe('google-meet');
    });

    it('should detect Microsoft Teams links', () => {
      expect(detectMeetingPlatform('https://teams.microsoft.com/l/meetup-join/123')).toBe('microsoft-teams');
      expect(detectMeetingPlatform('https://teams.live.com/meet/123')).toBe('microsoft-teams');
    });

    it('should return unknown for unrecognized links', () => {
      expect(detectMeetingPlatform('https://example.com/meeting')).toBe('unknown');
      expect(detectMeetingPlatform('not-a-url')).toBe('unknown');
    });

    it('should return unknown for undefined or empty input', () => {
      expect(detectMeetingPlatform(undefined)).toBe('unknown');
      expect(detectMeetingPlatform('')).toBe('unknown');
    });

    it('should be case insensitive', () => {
      expect(detectMeetingPlatform('HTTPS://ZOOM.US/J/123')).toBe('zoom');
      expect(detectMeetingPlatform('HTTPS://MEET.GOOGLE.COM/ABC')).toBe('google-meet');
    });
  });

  describe('getPlatformName', () => {
    it('should return correct platform names', () => {
      expect(getPlatformName('zoom')).toBe('Zoom');
      expect(getPlatformName('google-meet')).toBe('Google Meet');
      expect(getPlatformName('microsoft-teams')).toBe('Microsoft Teams');
      expect(getPlatformName('unknown')).toBe('Video Call');
    });
  });
});

