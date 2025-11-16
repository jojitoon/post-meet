'use client';

import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  FileText,
  Mail,
  Share2,
  Copy,
  Send,
  Clock,
  Users,
  MapPin,
  Calendar as CalendarIcon,
  ArrowLeft,
  Loader2,
  Bot,
  Download,
  Video,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { detectMeetingPlatform, getPlatformName } from '@/app/utils/meetingPlatform';

export default function MeetingDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event = useQuery(api.eventsQueries.getEventByIdPublic, { eventId: eventId as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const followUpEmail = useQuery(api.contentGenerationQueries.getFollowUpEmail, { eventId: eventId as any });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const generatedPosts = useQuery(api.contentGenerationQueries.getGeneratedPosts, { eventId: eventId as any });
  const automations = useQuery(api.automations.getAutomations);
  const generateEmail = useAction(api.contentGeneration.generateFollowUpEmail);
  const generatePost = useAction(api.contentGeneration.generateSocialMediaPost);
  const postToLinkedIn = useAction(api.socialMediaPosting.postToLinkedIn);
  const postToFacebook = useAction(api.socialMediaPosting.postToFacebook);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendBotToMeeting = useAction((api as any).botService.sendBotToMeetingManually);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recallBot = useAction((api as any).botService.recallBot);
  const toggleNotetakerRequest = useMutation(api.eventsQueries.toggleNotetakerRequest);

  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [isGeneratingPost, setIsGeneratingPost] = useState<{ [key: string]: boolean }>({});
  const [isPosting, setIsPosting] = useState<{ [key: string]: boolean }>({});
  const [isSendingBot, setIsSendingBot] = useState(false);
  const [isRecallingBot, setIsRecallingBot] = useState(false);
  const [notetakerRequested, setNotetakerRequested] = useState(false);
  const [showAttendees, setShowAttendees] = useState(false);
  const [selectedPost, setSelectedPost] = useState<{
    _id: string;
    content: string;
    platform: string;
    status: string;
  } | null>(null);

  // Sync notetaker state with event
  useEffect(() => {
    if (event) {
      setNotetakerRequested(event.notetakerRequested || false);
    }
  }, [event]);

  const handleGenerateEmail = async () => {
    if (!event?.meetingBaasTranscription) {
      toast.error('No transcription available for this meeting');
      return;
    }

    setIsGeneratingEmail(true);
    try {
      await generateEmail({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: eventId as any,
        transcription: event.meetingBaasTranscription,
      });
      toast.success('Follow-up email generated successfully!');
    } catch (error) {
      console.error('Failed to generate email:', error);
      toast.error('Failed to generate follow-up email');
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleGeneratePost = async (automationId: string) => {
    if (!event?.meetingBaasTranscription) {
      toast.error('No transcription available for this meeting');
      return;
    }

    setIsGeneratingPost((prev) => ({ ...prev, [automationId]: true }));
    try {
      await generatePost({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: eventId as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        automationId: automationId as any,
        transcription: event.meetingBaasTranscription,
      });
      toast.success('Social media post generated successfully!');
    } catch (error) {
      console.error('Failed to generate post:', error);
      toast.error('Failed to generate social media post');
    } finally {
      setIsGeneratingPost((prev) => ({ ...prev, [automationId]: false }));
    }
  };

  const handleCopyPost = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Post copied to clipboard!');
  };

  const handlePost = async (post: { _id: string; content: string; platform: string }) => {
    setIsPosting((prev) => ({ ...prev, [post._id]: true }));
    try {
      if (post.platform === 'linkedin') {
        await postToLinkedIn({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          postId: post._id as any,
          content: post.content,
        });
      } else if (post.platform === 'facebook') {
        await postToFacebook({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          postId: post._id as any,
          content: post.content,
        });
      }
      toast.success(`Post published to ${post.platform}!`);
      setSelectedPost(null);
    } catch (error) {
      console.error('Failed to post:', error);
      toast.error(`Failed to post to ${post.platform}`);
    } finally {
      setIsPosting((prev) => ({ ...prev, [post._id]: false }));
    }
  };

  const handleSendBot = async () => {
    if (!event?.meetingLink) {
      toast.error('No meeting link available');
      return;
    }

    setIsSendingBot(true);
    try {
      await sendBotToMeeting({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: eventId as any,
      });
      toast.success('Bot will join the meeting at the scheduled time!');
    } catch (error) {
      console.error('Failed to send bot:', error);
      toast.error('Failed to send bot. Please try again.');
    } finally {
      setIsSendingBot(false);
    }
  };

  const handleRecallBot = async () => {
    setIsRecallingBot(true);
    try {
      await recallBot({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: eventId as any,
      });
      toast.success('Transcription retrieval initiated. It may take a few moments to process.');
    } catch (error) {
      console.error('Failed to recall bot:', error);
      toast.error('Failed to retrieve transcription. Please try again.');
    } finally {
      setIsRecallingBot(false);
    }
  };

  const handleToggleNotetaker = async (checked: boolean) => {
    // Optimistically update UI
    setNotetakerRequested(checked);

    try {
      await toggleNotetakerRequest({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: eventId as any,
        notetakerRequested: checked,
      });
      toast.success(checked ? 'Notetaker requested' : 'Notetaker request removed');
    } catch (error) {
      // Revert on error
      setNotetakerRequested(!checked);
      console.error('Failed to toggle notetaker request:', error);
      toast.error('Failed to update notetaker request');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (dateString.includes('T')) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return 'All Day';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTranscription = (transcription: string) => {
    try {
      const transcriptData = JSON.parse(transcription);
      if (Array.isArray(transcriptData)) {
        return transcriptData.map(
          (
            item: {
              id?: number;
              speaker?: string;
              start_time?: number;
              words?: Array<{ text?: string }>;
            },
            idx: number,
          ) => {
            const words = item.words || [];
            const spokenText = words.map((word) => word.text || '').join(' ').trim();
            const timeDisplay =
              item.start_time !== undefined
                ? `${Math.floor(item.start_time / 60)}:${Math.floor(item.start_time % 60)
                    .toString()
                    .padStart(2, '0')}`
                : '';

            return (
              <div key={item.id || idx} className="mb-4 p-4 bg-muted rounded-md border-l-4 border-primary">
                <div className="flex items-center gap-2 mb-2">
                  {item.speaker && <div className="font-semibold text-base text-primary">{item.speaker}</div>}
                  {timeDisplay && (
                    <span className="text-xs text-muted-foreground font-mono bg-background px-2 py-1 rounded">
                      {timeDisplay}
                    </span>
                  )}
                </div>
                {spokenText && <p className="text-sm leading-relaxed">{spokenText}</p>}
              </div>
            );
          },
        );
      }
      return <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(transcriptData, null, 2)}</pre>;
    } catch {
      return <pre className="whitespace-pre-wrap text-sm">{transcription}</pre>;
    }
  };

  if (event === undefined) {
    return (
      <div className="container mx-auto p-8 max-w-6xl">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="text-muted-foreground mt-4">Loading meeting details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto p-8 max-w-6xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Meeting not found</p>
              <Link href="/events">
                <Button variant="outline">Back to Events</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/events">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </Link>
        <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
        <div className="flex items-center gap-4 text-muted-foreground flex-wrap">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              {formatDate(event.startTime)} • {formatTime(event.startTime)}
              {event.endTime && ` - ${formatTime(event.endTime)}`}
            </span>
          </div>
          {event.attendees && event.attendees.length > 0 && (
            <button
              onClick={() => setShowAttendees(!showAttendees)}
              className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer"
            >
              <Users className="h-4 w-4" />
              <span>
                {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
              </span>
              {showAttendees ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Attendees Expandable Section */}
      {event.attendees && event.attendees.length > 0 && showAttendees && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendees ({event.attendees.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {event.attendees.map((attendee, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                    {attendee.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm">{attendee}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {/* Meeting Details Section */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Meeting Link */}
              {event.meetingLink && (() => {
                const platform = detectMeetingPlatform(event.meetingLink);
                const platformName = getPlatformName(platform);
                return (
                  <div className="flex items-start gap-3 p-4 border rounded-lg">
                    {platform === 'zoom' ? (
                      <div className="h-8 w-8 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        Z
                      </div>
                    ) : platform === 'google-meet' ? (
                      <div className="h-8 w-8 rounded bg-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        G
                      </div>
                    ) : platform === 'microsoft-teams' ? (
                      <div className="h-8 w-8 rounded bg-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        T
                      </div>
                    ) : (
                      <Video className="h-8 w-8 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium mb-1">Meeting Link</p>
                      <a
                        href={event.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-2 break-all"
                      >
                        {event.meetingLink}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        <a href={event.meetingLink} target="_blank" rel="noopener noreferrer">
                          Join {platformName}
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })()}

              {/* Location */}
              {event.location && (
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium mb-1">Location</p>
                    <p className="text-sm text-muted-foreground">{event.location}</p>
                  </div>
                </div>
              )}

              {/* Calendar */}
              {event.calendarName && (
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium mb-1">Calendar</p>
                    <p className="text-sm text-muted-foreground">{event.calendarName}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div className="p-4 border rounded-lg">
                  <p className="font-medium mb-2">Description</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Meeting Actions Section */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Notetaker Toggle - Only show if meeting has a link */}
              {event.meetingLink && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Request Notetaker</p>
                      <p className="text-sm text-muted-foreground">
                        Enable automatic transcription for this meeting
                      </p>
                    </div>
                  </div>
                  <Switch checked={notetakerRequested} onCheckedChange={handleToggleNotetaker} />
                </div>
              )}

              {/* Send Bot Button (for upcoming meetings) */}
              {event.meetingLink && (() => {
                const eventStart = new Date(event.startTime);
                const eventEnd = event.endTime ? new Date(event.endTime) : null;
                const now = new Date();
                const isUpcoming = eventStart > now;
                const isCurrentlyHappening = eventStart <= now && eventEnd && eventEnd > now;
                const hasBot = !!(event.botId || event.meetingBaasBotId);

                if ((isUpcoming || isCurrentlyHappening) && !hasBot && notetakerRequested) {
                  return (
                    <Button
                      onClick={handleSendBot}
                      disabled={isSendingBot || !notetakerRequested}
                      className="w-full"
                    >
                      {isSendingBot ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending Bot...
                        </>
                      ) : (
                        <>
                          <Bot className="h-4 w-4 mr-2" />
                          Send Notetaker Bot
                        </>
                      )}
                    </Button>
                  );
                }
                return null;
              })()}

              {/* Recall Bot Button (for past meetings with bot but no transcription) */}
              {(() => {
                const eventEnd = event.endTime ? new Date(event.endTime) : null;
                const now = new Date();
                const isPast = eventEnd ? eventEnd < now : false;
                const hasBot = !!(event.botId || event.meetingBaasBotId);
                const hasTranscription = !!event.meetingBaasTranscription;

                if (isPast && hasBot && !hasTranscription) {
                  return (
                    <Button
                      onClick={handleRecallBot}
                      disabled={isRecallingBot}
                      variant="outline"
                      className="w-full"
                    >
                      {isRecallingBot ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Retrieving Transcription...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Retrieve Transcription
                        </>
                      )}
                    </Button>
                  );
                }
                return null;
              })()}

              {/* Bot Status Indicator */}
              {(() => {
                const hasBot = !!(event.botId || event.meetingBaasBotId);
                const hasTranscription = !!event.meetingBaasTranscription;
                if (hasBot) {
                  return (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                      <Bot className="h-4 w-4 text-primary" />
                      <span className="text-sm">
                        {hasTranscription
                          ? 'Transcription available'
                          : event.botStatus === 'in_meeting'
                            ? 'Bot is in meeting'
                            : 'Bot sent'}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Transcript Section */}
        {event.meetingBaasTranscription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Meeting Transcript
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {formatTranscription(event.meetingBaasTranscription)}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Follow-up Email Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Follow-up Email
              </CardTitle>
              {!followUpEmail && event.meetingBaasTranscription && (
                <Button onClick={handleGenerateEmail} disabled={isGeneratingEmail}>
                  {isGeneratingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    'Generate Email'
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {followUpEmail ? (
              <div className="bg-muted p-4 rounded-md">
                <pre className="whitespace-pre-wrap text-sm">{followUpEmail.content}</pre>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {event.meetingBaasTranscription
                  ? 'No follow-up email generated yet. Click "Generate Email" to create one.'
                  : 'No transcription available. Cannot generate follow-up email.'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Social Media Posts Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Social Media Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {automations && automations.length > 0 && event.meetingBaasTranscription && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Generate posts using your automations:</p>
                  <div className="flex flex-wrap gap-2">
                    {automations
                      .filter((a) => a.isActive)
                      .map((automation) => (
                        <Button
                          key={automation._id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleGeneratePost(automation._id)}
                          disabled={isGeneratingPost[automation._id]}
                        >
                          {isGeneratingPost[automation._id] ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            `Generate ${automation.name}`
                          )}
                        </Button>
                      ))}
                  </div>
                </div>
              )}

              {generatedPosts && generatedPosts.length > 0 ? (
                <div className="space-y-3">
                  {generatedPosts.map((post) => (
                    <div
                      key={post._id}
                      className="p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() =>
                        setSelectedPost({
                          _id: post._id,
                          content: post.content,
                          platform: post.platform,
                          status: post.status,
                        })
                      }
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium capitalize">{post.platform}</span>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {post.automationName}
                            </span>
                            {post.status === 'posted' && (
                              <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded">
                                Posted
                              </span>
                            )}
                            {post.status === 'failed' && (
                              <span className="text-xs bg-red-500/10 text-red-600 px-2 py-0.5 rounded">
                                Failed
                              </span>
                            )}
                          </div>
                          <p className="text-sm line-clamp-2">{post.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {event.meetingBaasTranscription
                    ? 'No social media posts generated yet. Use your automations to generate posts.'
                    : 'No transcription available. Cannot generate social media posts.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Post Preview Modal */}
      <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Draft post</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a post based on insights from this meeting.
              </p>
              <div className="bg-muted p-4 rounded-md">
                <pre className="whitespace-pre-wrap text-sm">{selectedPost?.content}</pre>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => selectedPost && handleCopyPost(selectedPost.content)}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedPost(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                {selectedPost && selectedPost.status === 'draft' && (
                  <Button
                    onClick={() => selectedPost && handlePost(selectedPost)}
                    disabled={isPosting[selectedPost._id]}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {isPosting[selectedPost._id] ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Post
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}

