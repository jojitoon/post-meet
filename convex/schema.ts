import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
  calendars: defineTable({
    userId: v.string(),
    email: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    calendarId: v.string(),
    calendarName: v.string(),
    isPrimary: v.boolean(),
  }).index('by_user', ['userId']),
  events: defineTable({
    userId: v.string(),
    calendarId: v.id('calendars'),
    googleEventId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    location: v.optional(v.string()),
    attendees: v.optional(v.array(v.string())),
    status: v.string(),
    htmlLink: v.optional(v.string()),
    updated: v.string(),
    notetakerRequested: v.optional(v.boolean()),
    meetingLink: v.optional(v.string()),
    botId: v.optional(v.string()), // Recall.ai bot ID
    botStatus: v.optional(v.string()), // Recall.ai bot status
  })
    .index('by_calendar', ['calendarId'])
    .index('by_user', ['userId'])
    .index('by_user_and_time', ['userId', 'startTime'])
    .index('by_user_and_notetaker', ['userId', 'notetakerRequested']),
  userSettings: defineTable({
    userId: v.string(),
    botJoinMinutesBefore: v.number(), // Minutes before meeting to join
  }).index('by_user', ['userId']),
});
