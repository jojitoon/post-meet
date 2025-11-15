'use node';

import { v } from 'convex/values';
import { action } from './_generated/server';
import { internal } from './_generated/api';

// Type assertion to help TypeScript recognize the internal API modules
type InternalApi = typeof internal;

// Action to post to LinkedIn
export const postToLinkedIn = action({
  args: {
    postId: v.id('generatedPosts'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get the post record via query
    const post = await ctx.runQuery((internal as any).generatedPosts.getPostById as any, {
      postId: args.postId,
    });

    if (!post || post.userId !== identity.subject) {
      throw new Error('Post not found or not authorized');
    }

    // Get LinkedIn connection via query
    const connection = await ctx.runQuery((internal as any).socialMedia.getConnectionByPlatform as any, {
      userId: identity.subject,
      platform: 'linkedin',
    });

    if (!connection) {
      throw new Error('LinkedIn account not connected');
    }

    try {
      // Post to LinkedIn using their API
      // LinkedIn API v2 endpoint for creating a post
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
      const postId = data.id || '';

      // Update post status via mutation
      await ctx.runMutation((internal as any).generatedPosts.updatePostStatus as any, {
        postId: args.postId,
        status: 'posted',
        postedAt: Date.now(),
        platformPostId: postId,
      });

      return { success: true, postId };
    } catch (error) {
      // Update post status to failed via mutation
      await ctx.runMutation((internal as any).generatedPosts.updatePostStatus as any, {
        postId: args.postId,
        status: 'failed',
      });

      throw error;
    }
  },
});

// Action to post to Facebook
export const postToFacebook = action({
  args: {
    postId: v.id('generatedPosts'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    // Get the post record via query
    const post = await ctx.runQuery((internal as any).generatedPosts.getPostById as any, {
      postId: args.postId,
    });

    if (!post || post.userId !== identity.subject) {
      throw new Error('Post not found or not authorized');
    }

    // Get Facebook connection via query
    const connection = await ctx.runQuery((internal as any).socialMedia.getConnectionByPlatform as any, {
      userId: identity.subject,
      platform: 'facebook',
    });

    if (!connection) {
      throw new Error('Facebook account not connected');
    }

    // Facebook only allows posting to Pages, not personal profiles
    // We need a page access token and page ID
    if (!connection.pageId || !connection.pageAccessToken) {
      throw new Error(
        'Facebook Page not connected. Please connect a Facebook Page to post content. Personal profiles cannot be used for posting.',
      );
    }

    try {
      // Post to Facebook Page using their Graph API
      // Use the page ID and page access token from the connection
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
      const postId = data.id || '';

      // Update post status via mutation
      await ctx.runMutation((internal as any).generatedPosts.updatePostStatus as any, {
        postId: args.postId,
        status: 'posted',
        postedAt: Date.now(),
        platformPostId: postId,
      });

      return { success: true, postId };
    } catch (error) {
      // Update post status to failed via mutation
      await ctx.runMutation((internal as any).generatedPosts.updatePostStatus as any, {
        postId: args.postId,
        status: 'failed',
      });

      throw error;
    }
  },
});
