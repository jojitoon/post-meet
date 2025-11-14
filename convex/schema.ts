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
});
