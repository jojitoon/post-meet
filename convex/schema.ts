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
    meetingBaasBotId: v.optional(v.string()), // Meeting BaaS bot ID
    meetingBaasTranscription: v.optional(v.string()), // Meeting BaaS transcription data
    botProvider: v.optional(v.string()), // 'recall' or 'meeting_baas'
  })
    .index('by_calendar', ['calendarId'])
    .index('by_user', ['userId'])
    .index('by_user_and_time', ['userId', 'startTime'])
    .index('by_user_and_notetaker', ['userId', 'notetakerRequested']),
  userSettings: defineTable({
    userId: v.string(),
    botJoinMinutesBefore: v.number(), // Minutes before meeting to join
  }).index('by_user', ['userId']),
  socialMediaConnections: defineTable({
    userId: v.string(),
    platform: v.string(), // 'linkedin' or 'facebook'
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()), // Unix timestamp
    profileId: v.optional(v.string()), // Platform-specific user ID
    profileName: v.optional(v.string()),
    // Facebook-specific fields for Pages
    pageId: v.optional(v.string()), // Facebook Page ID
    pageAccessToken: v.optional(v.string()), // Page access token for posting
    pageName: v.optional(v.string()), // Page name
    autoPost: v.optional(v.boolean()), // Whether to automatically post generated content
  })
    .index('by_user', ['userId'])
    .index('by_user_and_platform', ['userId', 'platform']),
  automations: defineTable({
    userId: v.string(),
    name: v.string(),
    type: v.string(), // 'Generate post'
    platform: v.string(), // 'LinkedIn post' or 'Facebook post'
    description: v.string(), // Instructions for AI generation
    example: v.optional(v.string()), // Example output
    isActive: v.boolean(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_platform', ['userId', 'platform']),
  generatedPosts: defineTable({
    eventId: v.id('events'),
    userId: v.string(),
    automationId: v.optional(v.id('automations')), // Optional - can be null for default posts
    platform: v.string(), // 'linkedin' or 'facebook'
    content: v.string(), // Generated post content
    status: v.string(), // 'draft', 'posted', 'failed'
    postedAt: v.optional(v.number()), // Unix timestamp when posted
    platformPostId: v.optional(v.string()), // ID from social media platform
  })
    .index('by_event', ['eventId'])
    .index('by_user', ['userId'])
    .index('by_automation', ['automationId']),
  followUpEmails: defineTable({
    eventId: v.id('events'),
    userId: v.string(),
    content: v.string(), // Generated email content
    createdAt: v.number(), // Unix timestamp
  })
    .index('by_event', ['eventId'])
    .index('by_user', ['userId']),
});
