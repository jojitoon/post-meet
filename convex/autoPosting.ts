'use node';

import { v } from 'convex/values';
import { internalAction } from './_generated/server';
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

// Helper to parse transcription
function parseTranscription(transcription: string): string {
  try {
    const transcriptData = JSON.parse(transcription);
    if (Array.isArray(transcriptData)) {
      return transcriptData
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
    }
    return transcriptData.text || transcriptData.transcript || transcription;
  } catch {
    return transcription;
  }
}

// Internal action to generate default social media post (without automation)
async function generateDefaultSocialMediaPost(
  event: any,
  transcription: string,
  platform: 'linkedin' | 'facebook',
): Promise<string> {
  const transcriptText = parseTranscription(transcription);

  const platformVibe = platform === 'linkedin' 
    ? 'professional, business-focused, thought leadership style'
    : 'casual, engaging, community-focused style';

  const systemPrompt = `You are a professional social media content creator. Generate engaging ${platform} posts based on meeting insights.`;

  const prompt = `Based on the following meeting transcript, generate a ${platform} post that matches the ${platformVibe}.

Meeting Title: ${event.title}
Meeting Date: ${new Date(event.startTime).toLocaleDateString()}
${event.attendees?.length ? `Attendees: ${event.attendees.join(', ')}` : ''}

Transcript:
${transcriptText}

Generate a ${platform} post that:
${platform === 'linkedin' 
  ? '- Is professional and business-focused\n- Highlights key insights or takeaways\n- Uses appropriate LinkedIn tone and format\n- Is engaging but not overly casual'
  : '- Is casual and engaging\n- Connects with the community\n- Uses appropriate Facebook tone and format\n- Is friendly and approachable'}

Return only the post text, no additional formatting.`;

  return await generateWithOpenAI(prompt, systemPrompt);
}

// Internal action to process events for auto-posting
export const processAutoPosting = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = new Date();

    // Get events that need processing
    const eventsToProcess = await ctx.runQuery(internal.autoPostingQueries.getEventsNeedingAutoProcessing, {
      currentTime: now.toISOString(),
    });

    for (const { event, needsFollowUpEmail, needsSocialMediaPosts, connections } of eventsToProcess) {
      try {
        const transcription = event.meetingBaasTranscription!;

        // Generate follow-up email if needed
        if (needsFollowUpEmail) {
          try {
            const transcriptText = parseTranscription(transcription);

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

            await ctx.runMutation(internal.contentGenerationMutations.saveFollowUpEmail, {
              eventId: event._id,
              userId: event.userId,
              content: emailContent,
            });
          } catch (error) {
            console.error(`Failed to generate follow-up email for event ${event._id}:`, error);
          }
        }

        // Generate and post social media content if needed
        if (needsSocialMediaPosts && connections.length > 0) {
          // Get user's automations
          const automations = await ctx.runQuery(internal.automations.getAutomationsByUser, {
            userId: event.userId,
          });

          for (const connection of connections) {
            const platform = connection.platform as 'linkedin' | 'facebook';

            try {
              let postContent = '';
              let automationId: string | undefined = undefined;

              // Try to find matching automation
              const matchingAutomation = automations?.find(
                (auto: any) =>
                  auto.isActive &&
                  (auto.platform.toLowerCase().includes(platform) || 
                   (platform === 'linkedin' && auto.platform.toLowerCase().includes('linkedin')) ||
                   (platform === 'facebook' && auto.platform.toLowerCase().includes('facebook'))),
              );

              if (matchingAutomation) {
                // Use automation pattern
                const transcriptText = parseTranscription(transcription);

                const systemPrompt = `You are a professional social media content creator. Generate engaging social media posts based on meeting insights.`;

                const prompt = `Based on the following meeting transcript, generate a social media post using the provided automation instructions.

Meeting Title: ${event.title}
Meeting Date: ${new Date(event.startTime).toLocaleDateString()}

Automation Instructions:
${matchingAutomation.description}

${matchingAutomation.example ? `Example Output:\n${matchingAutomation.example}` : ''}

Transcript:
${transcriptText}

Generate a social media post that follows the automation instructions. Return only the post text.`;

                postContent = await generateWithOpenAI(prompt, systemPrompt);
                automationId = matchingAutomation._id;
              } else {
                // Generate default post matching platform vibe
                postContent = await generateDefaultSocialMediaPost(event, transcription, platform);
              }

              // Save the generated post
              const postId = await ctx.runMutation(internal.contentGenerationMutations.saveGeneratedPost, {
                eventId: event._id,
                userId: event.userId,
                automationId: automationId as any,
                platform,
                content: postContent,
                status: 'draft',
              });

              // If autoPost is enabled, post immediately
              if (connection.autoPost === true) {
                try {
                  await ctx.runAction(internal.autoPosting.postToSocialMediaInternal, {
                    postId: postId as any,
                    content: postContent,
                    platform,
                    userId: event.userId,
                  });
                } catch (error) {
                  console.error(`Failed to auto-post to ${platform} for event ${event._id}:`, error);
                }
              }
            } catch (error) {
              console.error(`Failed to generate social media post for ${platform} for event ${event._id}:`, error);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to process event ${event._id} for auto-posting:`, error);
      }
    }
  },
});

// Internal action to post to social media (for use in cron jobs)
export const postToSocialMediaInternal = internalAction({
  args: {
    postId: v.id('generatedPosts'),
    content: v.string(),
    platform: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the post record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const post = await ctx.runQuery((internal as any).generatedPosts.getPostById, {
      postId: args.postId,
    });

    if (!post || post.userId !== args.userId) {
      throw new Error('Post not found or not authorized');
    }

    // Get connection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = await ctx.runQuery((internal as any).socialMedia.getConnectionByPlatform, {
      userId: args.userId,
      platform: args.platform,
    });

    if (!connection) {
      throw new Error(`${args.platform} account not connected`);
    }

    try {
      if (args.platform === 'linkedin') {
        // Post to LinkedIn
        const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${connection.accessToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify({
            author: `urn:li:person:${connection.profileId}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                  text: args.content,
                },
                shareMediaCategory: 'NONE',
              },
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`LinkedIn API error: ${response.status} ${error}`);
        }

        const data = await response.json();
        const platformPostId = data.id || '';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.runMutation((internal as any).generatedPosts.updatePostStatus, {
          postId: args.postId,
          status: 'posted',
          postedAt: Date.now(),
          platformPostId,
        });

        return { success: true, postId: platformPostId };
      } else if (args.platform === 'facebook') {
        // Facebook only allows posting to Pages
        if (!connection.pageId || !connection.pageAccessToken) {
          throw new Error(
            'Facebook Page not connected. Please connect a Facebook Page to post content.',
          );
        }

        const response = await fetch(`https://graph.facebook.com/v18.0/${connection.pageId}/feed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: args.content,
            access_token: connection.pageAccessToken,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Facebook API error: ${response.status} ${error}`);
        }

        const data = await response.json();
        const platformPostId = data.id || '';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.runMutation((internal as any).generatedPosts.updatePostStatus, {
          postId: args.postId,
          status: 'posted',
          postedAt: Date.now(),
          platformPostId,
        });

        return { success: true, postId: platformPostId };
      } else {
        throw new Error(`Unsupported platform: ${args.platform}`);
      }
    } catch (error) {
      // Update post status to failed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await ctx.runMutation((internal as any).generatedPosts.updatePostStatus, {
        postId: args.postId,
        status: 'failed',
      });

      throw error;
    }
  },
});

