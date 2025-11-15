export type MeetingPlatform = 'zoom' | 'google-meet' | 'microsoft-teams' | 'unknown';

export function detectMeetingPlatform(meetingLink?: string): MeetingPlatform {
  if (!meetingLink) return 'unknown';

  const link = meetingLink.toLowerCase();

  if (link.includes('zoom.us') || link.includes('zoom.com')) {
    return 'zoom';
  }
  if (link.includes('teams.microsoft.com') || link.includes('teams.live.com')) {
    return 'microsoft-teams';
  }
  if (link.includes('meet.google.com') || link.includes('meet.app')) {
    return 'google-meet';
  }

  return 'unknown';
}

export function getPlatformName(platform: MeetingPlatform): string {
  switch (platform) {
    case 'zoom':
      return 'Zoom';
    case 'google-meet':
      return 'Google Meet';
    case 'microsoft-teams':
      return 'Microsoft Teams';
    default:
      return 'Video Call';
  }
}

