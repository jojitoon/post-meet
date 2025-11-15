'use client';

import { useQuery, useMutation, useAction, Authenticated, Unauthenticated } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  RefreshCw,
  MapPin,
  Users,
  Clock,
  Video,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Bot,
} from 'lucide-react';
import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { detectMeetingPlatform, getPlatformName, type MeetingPlatform } from '@/app/utils/meetingPlatform';

export default function EventsPage() {
  const { user, signOut } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold hover:underline">
            Post Meet
          </Link>
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <Link href="/settings" className="text-sm hover:underline">
              Settings
            </Link>
            <span className="text-sm">{user.email}</span>
            <button
              onClick={() => {
                void signOut();
              }}
              className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600"
            >
              Sign out
            </button>
          </div>
        )}
      </header>
      <Authenticated>
        <EventsContent />
      </Authenticated>
      <Unauthenticated>
        <div className="container mx-auto p-8 max-w-6xl">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">Please sign in to view your events</p>
                <Link href="/sign-in">
                  <Button>Sign In</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </Unauthenticated>
    </>
  );
}

function EventsContent() {
  const events = useQuery(api.eventsQueries.listEvents, { limit: 200 });
  const calendars = useQuery(api.calendars.listCalendars);
  const refreshCalendarEvents = useMutation(api.eventsQueries.refreshCalendarEvents);
  const toggleNotetakerRequest = useMutation(api.eventsQueries.toggleNotetakerRequest);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendBotToMeetingAction = useAction((api as any).botService.sendBotToMeetingManually);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('all');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{
    _id: string;
    calendarId: string;
    title: string;
    startTime: string;
    endTime?: string;
    meetingLink?: string;
    location?: string;
    attendees?: string[];
    description?: string;
    notetakerRequested?: boolean;
    htmlLink?: string;
  } | null>(null);

  const handleRefresh = async () => {
    if (selectedCalendarId === 'all' || !selectedCalendarId) {
      // Refresh all calendars
      if (calendars) {
        for (const calendar of calendars) {
          await refreshCalendarEvents({ calendarId: calendar._id });
        }
      }
      return;
    }

    setIsRefreshing(true);
    try {
      await refreshCalendarEvents({
        // @ts-expect-error - selectedCalendarId is a string from select
        calendarId: selectedCalendarId,
      });
    } catch (error) {
      console.error('Failed to refresh calendar:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const formatDay = (date: Date) => {
    return date.getDate();
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) >= new Date();
  };

  // Filter events by selected calendar and upcoming
  const filteredEvents =
    events?.filter((event) => {
      const isUpcomingEvent = isUpcoming(event.startTime);
      const matchesCalendar = selectedCalendarId === 'all' || event.calendarId === selectedCalendarId;
      return isUpcomingEvent && matchesCalendar;
    }) || [];

  // Group events by date
  const eventsByDate = filteredEvents.reduce(
    (acc, event) => {
      const eventDate = new Date(event.startTime);
      const dateKey = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    },
    {} as Record<string, typeof filteredEvents>,
  );

  // Get calendar month view
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{ date: Date; events: typeof filteredEvents }> = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: new Date(year, month, -startingDayOfWeek + i + 1), events: [] });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = `${year}-${month}-${day}`;
      days.push({
        date,
        events: eventsByDate[dateKey] || [],
      });
    }

    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const calendarDays = getCalendarDays();
  const selectedCalendar = calendars?.find((c) => c._id === selectedCalendarId);

  const handleToggleNotetaker = async (eventId: string, currentValue: boolean) => {
    try {
      await toggleNotetakerRequest({
        // @ts-expect-error - eventId is a string from the query result
        eventId: eventId,
        notetakerRequested: !currentValue,
      });
    } catch (error) {
      console.error('Failed to toggle notetaker request:', error);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Calendar</h1>
        <p className="text-muted-foreground">View upcoming events and request notetakers</p>
      </div>

      {calendars === undefined ? (
        <div className="text-center py-8 text-muted-foreground">Loading calendars...</div>
      ) : calendars.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No calendars connected yet</p>
              <Link href="/settings">
                <Button variant="outline">Go to Settings</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters and Controls */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Filter by Calendar</label>
                  <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select calendar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Calendars</SelectItem>
                      {calendars.map((calendar) => (
                        <SelectItem key={calendar._id} value={calendar._id}>
                          {calendar.calendarName} ({calendar.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleRefresh} disabled={isRefreshing || !selectedCalendarId} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh {selectedCalendarId === 'all' ? 'All' : selectedCalendar?.calendarName}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar View */}
          {events === undefined ? (
            <div className="text-center py-8 text-muted-foreground">Loading events...</div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{monthName}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, index) => {
                    const isCurrentMonth = day.date.getMonth() === currentDate.getMonth();
                    const isToday = day.date.toDateString() === new Date().toDateString();
                    const hasEvents = day.events.length > 0;

                    return (
                      <div
                        key={index}
                        className={`border rounded-lg p-2 ${
                          !isCurrentMonth ? 'opacity-30' : ''
                        } ${isToday ? 'bg-primary/5 border-primary' : 'bg-background'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                            {formatDay(day.date)}
                          </span>
                          {hasEvents && (
                            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                              {day.events.length}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {day.events.map((event) => (
                            <EventCard
                              key={event._id}
                              event={event}
                              calendars={calendars || []}
                              onToggleNotetaker={handleToggleNotetaker}
                              onCardClick={() => setSelectedEvent(event)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          calendars={calendars || []}
          onClose={() => setSelectedEvent(null)}
          onToggleNotetaker={handleToggleNotetaker}
          sendBotToMeeting={sendBotToMeetingAction}
        />
      )}
    </div>
  );
}

function EventCard({
  event,
  calendars,
  onToggleNotetaker,
  onCardClick,
}: {
  event: {
    _id: string;
    calendarId: string;
    title: string;
    startTime: string;
    endTime?: string;
    meetingLink?: string;
    location?: string;
    attendees?: string[];
    description?: string;
    notetakerRequested?: boolean;
    htmlLink?: string;
  };
  calendars: Array<{ _id: string; calendarName: string; email: string }>;
  onToggleNotetaker: (eventId: string, currentValue: boolean) => void;
  onCardClick?: () => void;
}) {
  const calendar = calendars.find((c) => c._id === event.calendarId);
  const platform = detectMeetingPlatform(event.meetingLink);
  const platformName = getPlatformName(platform);

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

  const PlatformIcon = ({ platform, size = 'sm' }: { platform: MeetingPlatform; size?: 'sm' | 'md' }) => {
    const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
    const textSize = size === 'sm' ? 'text-[8px]' : 'text-[10px]';

    switch (platform) {
      case 'zoom':
        return (
          <div
            className={`${iconSize} rounded bg-blue-500 flex items-center justify-center text-white ${textSize} font-bold`}
          >
            Z
          </div>
        );
      case 'google-meet':
        return (
          <div
            className={`${iconSize} rounded bg-green-500 flex items-center justify-center text-white ${textSize} font-bold`}
          >
            G
          </div>
        );
      case 'microsoft-teams':
        return (
          <div
            className={`${iconSize} rounded bg-purple-500 flex items-center justify-center text-white ${textSize} font-bold`}
          >
            T
          </div>
        );
      default:
        return <Video className={iconSize} />;
    }
  };

  return (
    <Card
      className="p-2 hover:bg-accent transition-colors border-primary/20 cursor-pointer"
      onClick={() => onCardClick?.()}
    >
      <CardContent className="p-0">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                {/* {event.meetingLink && <PlatformIcon platform={platform} size="sm" />} */}
                <h4 className="text-xs font-semibold line-clamp-2">{event.title}</h4>
              </div>
              {event.notetakerRequested && (
                <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  <span>✓</span>
                  <span>Notetaker</span>
                </span>
              )}
            </div>
            <Switch
              checked={event.notetakerRequested || false}
              onCheckedChange={() => onToggleNotetaker(event._id, event.notetakerRequested || false)}
              className="h-3 w-6 shrink-0"
            />
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {formatTime(event.startTime)}
                {event.endTime && ` - ${formatTime(event.endTime)}`}
              </span>
            </div>
            {event.meetingLink && (
              <div className="flex items-center gap-1">
                <PlatformIcon platform={platform} size="sm" />
                <a
                  href={event.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  Join {platformName}
                </a>
              </div>
            )}
            {event.attendees && event.attendees.length > 0 && (
              <div className="flex items-start gap-1">
                <Users className="h-3 w-3 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">
                    {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                  </div>
                  <div className="text-[10px] space-y-0.5 mt-0.5">
                    {event.attendees.slice(0, 2).map((attendee, index) => (
                      <div key={index} className="truncate">
                        {attendee}
                      </div>
                    ))}
                    {event.attendees.length > 2 && (
                      <div className="text-muted-foreground">+{event.attendees.length - 2} more</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
            {calendar && (
              <div className="flex items-center gap-1 text-xs">
                <CalendarIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">{calendar.calendarName}</span>
              </div>
            )}
            {event.description && <p className="text-xs line-clamp-2 mt-1">{event.description}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EventDetailsModal({
  event,
  calendars,
  onClose,
  onToggleNotetaker,
  sendBotToMeeting,
}: {
  event: {
    _id: string;
    calendarId: string;
    title: string;
    startTime: string;
    endTime?: string;
    meetingLink?: string;
    location?: string;
    attendees?: string[];
    description?: string;
    notetakerRequested?: boolean;
    htmlLink?: string;
  } | null;
  calendars: Array<{ _id: string; calendarName: string; email: string }>;
  onClose: () => void;
  onToggleNotetaker: (eventId: string, currentValue: boolean) => Promise<void>;
  sendBotToMeeting: (args: { eventId: string }) => Promise<{ success: boolean }>;
}) {
  const [isSendingBot, setIsSendingBot] = useState(false);

  if (!event) return null;

  const calendar = calendars.find((c) => c._id === event.calendarId);

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
      await onToggleNotetaker(event._id, false);
    }

    setIsSendingBot(true);
    try {
      await sendBotToMeeting({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        eventId: event._id as any,
      });
      alert('Notetaker bot will join the meeting at the scheduled time!');
    } catch (error) {
      console.error('Failed to send notetaker bot:', error);
      alert('Failed to send notetaker bot. Please try again.');
    } finally {
      setIsSendingBot(false);
    }
  };

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
                {(() => {
                  const platform = detectMeetingPlatform(event.meetingLink);
                  const platformName = getPlatformName(platform);
                  return (
                    <>
                      {platform === 'zoom' ? (
                        <div className="h-5 w-5 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                          Z
                        </div>
                      ) : platform === 'google-meet' ? (
                        <div className="h-5 w-5 rounded bg-green-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                          G
                        </div>
                      ) : platform === 'microsoft-teams' ? (
                        <div className="h-5 w-5 rounded bg-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                          T
                        </div>
                      ) : (
                        <Video className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-medium">Meeting Link</p>
                        <a
                          href={event.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Join {platformName}
                        </a>
                      </div>
                    </>
                  );
                })()}
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

            {calendar && (
              <div className="flex items-center gap-3">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Calendar</p>
                  <p className="text-sm text-muted-foreground">{calendar.calendarName}</p>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Request Notetaker</span>
                <Switch
                  checked={!!event.notetakerRequested}
                  onCheckedChange={() => onToggleNotetaker(event._id, !!event.notetakerRequested)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              {isUpcoming || isCurrentlyHappening ? (
                <button
                  onClick={handleSendNotetakerBot}
                  disabled={isSendingBot || !event.meetingLink}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Bot className="h-4 w-4" />
                  {isSendingBot ? 'Sending...' : 'Send Notetaker Bot'}
                </button>
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
          </div>
        </DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
