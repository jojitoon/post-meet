'use client';

import { Authenticated, Unauthenticated, useMutation, useQuery, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import Link from 'next/link';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import type { User } from '@workos-inc/node';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  MapPin,
  Users,
  ExternalLink,
  Bot,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { detectMeetingPlatform, getPlatformName, type MeetingPlatform } from '@/app/utils/meetingPlatform';
import { toast } from 'sonner';

export default function Home() {
  return (
    <>
      <Header />
      <main className="p-8 flex flex-col gap-8">
        {/* <h1 className="text-4xl font-bold text-center">Convex + Next.js + WorkOS</h1> */}
        <Authenticated>
          <Content />
        </Authenticated>
        <Unauthenticated>
          <SignInForm />
        </Unauthenticated>
      </main>
    </>
  );
}

function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
      <Link href="/" className="text-lg font-semibold hover:underline">
        Post Meet
      </Link>
      {user && <UserMenu user={user} onSignOut={signOut} />}
    </header>
  );
}

function SignInForm() {
  return (
    <div className="flex flex-col gap-8 w-96 mx-auto">
      <h1 className="text-2xl font-bold">Welcome to Post Meet</h1>
      <div className="flex flex-row gap-2">
        <a href="/sign-in">
          <button className="bg-foreground text-background px-4 py-2 rounded-md">Sign in</button>
        </a>
        <a href="/sign-up">
          <button className="bg-background text-foreground border border-foreground px-4 py-2 rounded-md">
            Sign up
          </button>
        </a>
      </div>
    </div>
  );
}

