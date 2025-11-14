import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Check every minute for events that need bots
crons.interval(
  'checkAndSendBots',
  { minutes: 1 },
  internal.recall.checkAndSendBotsForUpcomingEvents,
);

export default crons;

