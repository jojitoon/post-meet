import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Check every minute for events that need bots (routes to correct service based on USE_RECALL env var)
crons.interval('checkAndSendBots', { minutes: 1 }, internal.botService.checkAndSendBotsForUpcomingEvents);

// Poll every 5 minutes for ended meetings and fetch transcripts (routes to correct service)
crons.interval('pollEndedMeetingsForTranscripts', { minutes: 1 }, internal.botService.pollEndedMeetingsForTranscripts);

// Check every 2 minutes for events that need auto-posting (follow-up emails and social media posts)
crons.interval('processAutoPosting', { minutes: 2 }, internal.autoPosting.processAutoPosting);

export default crons;