function Content() {
  const upcomingEvents = useQuery(api.eventsQueries.getUpcomingEvents);
  const pastEvents = useQuery(api.eventsQueries.getPastEvents);
  const calendars = useQuery(api.calendars.listCalendars);
  const toggleNotetakerRequest = useMutation(api.eventsQueries.toggleNotetakerRequest);
  const refreshCalendarEvents = useMutation(api.eventsQueries.refreshCalendarEvents);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendBotToMeetingAction = useAction((api as any).botService.sendBotToMeetingManually);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recallBotAction = useAction((api as any).botService.recallBot);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{
    _id: string;
    title: string;
    startTime: string;
    endTime?: string;
    meetingLink?: string;
    location?: string;
    attendees?: string[];
    description?: string;
    notetakerRequested?: boolean | null;
    calendarName?: string;
    htmlLink?: string;
    botId?: string;
    meetingBaasBotId?: string;
    botStatus?: string;
    meetingBaasTranscription?: string;
  } | null>(null);
  const [transcriptionModalOpen, setTranscriptionModalOpen] = useState(false);
  const [selectedTranscription, setSelectedTranscription] = useState<string | null>(null);

  const handleToggleNotetaker = async (eventId: string, currentValue: boolean | null) => {
    try {
      await toggleNotetakerRequest({
        // @ts-expect-error - eventId is a string from the query result
        eventId: eventId,
        notetakerRequested: !(currentValue ?? false),
      });
    } catch (error) {
      console.error('Failed to toggle notetaker request:', error);
      toast.error('Failed to toggle notetaker request');
    }
  };

  const handleRefresh = async () => {
    if (!calendars || calendars.length === 0) {
      return;
    }

    setIsRefreshing(true);
    try {
      // Refresh all calendars
      await Promise.all(
        calendars.map((calendar) =>
          refreshCalendarEvents({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            calendarId: calendar._id as any,
          }),
        ),
      );
    } catch (error) {
      console.error('Failed to refresh calendars:', error);
      toast.error('Failed to refresh calendars');
    } finally {
      // Keep loading state for a bit to show feedback
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Upcoming Events
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || !calendars || calendars.length === 0}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingEvents === undefined ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No upcoming events for today</p>
              <Link href="/events" className="text-primary hover:underline mt-2 inline-block">
                View Calendar
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingEvents.map((event) => {
                const eventStart = new Date(event.startTime);
                const eventEnd = event.endTime ? new Date(event.endTime) : null;
                const now = new Date();
                const isCurrentlyHappening = eventStart <= now && eventEnd && eventEnd > now;

                return (
                  <EventCard
                    key={event._id}
                    event={event}
                    onToggleNotetaker={handleToggleNotetaker}
                    isCurrentlyHappening={isCurrentlyHappening}
                    onClick={() => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      setSelectedEvent(event as any);
                    }}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Events */}
      <Card>
        <CardHeader>
          <CardTitle>Past Events (Today)</CardTitle>
        </CardHeader>
        <CardContent>
          {pastEvents === undefined ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : pastEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No past events for today</div>
          ) : (
            <div className="space-y-4">
              {pastEvents.map((event) => (
                <Link key={event._id} href={`/meetings/${event._id}`} className="block">
                  <EventCard event={event} onToggleNotetaker={handleToggleNotetaker} isPast onClick={() => {}} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Details Modal */}
      <EventDetailsModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onToggleNotetaker={handleToggleNotetaker}
        sendBotToMeeting={sendBotToMeetingAction}
        recallBot={recallBotAction}
        onViewTranscription={(transcription) => {
          setSelectedTranscription(transcription);
          setTranscriptionModalOpen(true);
        }}
      />
      <TranscriptionModal
        open={transcriptionModalOpen}
        onClose={() => {
          setTranscriptionModalOpen(false);
          setSelectedTranscription(null);
        }}
        transcription={selectedTranscription}
        eventTitle={selectedEvent?.title}
      />
    </div>
  );
}

function EventCard({
  event,
  onToggleNotetaker,
  isPast = false,
  isCurrentlyHappening = false,
  onClick,
}: {
  event: {
    _id: string;
    title: string;
    startTime: string;
    endTime?: string;
    meetingLink?: string;
    location?: string;
    attendees?: string[];
    notetakerRequested?: boolean | null;
    calendarName?: string;
  };
  onToggleNotetaker: (eventId: string, currentValue: boolean | null) => void;
  isPast?: boolean;
  isCurrentlyHappening?: boolean | null;
  onClick?: () => void;
}) {
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
      month: 'short',
      day: 'numeric',
    });
  };

  const platform = detectMeetingPlatform(event.meetingLink);
  const platformName = getPlatformName(platform);

  const PlatformIcon = ({ platform }: { platform: MeetingPlatform }) => {
    switch (platform) {
      case 'zoom':
        return (
          <div className="h-4 w-4 rounded bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">
            Z
          </div>
        );
      case 'google-meet':
        return (
          <div className="h-4 w-4 rounded bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">
            G
          </div>
        );
      case 'microsoft-teams':
        return (
          <div className="h-4 w-4 rounded bg-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
            T
          </div>
        );
      default:
        return <Video className="h-4 w-4" />;
    }
  };

  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${isPast ? 'opacity-75 bg-muted/30' : isCurrentlyHappening ? 'bg-primary/10 border-primary' : 'bg-accent/50 border-primary/20'}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {/* {event.meetingLink && <PlatformIcon platform={platform} />} */}
                <h3 className="font-semibold text-lg">{event.title}</h3>
                {isCurrentlyHappening && (
                  <span className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded animate-pulse">
                    <span>●</span>
                    <span>Live</span>
                  </span>
                )}
              </div>
              {event.notetakerRequested && (
                <span className="inline-flex items-center gap-1 mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                  <span>✓</span>
                  <span>Notetaker requested</span>
                </span>
              )}
            </div>
            {!isPast && event.meetingLink && (
              <div className="flex items-center gap-2 bg-background/50 p-2 rounded-md border shrink-0">
                <span className="text-sm font-medium">Notetaker</span>
                <Switch
                  checked={!!event.notetakerRequested}
                  onCheckedChange={() => onToggleNotetaker(event._id, !!event.notetakerRequested)}
                />
              </div>
            )}
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                {formatDate(event.startTime)} • {formatTime(event.startTime)}
                {event.endTime && ` - ${formatTime(event.endTime)}`}
              </span>
            </div>
            {event.meetingLink && (
              <div className="flex items-center gap-2">
                <PlatformIcon platform={platform} />
                <a
                  href={event.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Join {platformName}
                </a>
              </div>
            )}
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium text-foreground mb-1">
                    {event.attendees.length} Attendee{event.attendees.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-xs space-y-0.5">
                    {event.attendees.slice(0, 3).map((attendee, index) => (
                      <div key={index} className="truncate">
                        {attendee}
                      </div>
                    ))}
                    {event.attendees.length > 3 && (
                      <div className="text-muted-foreground">+{event.attendees.length - 3} more</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{event.location}</span>
              </div>
            )}
            {event.calendarName && (
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 shrink-0" />
                <span>{event.calendarName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventDetailsModal({
  event,
  onClose,
  onToggleNotetaker,
  sendBotToMeeting,
  recallBot,
  onViewTranscription,
}: {
  event: {
    _id: string;
    title: string;
    startTime: string;
    endTime?: string;
    meetingLink?: string;
    location?: string;
    attendees?: string[];
    description?: string;
    notetakerRequested?: boolean | null;
    calendarName?: string;
    htmlLink?: string;
    botId?: string;
    meetingBaasBotId?: string;
    botStatus?: string;
    meetingBaasTranscription?: string;
  } | null;
  onClose: () => void;
  onToggleNotetaker: (eventId: string, currentValue: boolean | null) => void;
  sendBotToMeeting: (args: { eventId: string }) => Promise<{ success: boolean }>;
  recallBot: (args: { eventId: string }) => Promise<{ success: boolean }>;
  onViewTranscription?: (transcription: string) => void;
}) {
  const [isSendingBot, setIsSendingBot] = useState(false);
  const [isRecallingBot, setIsRecallingBot] = useState(false);

  if (!event) return null;

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

  const handleSendNotetakerBot = async () => {
    if (!event.notetakerRequested) {
      // First toggle the notetaker request on
      await onToggleNotetaker(event._id, false);
    }

    setIsSendingBot(true);
    try {
      await sendBotToMeeting({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: event._id as any,
      });
      toast.success('Notetaker bot will join the meeting at the scheduled time!');
    } catch (error) {
      console.error('Failed to send notetaker bot:', error);
      toast.error('Failed to send notetaker bot. Please try again.');
    } finally {
      setIsSendingBot(false);
    }
  };

  const handleRecallBot = async () => {
    setIsRecallingBot(true);
    try {
      await recallBot({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: event._id as any,
      });
      toast.success('Bot transcription retrieved successfully!');
    } catch (error) {
      console.error('Failed to recall bot:', error);
      toast.error('Failed to recall bot. Please try again.');
    } finally {
      setIsRecallingBot(false);
    }
  };

  // Check if bot has been sent
  const hasBot = !!(event.botId || event.meetingBaasBotId);

  const eventStart = new Date(event.startTime);
  const eventEnd = event.endTime ? new Date(event.endTime) : null;
  const now = new Date();
  const isCurrentlyHappening = eventStart <= now && eventEnd && eventEnd > now;
  const isUpcoming = eventStart > now;

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <DialogTitle className="text-2xl">{event.title}</DialogTitle>
                {isCurrentlyHappening && (
                  <span className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded animate-pulse">
                    <span>●</span>
                    <span>Live</span>
                  </span>
                )}
                {isUpcoming && !isCurrentlyHappening && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                    <span>Upcoming</span>
                  </span>
                )}
              </div>
              {event.notetakerRequested && (
                <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  <span>✓</span>
                  <span>Notetaker requested</span>
                </span>
              )}
            </div>
          </div>
        </DialogHeader>
        <DialogDescription className="space-y-4 pt-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{formatDate(event.startTime)}</p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(event.startTime)}
                  {event.endTime && ` - ${formatTime(event.endTime)}`}
                </p>
              </div>
            </div>

            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">{event.location}</p>
                </div>
              </div>
            )}

            {event.meetingLink && (
              <div className="flex items-start gap-3">
                <Video className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Meeting Link</p>
                  <a
                    href={event.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {event.meetingLink.includes('zoom') ? 'Join Zoom Meeting' : 'Join Google Meet'}
                  </a>
                </div>
              </div>
            )}

            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {event.attendees.length} Attendee{event.attendees.length !== 1 ? 's' : ''}
                  </p>
                  <div className="text-sm text-muted-foreground mt-1">
                    {event.attendees.map((attendee, index) => (
                      <p key={index}>{attendee}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {event.calendarName && (
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Calendar</p>
                  <p className="text-sm text-muted-foreground">{event.calendarName}</p>
                </div>
              </div>
            )}

            {event.description && (
              <div>
                <p className="font-medium mb-2">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t">
            {event.meetingLink && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Request Notetaker</span>
                  <Switch
                    checked={!!event.notetakerRequested}
                    onCheckedChange={() => onToggleNotetaker(event._id, !!event.notetakerRequested)}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {isUpcoming || isCurrentlyHappening ? (
                hasBot ? (
                  <button
                    onClick={handleRecallBot}
                    disabled={isRecallingBot}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Bot className="h-4 w-4" />
                    {isRecallingBot ? 'Retrieving...' : 'Recall Bot'}
                  </button>
                ) : (
                  <button
                    onClick={handleSendNotetakerBot}
                    disabled={isSendingBot || !event.meetingLink}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Bot className="h-4 w-4" />
                    {isSendingBot ? 'Sending...' : 'Send Notetaker Bot'}
                  </button>
                )
              ) : null}

              {event.htmlLink && (
                <button
                  onClick={() => window.open(event.htmlLink, '_blank')}
                  className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Calendar
                </button>
              )}
            </div>

            {/* Transcription Section */}
            {event.meetingBaasTranscription && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Transcription Available</span>
                  </div>
                  {onViewTranscription && (
                    <button
                      onClick={() => onViewTranscription(event.meetingBaasTranscription!)}
                      className="text-sm text-primary hover:underline"
                    >
                      View Full Transcription
                    </button>
                  )}
                </div>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                  {(() => {
                    try {
                      const transcriptData = JSON.parse(event.meetingBaasTranscription);
                      if (Array.isArray(transcriptData)) {
                        return transcriptData.slice(0, 2).map(
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
                            const spokenText = words
                              .map((word) => word.text || '')
                              .join(' ')
                              .trim();
                            const preview = spokenText.substring(0, 100) + (spokenText.length > 100 ? '...' : '');

                            return (
                              <div key={item.id || idx} className="mb-2">
                                {item.speaker && (
                                  <span className="font-semibold text-primary text-xs">{item.speaker}: </span>
                                )}
                                <span>{preview || 'No transcription available'}</span>
                              </div>
                            );
                          },
                        );
                      }
                      return (
                        transcriptData.text ||
                        transcriptData.transcript ||
                        event.meetingBaasTranscription.substring(0, 200) + '...'
                      );
                    } catch {
                      return event.meetingBaasTranscription.substring(0, 200) + '...';
                    }
                  })()}
                </div>
              </div>
            )}
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

function TranscriptionModal({
  open,
  onClose,
  transcription,
  eventTitle,
}: {
  open: boolean;
  onClose: () => void;
  transcription: string | null;
  eventTitle?: string;
}) {
  if (!transcription) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTranscription = () => {
    try {
      const transcriptData = JSON.parse(transcription);
      if (Array.isArray(transcriptData)) {
        return transcriptData.map(
          (
            item: {
              id?: number;
              speaker?: string;
              start_time?: number;
              words?: Array<{ text?: string; start_time?: number; end_time?: number }>;
            },
            idx: number,
          ) => {
            // Extract words and combine them into readable text
            const words = item.words || [];
            const spokenText = words
              .map((word) => word.text || '')
              .join(' ')
              .trim();

            // Format start time
            const timeDisplay = item.start_time !== undefined ? formatTime(item.start_time) : '';

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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Meeting Transcription
            {eventTitle && <span className="text-muted-foreground font-normal">- {eventTitle}</span>}
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="pt-4">
          <div className="space-y-2">{formatTranscription()}</div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

function UserMenu({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <Link href="/events" className="text-sm underline hover:no-underline">
        Events
      </Link>
      <Link href="/settings" className="text-sm underline hover:no-underline">
        Settings
      </Link>
      <span className="text-sm">{user.email}</span>
      <button onClick={onSignOut} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600">
        Sign out
      </button>
    </div>
  );
}
