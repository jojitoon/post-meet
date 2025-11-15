'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@workos-inc/authkit-nextjs/components';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Trash2, Plus, Calendar as CalendarIcon, Bot } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const calendars = useQuery(api.calendars.listCalendars);
  const removeCalendar = useMutation(api.calendars.removeCalendar);
  const userSettings = useQuery(api.userSettings.getUserSettings);
  const updateUserSettings = useMutation(api.userSettings.updateUserSettings);
  const [botJoinMinutes, setBotJoinMinutes] = useState<number>(5);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (userSettings) {
      setBotJoinMinutes(userSettings.botJoinMinutesBefore || 5);
    }
  }, [userSettings]);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'calendar_added') {
      setMessage({ type: 'success', text: 'Calendar added successfully!' });
      // Clear the URL parameter
      router.replace('/settings');
    } else if (error) {
      const errorMessages: Record<string, string> = {
        unauthorized: 'You must be logged in to add calendars',
        missing_code: 'Authorization code missing',
        invalid_state: 'Invalid authorization state',
        invalid_user: 'User mismatch',
        config_error: 'Configuration error',
        no_tokens: 'Failed to get access tokens',
        no_calendar: 'No calendar found',
        auth_failed: 'Authentication failed',
        save_failed: 'Failed to save calendar',
        oauth_error: 'OAuth error occurred',
      };
      setMessage({
        type: 'error',
        text: errorMessages[error] || 'An error occurred',
      });
      router.replace('/settings');
    }
  }, [searchParams, router]);

  const handleAddCalendar = () => {
    window.location.href = '/api/google/oauth';
  };

  const handleRemoveCalendar = async (calendarId: string) => {
    if (confirm('Are you sure you want to remove this calendar?')) {
      try {
        // @ts-expect-error - calendarId is a string from the query result
        await removeCalendar({ calendarId: calendarId });
        setMessage({ type: 'success', text: 'Calendar removed successfully!' });
      } catch {
        setMessage({ type: 'error', text: 'Failed to remove calendar' });
      }
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <Link href="/" className="text-lg font-semibold hover:underline">
          Post Meet
        </Link>
        {user && (
          <div className="flex items-center gap-2">
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
      <div className="container mx-auto p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your connected calendars</p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-md ${
              message.type === 'success'
                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Connected Calendars</CardTitle>
                <CardDescription>Add Google calendars from different email accounts to sync events</CardDescription>
              </div>
              <Button onClick={handleAddCalendar} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Calendar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {calendars === undefined ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : calendars.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No calendars connected yet</p>
                <Button onClick={handleAddCalendar} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Calendar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {calendars.map((calendar) => (
                  <div
                    key={calendar._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {calendar.calendarName}
                          {calendar.isPrimary && (
                            <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">{calendar.email}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCalendar(calendar._id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <CardTitle>Notetaker Bot Settings</CardTitle>
            </div>
            <CardDescription>Configure when the notetaker bot should join your meetings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="botJoinMinutes">Join Meeting (minutes before start)</Label>
                <Input
                  id="botJoinMinutes"
                  type="number"
                  min="0"
                  max="60"
                  value={botJoinMinutes}
                  onChange={(e) => setBotJoinMinutes(parseInt(e.target.value) || 0)}
                  placeholder="5"
                />
                <p className="text-sm text-muted-foreground">
                  The bot will join your meeting this many minutes before it starts. Default is 5 minutes.
                </p>
              </div>
              <Button
                onClick={async () => {
                  setIsSavingSettings(true);
                  try {
                    await updateUserSettings({ botJoinMinutesBefore: botJoinMinutes });
                    setMessage({ type: 'success', text: 'Settings saved successfully!' });
                  } catch {
                    setMessage({ type: 'error', text: 'Failed to save settings' });
                  } finally {
                    setIsSavingSettings(false);
                  }
                }}
                disabled={isSavingSettings}
              >
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
