'use node';

import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Helper function to call OpenAI
async function generateWithOpenAI(prompt: string, systemPrompt?: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Action to generate follow-up email
export const generateFollowUpEmail = action({
  args: {
    eventId: v.id('events'),
    transcription: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get event details
    const event = await ctx.runQuery(internal.eventsQueries.getEventById, {
      eventId: args.eventId,
    });

    if (!event || event.userId !== identity.subject) {
      throw new Error('Event not found or not authorized');
    }

    // Parse transcription to get readable text
    let transcriptText = '';
    try {
      const transcriptData = JSON.parse(args.transcription);
      if (Array.isArray(transcriptData)) {
        transcriptText = transcriptData
          .map((item: { words?: Array<{ text?: string }>; speaker?: string }) => {
            const words = item.words || [];
            const text = words
              .map((w) => w.text || '')
              .join(' ')
              .trim();
            return text ? `${item.speaker || 'Speaker'}: ${text}` : '';
          })
          .filter(Boolean)
          .join('\n');
      } else {
        transcriptText = transcriptData.text || transcriptData.transcript || args.transcription;
      }
    } catch {
      transcriptText = args.transcription;
    }

    const systemPrompt = `You are a professional assistant helping to write follow-up emails after meetings. Write a warm, professional email that recaps what was discussed in the meeting.`;

    const prompt = `Based on the following meeting transcript, generate a follow-up email that recaps what was discussed.

Meeting Title: ${event.title}
Meeting Date: ${new Date(event.startTime).toLocaleDateString()}
Attendees: ${event.attendees?.join(', ') || 'Not specified'}

Transcript:
${transcriptText}

Generate a professional follow-up email that:
1. Thanks the attendees for their time
2. Summarizes the key points discussed
3. Includes any action items or next steps mentioned
4. Maintains a warm, professional tone

Return only the email content (subject line and body).`;

    const emailContent = await generateWithOpenAI(prompt, systemPrompt);

    // Save the generated email
    await ctx.runMutation(internal.contentGenerationMutations.saveFollowUpEmail, {
      eventId: args.eventId,
      userId: identity.subject,
      content: emailContent,
    });

    return { content: emailContent };
  },
});

// Action to generate social media post
export const generateSocialMediaPost = action({
  args: {
    eventId: v.id('events'),
    automationId: v.id('automations'),
    transcription: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get event and automation details
    const event = await ctx.runQuery(internal.eventsQueries.getEventById, {
      eventId: args.eventId,
    });

    const automation = await ctx.runQuery(internal.automations.getAutomationById, {
      automationId: args.automationId,
    });

    if (!event || event.userId !== identity.subject) {
      throw new Error('Event not found or not authorized');
    }

    if (!automation || automation.userId !== identity.subject) {
      throw new Error('Automation not found or not authorized');
    }

    // Parse transcription to get readable text
    let transcriptText = '';
    try {
      const transcriptData = JSON.parse(args.transcription);
      if (Array.isArray(transcriptData)) {
        transcriptText = transcriptData
          .map((item: { words?: Array<{ text?: string }>; speaker?: string }) => {
            const words = item.words || [];
            const text = words
              .map((w) => w.text || '')
              .join(' ')
              .trim();
            return text ? `${item.speaker || 'Speaker'}: ${text}` : '';
          })
          .filter(Boolean)
          .join('\n');
      } else {
        transcriptText = transcriptData.text || transcriptData.transcript || args.transcription;
      }
    } catch {
      transcriptText = args.transcription;
    }

    const systemPrompt = `You are a professional social media content creator. Generate engaging social media posts based on meeting insights.`;

    const prompt = `Based on the following meeting transcript, generate a social media post using the provided automation instructions.

Meeting Title: ${event.title}
Meeting Date: ${new Date(event.startTime).toLocaleDateString()}

Automation Instructions:
${automation.description}

${automation.example ? `Example Output:\n${automation.example}` : ''}

Transcript:
${transcriptText}

Generate a social media post that follows the automation instructions. Return only the post text.`;

    const postContent = await generateWithOpenAI(prompt, systemPrompt);

    // Determine platform from automation
    const platform = automation.platform.toLowerCase().includes('linkedin') ? 'linkedin' : 'facebook';

    // Save the generated post
    await ctx.runMutation(internal.contentGenerationMutations.saveGeneratedPost, {
      eventId: args.eventId,
      userId: identity.subject,
      automationId: args.automationId,
      platform,
      content: postContent,
      status: 'draft',
    });

    return { content: postContent };
  },
});
