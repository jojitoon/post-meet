import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Check every minute for events that need bots (routes to correct service based on USE_RECALL env var)
crons.interval('checkAndSendBots', { minutes: 1 }, internal.botService.checkAndSendBotsForUpcomingEvents);

// Poll every 5 minutes for ended meetings and fetch transcripts (routes to correct service)
crons.interval('pollEndedMeetingsForTranscripts', { minutes: 5 }, internal.botService.pollEndedMeetingsForTranscripts);

export default crons;
