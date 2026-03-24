/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectItemWithDescription,
  SelectTrigger,
  SelectValue,
  StickySaveBar,
  Switch,
} from '@plunk/ui';
import type {Campaign, Segment} from '@plunk/db';
import {CampaignAudienceType, CampaignStatus} from '@plunk/db';
import {CampaignSchemas} from '@plunk/shared';
import {DashboardLayout} from '../../components/DashboardLayout';
import {EmailSettings} from '../../components/EmailSettings';
import {EmailEditor} from '../../components/EmailEditor';
import {network} from '../../lib/network';
import {formatFullDateTime, formatUTCDateTime, getUserTimezone, schedulePresets} from '../../lib/dateUtils';
import {useChangeTracking} from '../../lib/hooks/useChangeTracking';
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Info,
  Mail,
  MousePointer,
  Save,
  Send,
  TestTube,
  Trash2,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';
import {useActiveProject} from '../../lib/contexts/ActiveProjectProvider';

interface CampaignStats {
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  deliveryRate: number;
}

export default function CampaignDetailsPage() {
  const router = useRouter();
  const {id} = router.query;
  const {activeProject} = useActiveProject();

  const {
    data: campaign,
    mutate,
    isLoading,
  } = useSWR<{data: Campaign}>(id ? `/campaigns/${id}` : null, {revalidateOnFocus: false});

  const {data: stats} = useSWR<{data: CampaignStats}>(
    id && campaign?.data.status !== CampaignStatus.DRAFT ? `/campaigns/${id}/stats` : null,
    {
      revalidateOnFocus: false,
      refreshInterval: campaign?.data.status === CampaignStatus.SENDING ? 15000 : 0, // Refresh every 15s while sending
    },
  );

  // Fetch segments for audience selection
  const {data: segments} = useSWR<Segment[]>('/segments', {
    revalidateOnFocus: false,
  });

  // Fetch project members for test email
  const {data: projectMembers} = useSWR<{data: Array<{userId: string; email: string; role: string}>}>(
    id && campaign?.data.projectId ? `/projects/${campaign.data.projectId}/members` : null,
    {revalidateOnFocus: false},
  );

  const [editedCampaign, setEditedCampaign] = useState<Partial<Campaign>>({});
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [isTestEmailDialogOpen, setIsTestEmailDialogOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Automatically initialize edit fields when campaign is loaded and is a draft
  const isEditMode = campaign?.data.status === CampaignStatus.DRAFT;

  const handleCancel = async () => {
    try {
      await network.fetch('POST', `/campaigns/${id}/cancel`);
      toast.success('Campaign cancelled successfully');
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel campaign');
    }
  };

  const handleDelete = async () => {
    try {
      await network.fetch('DELETE', `/campaigns/${id}`);
      toast.success('Campaign deleted successfully');
      void router.push('/campaigns');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete campaign');
    }
  };

  const handleSend = async () => {
    try {
      await network.fetch<void>('POST', `/campaigns/${id}/send`);
      toast.success('Campaign is being sent!');
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send campaign');
    }
  };

  const handleSchedule = async () => {
    if (!scheduledDateTime) {
      toast.error('Please select a date and time');
      return;
    }

    // Parse the datetime-local value as local time, then convert to UTC
    const scheduledDate = new Date(scheduledDateTime);
    const now = new Date();

    if (scheduledDate.getTime() <= now.getTime()) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    try {
      // Send as ISO string (UTC)
      await network.fetch<void, typeof CampaignSchemas.schedule>('POST', `/campaigns/${id}/send`, {
        scheduledFor: scheduledDate.toISOString(),
      });

      // Show confirmation with user's local time
      const localTimeString = formatFullDateTime(scheduledDate);
      toast.success(`Campaign scheduled for ${localTimeString}`);
      setIsScheduleDialogOpen(false);
      setScheduledDateTime('');
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to schedule campaign');
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      toast.error('Please select a project member');
      return;
    }

    setSendingTestEmail(true);

    try {
      await network.fetch<{success: boolean; message: string}>('POST', `/campaigns/${id}/test`, {
        email: testEmailAddress,
      } as any);

      toast.success(`Test email sent to ${testEmailAddress}`);
      setIsTestEmailDialogOpen(false);
      setTestEmailAddress('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send test email');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      await network.fetch<Campaign, typeof CampaignSchemas.update>('PUT', `/campaigns/${id}`, {
        name: editedCampaign.name,
        description: editedCampaign.description || undefined,
        subject: editedCampaign.subject,
        body: editedCampaign.body,
        from: editedCampaign.from,
        fromName: editedCampaign.fromName || null,
        replyTo: editedCampaign.replyTo || null,
        audienceType: editedCampaign.audienceType,
        segmentId: editedCampaign.segmentId || undefined,
        disableFooter: editedCampaign.disableFooter,
      });
      // Silent save - no toast notification
      setHasChanges(false);
      // Refetch and re-sync the edited campaign with fresh data
      const updated = await mutate();
      if (updated?.data) {
        setEditedCampaign({
          name: updated.data.name,
          description: updated.data.description || '',
          subject: updated.data.subject,
          body: updated.data.body,
          from: updated.data.from,
          fromName: updated.data.fromName || '',
          replyTo: updated.data.replyTo || '',
          audienceType: updated.data.audienceType,
          segmentId: updated.data.segmentId || undefined,
          disableFooter: updated.data.disableFooter,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initialize edit fields when campaign loads and is a draft
  useEffect(() => {
    if (campaign?.data && isEditMode && Object.keys(editedCampaign).length === 0) {
      setEditedCampaign({
        name: campaign.data.name,
        description: campaign.data.description || '',
        subject: campaign.data.subject,
        body: campaign.data.body,
        from: campaign.data.from,
        fromName: campaign.data.fromName || '',
        replyTo: campaign.data.replyTo || '',
        audienceType: campaign.data.audienceType,
        segmentId: campaign.data.segmentId || undefined,
        disableFooter: campaign.data.disableFooter,
      });
      // Reset hasChanges when loading fresh data
      setHasChanges(false);
    }
  }, [campaign, isEditMode, editedCampaign]);

  // Track changes
  useEffect(() => {
    if (!campaign?.data || Object.keys(editedCampaign).length === 0) return;

    const changed =
      editedCampaign.name !== campaign.data.name ||
      (editedCampaign.description || '') !== (campaign.data.description || '') ||
      editedCampaign.subject !== campaign.data.subject ||
      editedCampaign.body !== campaign.data.body ||
      editedCampaign.from !== campaign.data.from ||
      (editedCampaign.fromName || '') !== (campaign.data.fromName || '') ||
      (editedCampaign.replyTo || '') !== (campaign.data.replyTo || '') ||
      editedCampaign.audienceType !== campaign.data.audienceType ||
      (editedCampaign.segmentId || null) !== (campaign.data.segmentId || null) ||
      editedCampaign.disableFooter !== campaign.data.disableFooter;

    setHasChanges(changed);
  }, [editedCampaign, campaign]);

  // Warn before leaving page with unsaved changes (only in edit mode)
  useChangeTracking(hasChanges, isEditMode);

  const getStatusBadge = (status: CampaignStatus) => {
    const variants: Record<
      CampaignStatus,
      {variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string}
    > = {
      DRAFT: {variant: 'secondary', label: 'Draft'},
      SCHEDULED: {variant: 'default', label: 'Scheduled'},
      SENDING: {variant: 'default', label: 'Sending'},
      SENT: {variant: 'default', label: 'Sent'},
      CANCELLED: {variant: 'destructive', label: 'Cancelled'},
    };

    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin mx-auto border-4 border-neutral-200 border-t-neutral-900 rounded-full" />
            <p className="mt-2 text-sm text-neutral-500">Loading campaign...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-neutral-500">Campaign not found</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const c = campaign.data;
  const s = stats?.data;

  // Get recipient count for draft campaigns from the campaign's totalRecipients field
  // The backend calculates this for all audience types when the campaign is created/updated
  const draftRecipientCount = isEditMode && campaign?.data ? campaign.data.totalRecipients : 0;

  // Render edit form for drafts
  if (isEditMode) {
    return (
      <DashboardLayout>
        <form onSubmit={handleSave} className={`space-y-6 ${hasChanges ? 'pb-32' : ''}`}>
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link href="/campaigns">
                <Button type="button" variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 truncate">{c.name}</h1>
                  <Badge variant="secondary">Draft</Badge>
                </div>
                <p className="text-neutral-500 mt-1 text-sm sm:text-base">
                  Make changes to your campaign before sending
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                {!hasChanges && !isSubmitting && (
                  <span className="text-xs sm:text-sm text-neutral-500">All changes saved</span>
                )}
                {hasChanges && !isSubmitting && (
                  <span className="text-xs sm:text-sm text-amber-600">Unsaved changes</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  className="flex-1 sm:flex-none"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
                <Button
                  type="submit"
                  disabled={!hasChanges || isSubmitting}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">{isSubmitting ? 'Saving...' : 'Save'}</span>
                  <span className="sm:hidden">Save</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" className="flex-1 sm:flex-none">
                      <Send className="h-4 w-4" />
                      <span className="hidden sm:inline">Send</span>
                      <ChevronDown className="h-4 w-4 sm:ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuItem onClick={() => setIsTestEmailDialogOpen(true)} className="py-3 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <TestTube className="h-4 w-4 mt-0.5 text-neutral-700" />
                        <div className="flex flex-col gap-0.5 flex-1">
                          <span className="font-medium text-sm">Send Test Email</span>
                          <span className="text-xs text-neutral-500 leading-snug">
                            Preview in your inbox before sending
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowSendDialog(true)} className="py-3 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <Send className="h-4 w-4 mt-0.5 text-neutral-700" />
                        <div className="flex flex-col gap-0.5 flex-1">
                          <span className="font-medium text-sm">Send Now</span>
                          <span className="text-xs text-neutral-500 leading-snug">
                            Send immediately to all recipients
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsScheduleDialogOpen(true)} className="py-3 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-4 w-4 mt-0.5 text-neutral-700" />
                        <div className="flex flex-col gap-0.5 flex-1">
                          <span className="font-medium text-sm">Schedule for Later</span>
                          <span className="text-xs text-neutral-500 leading-snug">Choose a specific date and time</span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Campaign Settings - Horizontal Layout */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Campaign Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Settings</CardTitle>
                <CardDescription>Basic information about your campaign</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={editedCampaign.name || ''}
                    onChange={e => setEditedCampaign({...editedCampaign, name: e.target.value})}
                    required
                    placeholder="Spring Sale Campaign"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    type="text"
                    value={editedCampaign.description || ''}
                    onChange={e => setEditedCampaign({...editedCampaign, description: e.target.value})}
                    placeholder="Optional description for internal use"
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Subject Line *</Label>
                  <Input
                    id="subject"
                    type="text"
                    value={editedCampaign.subject || ''}
                    onChange={e => setEditedCampaign({...editedCampaign, subject: e.target.value})}
                    required
                    placeholder="Introducing our Spring Sale!"
                  />
                </div>

                <EmailSettings
                  from={editedCampaign.from || ''}
                  fromName={editedCampaign.fromName || ''}
                  replyTo={editedCampaign.replyTo || ''}
                  onFromChange={value => setEditedCampaign({...editedCampaign, from: value})}
                  onFromNameChange={value => setEditedCampaign({...editedCampaign, fromName: value})}
                  onReplyToChange={value => setEditedCampaign({...editedCampaign, replyTo: value})}
                  fromNamePlaceholder={activeProject?.name || 'Your Company'}
                  showFromNameHelpText
                  layout="vertical"
                />

                {activeProject?.subscription && (
                  <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="disableFooter">Disable default footer</Label>
                      <p className="text-xs text-neutral-500">
                        When enabled, the default unsubscribe footer will not be appended. You are responsible for
                        including your own unsubscribe mechanism.
                      </p>
                    </div>
                    <Switch
                      id="disableFooter"
                      checked={editedCampaign.disableFooter ?? false}
                      onCheckedChange={checked => setEditedCampaign({...editedCampaign, disableFooter: checked})}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Audience Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Audience</CardTitle>
                <CardDescription>Who will receive this campaign</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="audienceType">Audience Type *</Label>
                  <Select
                    value={editedCampaign.audienceType ?? c.audienceType}
                    onValueChange={(value: CampaignAudienceType) => {
                      setEditedCampaign({
                        ...editedCampaign,
                        audienceType: value,
                        // Clear segmentId if changing away from SEGMENT
                        segmentId: value === CampaignAudienceType.SEGMENT ? editedCampaign.segmentId : undefined,
                      });
                    }}
                  >
                    <SelectTrigger id="audienceType">
                      <SelectValue placeholder="Select audience type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItemWithDescription
                        value={CampaignAudienceType.ALL}
                        title="All Subscribed Contacts"
                        description="Send to everyone who hasn't unsubscribed"
                      />
                      <SelectItemWithDescription
                        value={CampaignAudienceType.SEGMENT}
                        title="Segment"
                        description="Target a defined group of contacts"
                      />
                    </SelectContent>
                  </Select>
                </div>

                {(editedCampaign.audienceType ?? c.audienceType) === CampaignAudienceType.SEGMENT && (
                  <div>
                    <Label htmlFor="segment">Select Segment *</Label>
                    <Select
                      value={editedCampaign.segmentId ?? c.segmentId ?? undefined}
                      onValueChange={(value: string) => {
                        setEditedCampaign({
                          ...editedCampaign,
                          segmentId: value,
                        });
                      }}
                      disabled={!segments || segments.length === 0}
                    >
                      <SelectTrigger id="segment">
                        <SelectValue
                          placeholder={segments && segments.length > 0 ? 'Choose a segment' : 'No segments available'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {segments &&
                          segments.length > 0 &&
                          segments.map(segment => (
                            <SelectItemWithDescription
                              key={segment.id}
                              value={segment.id}
                              title={segment.name}
                              description={`${segment.memberCount.toLocaleString()} contacts`}
                            />
                          ))}
                      </SelectContent>
                    </Select>
                    {segments && segments.length === 0 && (
                      <p className="text-xs text-neutral-500 mt-1">Create a segment first to use this option</p>
                    )}
                  </div>
                )}

                {editedCampaign.audienceType === CampaignAudienceType.FILTERED && (
                  <p className="text-sm text-neutral-500">
                    Filtered audiences are configured with advanced filter conditions
                  </p>
                )}

                {/* Show recipient count */}
                {draftRecipientCount > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        {draftRecipientCount.toLocaleString()} recipients
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-800">
                        This count will be recalculated right before sending to ensure accuracy. The final number may
                        differ if contacts subscribe, unsubscribe, or segment membership changes.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Email Editor - Full Width */}
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle>Email Content</CardTitle>
              <CardDescription>Design your email using the visual editor or paste custom HTML</CardDescription>
            </CardHeader>
            <CardContent>
              <EmailEditor
                value={editedCampaign.body || ''}
                onChange={body => {
                  setEditedCampaign({...editedCampaign, body});
                  setHasChanges(true);
                }}
              />
            </CardContent>
          </Card>

          {/* Test Email Dialog */}
          <Dialog open={isTestEmailDialogOpen} onOpenChange={setIsTestEmailDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Send Test Email</DialogTitle>
                <DialogDescription>
                  Send a test version of this campaign to a project member to verify how it looks. The test email will
                  be prefixed with [TEST] in the subject line.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="testEmail">Project Member</Label>
                  <Select value={testEmailAddress} onValueChange={setTestEmailAddress}>
                    <SelectTrigger id="testEmail" className="mt-2">
                      <SelectValue placeholder="Select a project member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {projectMembers?.data.map(member => (
                        <SelectItem key={member.userId} value={member.email}>
                          {member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-neutral-500 mt-2">
                    For security reasons, test emails can only be sent to project members.
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Note: Variables will not be replaced in test emails. The email will be sent exactly as designed.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsTestEmailDialogOpen(false);
                    setTestEmailAddress('');
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleSendTestEmail} disabled={sendingTestEmail || !testEmailAddress}>
                  {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Schedule Dialog */}
          <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule Campaign</DialogTitle>
                <DialogDescription>
                  Choose when you want this campaign to be sent (times shown in your local timezone: {getUserTimezone()}
                  )
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Quick Presets */}
                <div>
                  <Label>Quick Schedule</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setScheduledDateTime(schedulePresets.inOneHour())}
                    >
                      In 1 hour
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setScheduledDateTime(schedulePresets.inThreeHours())}
                    >
                      In 3 hours
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setScheduledDateTime(schedulePresets.tomorrowAt9AM())}
                    >
                      Tomorrow at 9 AM
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setScheduledDateTime(schedulePresets.tomorrowAt2PM())}
                    >
                      Tomorrow at 2 PM
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setScheduledDateTime(schedulePresets.nextMonday())}
                    >
                      Next Monday
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setScheduledDateTime(schedulePresets.inOneWeek())}
                    >
                      In 1 week
                    </Button>
                  </div>
                </div>

                {/* Custom Date/Time */}
                <div>
                  <Label htmlFor="scheduledDateTime">Or choose a specific time</Label>
                  <Input
                    id="scheduledDateTime"
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={e => setScheduledDateTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="mt-2"
                  />
                  {scheduledDateTime && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-medium text-blue-900 mb-1">Scheduled for:</p>
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">{formatFullDateTime(new Date(scheduledDateTime))}</span>
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        UTC: {formatUTCDateTime(new Date(scheduledDateTime))}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsScheduleDialogOpen(false);
                    setScheduledDateTime('');
                  }}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleSchedule}>
                  Schedule Campaign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </form>

        {/* Sticky Save Bar */}
        <StickySaveBar hasChanges={hasChanges} isSubmitting={isSubmitting} onSave={handleSave} />

        <ConfirmDialog
          open={showSendDialog}
          onOpenChange={setShowSendDialog}
          onConfirm={handleSend}
          title="Send Campaign"
          description="Are you sure you want to send this campaign now? This action cannot be undone."
          confirmText="Send Now"
          variant="default"
        />

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          title="Delete Campaign"
          description="Are you sure you want to delete this draft campaign? This action cannot be undone."
          confirmText="Delete Campaign"
          variant="destructive"
        />
      </DashboardLayout>
    );
  }

  // Render stats view for sent/scheduled campaigns
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/campaigns">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 truncate">{c.name}</h1>
                {getStatusBadge(c.status)}
              </div>
              {c.description && <p className="text-neutral-500 text-sm sm:text-base">{c.description}</p>}
            </div>
          </div>

          {/* Actions */}
          {(c.status === CampaignStatus.SCHEDULED || c.status === CampaignStatus.SENDING) && (
            <div className="flex justify-end">
              <Button variant="destructive" onClick={() => setShowCancelDialog(true)} className="w-full sm:w-auto">
                <XCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Cancel Campaign</span>
                <span className="sm:hidden">Cancel</span>
              </Button>
            </div>
          )}
        </div>

        {/* Sending Progress Banner */}
        {c.status === CampaignStatus.SENDING && s && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-neutral-900 text-lg">Sending in progress</h3>
                    <p className="text-sm text-neutral-600 mt-1">
                      {s.sentCount.toLocaleString()} of {s.totalRecipients.toLocaleString()} emails sent
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">
                      {((s.sentCount / s.totalRecipients) * 100).toFixed(0)}%
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Complete</p>
                  </div>
                </div>
                <div className="w-full bg-neutral-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{width: `${(s.sentCount / s.totalRecipients) * 100}%`}}
                  />
                </div>
                <p className="text-xs text-neutral-500">This page updates automatically every 5 seconds</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {s && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">Total Recipients</CardTitle>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neutral-900">{s.totalRecipients.toLocaleString()}</div>
                <p className="text-xs text-neutral-500 mt-2">
                  {s.sentCount.toLocaleString()} sent ({((s.sentCount / s.totalRecipients) * 100).toFixed(1)}%)
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">Delivery Rate</CardTitle>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Mail className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neutral-900">{s.deliveryRate.toFixed(1)}%</div>
                <p className="text-xs text-neutral-500 mt-2">
                  {s.deliveredCount.toLocaleString()} delivered
                  {s.bouncedCount > 0 && `, ${s.bouncedCount} bounced`}
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">Open Rate</CardTitle>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neutral-900">{s.openRate.toFixed(1)}%</div>
                <p className="text-xs text-neutral-500 mt-2">{s.openedCount.toLocaleString()} opened</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-neutral-600">Click Rate</CardTitle>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <MousePointer className="h-4 w-4 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neutral-900">{s.clickRate.toFixed(1)}%</div>
                <p className="text-xs text-neutral-500 mt-2">{s.clickedCount.toLocaleString()} clicked</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Campaign Details in Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Email Content - Takes 2 columns */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Email Preview</CardTitle>
              <CardDescription>How your email will appear to recipients</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email Header Info */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-neutral-500 uppercase tracking-wide font-medium">Subject</p>
                    <p className="text-base font-semibold text-neutral-900 mt-1">{c.subject}</p>
                  </div>
                </div>
                <div className="flex gap-6 pt-2 border-t border-neutral-200">
                  <div>
                    <p className="text-xs text-neutral-500">From</p>
                    <p className="text-sm text-neutral-900 mt-0.5">{c.from}</p>
                  </div>
                  {c.replyTo && (
                    <div>
                      <p className="text-xs text-neutral-500">Reply-To</p>
                      <p className="text-sm text-neutral-900 mt-0.5">{c.replyTo}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Email Body Preview */}
              <div>
                <p className="text-sm font-medium text-neutral-700 mb-3">Message Content</p>
                <div className="border-2 border-neutral-200 rounded-lg overflow-hidden bg-white">
                  <div className="p-6 max-h-96 overflow-y-auto">
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{__html: c.body}} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Info</CardTitle>
              <CardDescription>Configuration and metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Audience */}
              <div className="pb-3 border-b border-neutral-100">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Audience</p>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-neutral-400" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {c.audienceType === CampaignAudienceType.ALL && 'All Subscribed Contacts'}
                      {c.audienceType === CampaignAudienceType.SEGMENT &&
                        (segments?.find(s => s.id === c.segmentId)?.name || 'Selected Segment')}
                      {c.audienceType === CampaignAudienceType.FILTERED && 'Filtered Contacts'}
                    </p>
                    {c.audienceType === CampaignAudienceType.SEGMENT &&
                      segments?.find(s => s.id === c.segmentId)?.memberCount && (
                        <p className="text-xs text-neutral-500">
                          {segments.find(s => s.id === c.segmentId)!.memberCount.toLocaleString()} contacts
                        </p>
                      )}
                  </div>
                </div>
              </div>

              {/* Scheduling Info */}
              {c.scheduledFor && (
                <div className="pb-3 border-b border-neutral-100">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Scheduled For</p>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-neutral-400 mt-0.5" />
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">
                          {formatFullDateTime(new Date(c.scheduledFor))}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                          UTC: {formatUTCDateTime(new Date(c.scheduledFor))}
                        </p>
                      </div>
                      {c.status === CampaignStatus.SCHEDULED && (
                        <div className="flex items-start gap-1.5 p-2 bg-blue-50 border border-blue-200 rounded">
                          <Info className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-blue-800">Recipient count will be recalculated at send time</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sent At */}
              {c.sentAt && (
                <div className="pb-3 border-b border-neutral-100">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Sent On</p>
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-neutral-400" />
                    <p className="text-sm font-medium text-neutral-900">{formatFullDateTime(new Date(c.sentAt))}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={handleCancel}
        title="Cancel Campaign"
        description="Are you sure you want to cancel this campaign?"
        confirmText="Cancel Campaign"
        variant="destructive"
      />
    </DashboardLayout>
  );
}
