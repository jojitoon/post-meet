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
import { Trash2, Plus, Calendar as CalendarIcon, Bot, Share2, Settings as SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const calendars = useQuery(api.calendars.listCalendars);
  const removeCalendar = useMutation(api.calendars.removeCalendar);
  const userSettings = useQuery(api.userSettings.getUserSettings);
  const updateUserSettings = useMutation(api.userSettings.updateUserSettings);
  const socialMediaConnections = useQuery(api.socialMedia.getSocialMediaConnections);
  const removeSocialMediaConnection = useMutation(api.socialMedia.removeSocialMediaConnection);
  const automations = useQuery(api.automations.getAutomations);
  const createAutomation = useMutation(api.automations.createAutomation);
  const updateAutomation = useMutation(api.automations.updateAutomation);
  const deleteAutomation = useMutation(api.automations.deleteAutomation);
  const [botJoinMinutes, setBotJoinMinutes] = useState<number>(5);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [automationModalOpen, setAutomationModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('linkedin');
  const [editingAutomation, setEditingAutomation] = useState<{
    _id?: string;
    name: string;
    type: string;
    platform: string;
    description: string;
    example: string;
    isActive: boolean;
  } | null>(null);

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
      router.replace('/settings');
    } else if (success === 'linkedin_connected') {
      setMessage({ type: 'success', text: 'LinkedIn connected successfully!' });
      router.replace('/settings');
    } else if (success === 'facebook_connected') {
      setMessage({ type: 'success', text: 'Facebook connected successfully!' });
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

  const handleConnectLinkedIn = () => {
    window.location.href = '/api/linkedin/oauth';
  };

  const handleConnectFacebook = () => {
    window.location.href = '/api/facebook/oauth';
  };

  const handleRemoveSocialMedia = async (connectionId: string) => {
    if (confirm('Are you sure you want to disconnect this account?')) {
      try {
        await removeSocialMediaConnection({ connectionId: connectionId as any });
        setMessage({ type: 'success', text: 'Account disconnected successfully!' });
      } catch {
        setMessage({ type: 'error', text: 'Failed to disconnect account' });
      }
    }
  };

  const handleSaveAutomation = async () => {
    if (!editingAutomation) return;

    try {
      if (editingAutomation._id) {
        await updateAutomation({
          automationId: editingAutomation._id as any,
          name: editingAutomation.name,
          type: editingAutomation.type,
          platform: editingAutomation.platform,
          description: editingAutomation.description,
          example: editingAutomation.example,
          isActive: editingAutomation.isActive,
        });
        setMessage({ type: 'success', text: 'Automation updated successfully!' });
      } else {
        await createAutomation({
          name: editingAutomation.name,
          type: editingAutomation.type,
          platform: editingAutomation.platform,
          description: editingAutomation.description,
          example: editingAutomation.example,
          isActive: editingAutomation.isActive,
        });
        setMessage({ type: 'success', text: 'Automation created successfully!' });
      }
      setAutomationModalOpen(false);
      setEditingAutomation(null);
    } catch {
      setMessage({ type: 'error', text: 'Failed to save automation' });
    }
  };

  const handleDeleteAutomation = async (automationId: string) => {
    if (confirm('Are you sure you want to delete this automation?')) {
      try {
        await deleteAutomation({ automationId: automationId as any });
        setMessage({ type: 'success', text: 'Automation deleted successfully!' });
      } catch {
        setMessage({ type: 'error', text: 'Failed to delete automation' });
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

        {/* Social Media Connections & Automations */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Social Media
            </CardTitle>
            <CardDescription>
              Connect your accounts and configure how content is generated for each platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
                <TabsTrigger value="facebook">Facebook</TabsTrigger>
              </TabsList>

              {/* LinkedIn Tab */}
              <TabsContent value="linkedin" className="space-y-6 mt-6">
                {/* Connection Status */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-blue-600 flex items-center justify-center text-white font-bold">
                        in
                      </div>
                      <div>
                        <div className="font-medium">LinkedIn Account</div>
                        <div className="text-sm text-muted-foreground">
                          {socialMediaConnections?.find((c) => c.platform === 'linkedin')
                            ? `Connected as ${socialMediaConnections.find((c) => c.platform === 'linkedin')?.profileName || 'LinkedIn'}`
                            : 'Not connected'}
                        </div>
                      </div>
                    </div>
                    {socialMediaConnections?.find((c) => c.platform === 'linkedin') ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveSocialMedia(
                            socialMediaConnections.find((c) => c.platform === 'linkedin')!._id,
                          )
                        }
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Disconnect
                      </Button>
                    ) : (
                      <Button onClick={handleConnectLinkedIn} variant="outline">
                        Connect LinkedIn
                      </Button>
                    )}
                  </div>
                </div>

                {/* LinkedIn Automations */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Content Generation</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure how LinkedIn posts are generated from your meetings
                      </p>
                    </div>
                    <Button
                onClick={() => {
                  setEditingAutomation({
                    name: '',
                    type: 'Generate post',
                    platform: activeTab === 'linkedin' ? 'LinkedIn post' : 'Facebook post',
                    description: '',
                    example: '',
                    isActive: true,
                  });
                  setAutomationModalOpen(true);
                }}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Automation
                    </Button>
                  </div>

                  {automations === undefined ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : automations.filter((a) => a.platform === 'LinkedIn post').length === 0 ? (
                    <div className="text-center py-8 border rounded-lg">
                      <SettingsIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No automations configured for LinkedIn</p>
                      <Button
                onClick={() => {
                  setEditingAutomation({
                    name: '',
                    type: 'Generate post',
                    platform: activeTab === 'linkedin' ? 'LinkedIn post' : 'Facebook post',
                    description: '',
                    example: '',
                    isActive: true,
                  });
                  setAutomationModalOpen(true);
                }}
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Automation
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {automations
                        .filter((a) => a.platform === 'LinkedIn post')
                        .map((automation) => (
                          <div
                            key={automation._id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-medium">{automation.name}</div>
                                {automation.isActive ? (
                                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded">
                                    Active
                                  </span>
                                ) : (
                                  <span className="text-xs bg-gray-500/10 text-gray-600 px-2 py-0.5 rounded">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground line-clamp-2">
                                {automation.description}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingAutomation({
                                    _id: automation._id,
                                    name: automation.name,
                                    type: automation.type,
                                    platform: automation.platform,
                                    description: automation.description,
                                    example: automation.example || '',
                                    isActive: automation.isActive,
                                  });
                                  setAutomationModalOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAutomation(automation._id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Facebook Tab */}
              <TabsContent value="facebook" className="space-y-6 mt-6">
                {/* Connection Status */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-blue-500 flex items-center justify-center text-white font-bold">
                        f
                      </div>
                      <div>
                        <div className="font-medium">Facebook Account</div>
                        <div className="text-sm text-muted-foreground">
                          {socialMediaConnections?.find((c) => c.platform === 'facebook')
                            ? `Connected as ${socialMediaConnections.find((c) => c.platform === 'facebook')?.profileName || 'Facebook'}`
                            : 'Not connected'}
                        </div>
                      </div>
                    </div>
                    {socialMediaConnections?.find((c) => c.platform === 'facebook') ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleRemoveSocialMedia(
                            socialMediaConnections.find((c) => c.platform === 'facebook')!._id,
                          )
                        }
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Disconnect
                      </Button>
                    ) : (
                      <Button onClick={handleConnectFacebook} variant="outline">
                        Connect Facebook
                      </Button>
                    )}
                  </div>
                </div>

                {/* Facebook Automations */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Content Generation</h3>
                      <p className="text-sm text-muted-foreground">
                        Configure how Facebook posts are generated from your meetings
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setEditingAutomation({
                          name: '',
                          type: 'Generate post',
                          platform: 'Facebook post',
                          description: '',
                          example: '',
                          isActive: true,
                        });
                        setAutomationModalOpen(true);
                      }}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Automation
                    </Button>
                  </div>

                  {automations === undefined ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                  ) : automations.filter((a) => a.platform === 'Facebook post').length === 0 ? (
                    <div className="text-center py-8 border rounded-lg">
                      <SettingsIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">No automations configured for Facebook</p>
                      <Button
                        onClick={() => {
                          setEditingAutomation({
                            name: '',
                            type: 'Generate post',
                            platform: 'Facebook post',
                            description: '',
                            example: '',
                            isActive: true,
                          });
                          setAutomationModalOpen(true);
                        }}
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Automation
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {automations
                        .filter((a) => a.platform === 'Facebook post')
                        .map((automation) => (
                          <div
                            key={automation._id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-medium">{automation.name}</div>
                                {automation.isActive ? (
                                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded">
                                    Active
                                  </span>
                                ) : (
                                  <span className="text-xs bg-gray-500/10 text-gray-600 px-2 py-0.5 rounded">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground line-clamp-2">
                                {automation.description}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingAutomation({
                                    _id: automation._id,
                                    name: automation.name,
                                    type: automation.type,
                                    platform: automation.platform,
                                    description: automation.description,
                                    example: automation.example || '',
                                    isActive: automation.isActive,
                                  });
                                  setAutomationModalOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAutomation(automation._id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Automation Modal */}
      <Dialog open={automationModalOpen} onOpenChange={setAutomationModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Do this...</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="automation-name">Name</Label>
                <Input
                  id="automation-name"
                  value={editingAutomation?.name || ''}
                  onChange={(e) =>
                    setEditingAutomation((prev) => (prev ? { ...prev, name: e.target.value } : null))
                  }
                  placeholder="Generate LinkedIn post"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="automation-type">Type</Label>
                <Input
                  id="automation-type"
                  value={editingAutomation?.type || ''}
                  onChange={(e) =>
                    setEditingAutomation((prev) => (prev ? { ...prev, type: e.target.value } : null))
                  }
                  placeholder="Generate post"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="automation-platform">Platform</Label>
                <Select
                  value={editingAutomation?.platform || (activeTab === 'linkedin' ? 'LinkedIn post' : 'Facebook post')}
                  onValueChange={(value) =>
                    setEditingAutomation((prev) => (prev ? { ...prev, platform: value } : null))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LinkedIn post">LinkedIn post</SelectItem>
                    <SelectItem value="Facebook post">Facebook post</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="automation-description">Description</Label>
                <Textarea
                  id="automation-description"
                  value={editingAutomation?.description || ''}
                  onChange={(e) =>
                    setEditingAutomation((prev) => (prev ? { ...prev, description: e.target.value } : null))
                  }
                  placeholder="1. Draft a LinkedIn post (120-180 words) that summarizes the meeting value in first person.&#10;2. Use a warm, conversational tone consistent with an experienced financial advisor.&#10;3. End with up to three hashtags.&#10;&#10;Return only the post text."
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="automation-example">Example</Label>
                <Textarea
                  id="automation-example"
                  value={editingAutomation?.example || ''}
                  onChange={(e) =>
                    setEditingAutomation((prev) => (prev ? { ...prev, example: e.target.value } : null))
                  }
                  placeholder="Example output..."
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="automation-active">Active</Label>
                  <Switch
                    id="automation-active"
                    checked={editingAutomation?.isActive || false}
                    onCheckedChange={(checked) =>
                      setEditingAutomation((prev) => (prev ? { ...prev, isActive: checked } : null))
                    }
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveAutomation} className="flex-1 bg-green-600 hover:bg-green-700">
                  Save & close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAutomationModalOpen(false);
                    setEditingAutomation(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                {editingAutomation?._id && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (editingAutomation._id) {
                        handleDeleteAutomation(editingAutomation._id);
                        setAutomationModalOpen(false);
                        setEditingAutomation(null);
                      }
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
}
