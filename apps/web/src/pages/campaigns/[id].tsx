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
  IconSpinner,
  Skeleton,
  StickySaveBar,
} from '@plunk/ui';
import type {Campaign, Segment} from '@plunk/db';
import {CampaignAudienceType, CampaignStatus, TemplateType} from '@plunk/db';
import {CampaignSchemas, detectUnsubscribeSignal} from '@plunk/shared';
import {DashboardLayout} from '../../components/DashboardLayout';
import {EmailSettings} from '../../components/EmailSettings';
import {EmailEditor} from '../../components/EmailEditor';
import {network} from '../../lib/network';
import {formatFullDateTime, formatUTCDateTime, getUserTimezone, schedulePresets} from '../../lib/dateUtils';
import {useChangeTracking} from '../../lib/hooks/useChangeTracking';
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Calendar,
  ChevronDown,
  Info,
  Save,
  Send,
  TestTube,
  Trash2,
  TriangleAlert,
  Users,
  XCircle,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';
import {NextSeo} from 'next-seo';
import {useActiveProject} from '../../lib/contexts/ActiveProjectProvider';

interface CampaignStats {
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  complainedCount: number;
  unsubscribedCount: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  deliveryRate: number;
  complaintRate: number;
  unsubscribeRate: number;
}

/**
 * Reach figures supporting the headline, in funnel order. Opens are excluded because they
 * are the headline; "sent" is excluded because it is always 100% of itself and already
 * stated in the card description, so a row for it can never tell the reader anything.
 *
 * Every rate is measured against sentCount, the denominator the stats endpoint documents.
 */
const REACH_FIGURES: {label: string; count: (s: CampaignStats) => number; rate: (s: CampaignStats) => number}[] = [
  {label: 'delivered', count: s => s.deliveredCount, rate: s => s.deliveryRate},
  {label: 'clicked', count: s => s.clickedCount, rate: s => s.clickRate},
];

/**
 * The three ways this campaign cost a contact. Each suppresses the contact from future
 * marketing, and no recipient appears in more than one -- a bounce or complaint is never
 * also counted as an unsubscribe -- so the three add up.
 */
const LOST_REASONS: {label: string; count: (s: CampaignStats) => number}[] = [
  {label: 'bounced', count: s => s.bouncedCount},
  {label: 'marked it as spam', count: s => s.complainedCount},
  {label: 'unsubscribed', count: s => s.unsubscribedCount},
];

export default function CampaignDetailsPage() {
  const router = useRouter();
  const {id} = router.query;
  const {activeProject} = useActiveProject();

  // Set when a cancel comes back still CANCELLED but with its revert queued: the
  // unsent emails are being cleared in the background and the campaign becomes a draft
  // when that finishes. Polled rather than pushed, and given up on after a while --
  // clearing a million rows outruns any sensible poll, and the page is correct either
  // way once it is reloaded.
  const [revertPending, setRevertPending] = useState(false);

  const {
    data: campaign,
    mutate,
    isLoading,
  } = useSWR<{data: Campaign}>(id ? `/campaigns/${id}` : null, {
    revalidateOnFocus: false,
    refreshInterval: revertPending ? 5000 : 0,
  });

  // Stop polling the moment the cleanup promotes the campaign, and give up if it is
  // taking longer than a poll is worth -- a very large cleanup finishes long after the
  // user has moved on, and the next page load shows the truth regardless.
  const revertedStatus = campaign?.data.status;
  useEffect(() => {
    if (!revertPending) return;

    if (revertedStatus === CampaignStatus.DRAFT) {
      setRevertPending(false);
      toast.success('Campaign returned to draft');
      return;
    }

    const giveUp = setTimeout(() => setRevertPending(false), 2 * 60 * 1000);
    return () => clearTimeout(giveUp);
  }, [revertPending, revertedStatus]);

  const {
    data: stats,
    error: statsError,
    mutate: mutateStats,
  } = useSWR<{data: CampaignStats}>(
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
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');

  type CampaignDialog =
    | {type: 'none'}
    | {type: 'schedule'}
    | {type: 'testEmail'; sending: boolean}
    | {type: 'send'}
    | {type: 'cancel'}
    | {type: 'delete'};

  const [dialog, setDialog] = useState<CampaignDialog>({type: 'none'});

  // Automatically initialize edit fields when campaign is loaded and is a draft
  const isEditMode = campaign?.data.status === CampaignStatus.DRAFT;

  const handleCancel = async () => {
    try {
      // Three outcomes, and the confirmation reports the one that happened rather than
      // asserting a cancellation: straight back to draft, cancelled for good, or
      // stopped with the revert still draining in the background.
      const res = await network.fetch<{data: {status: CampaignStatus}; revertPending?: boolean}>(
        'POST',
        `/campaigns/${id}/cancel`,
      );

      if (res.revertPending) {
        setRevertPending(true);
        toast.success('Campaign stopped. Clearing its unsent emails, then it returns to draft.');
      } else {
        toast.success(
          res.data.status === CampaignStatus.DRAFT ? 'Campaign stopped and returned to draft' : 'Campaign canceled',
        );
      }

      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t cancel the campaign. Try again.');
    }
  };

  const handleDelete = async () => {
    try {
      await network.fetch('DELETE', `/campaigns/${id}`);
      toast.success('Campaign deleted');
      void router.push('/campaigns');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t delete the campaign. Try again.');
    }
  };

  /**
   * Archive or restore. No confirmation: archiving destroys nothing, and the detail page
   * stays on the campaign afterwards so the state change is visible in the header badge.
   */
  const handleSetArchived = async (archived: boolean) => {
    try {
      await network.fetch('POST', `/campaigns/${id}/${archived ? 'archive' : 'unarchive'}`);
      toast.success(archived ? 'Campaign archived' : 'Campaign restored');
      void mutate();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Couldn\u2019t ${archived ? 'archive' : 'restore'} the campaign. Try again.`,
      );
    }
  };

  const handleSend = async () => {
    try {
      await network.fetch<void>('POST', `/campaigns/${id}/send`);
      toast.success('Campaign is being sent!');
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t send the campaign. Try again.');
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
      setDialog({type: 'none'});
      setScheduledDateTime('');
      setSelectedPreset(null);
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t schedule the campaign. Try again.');
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      toast.error('Please select a project member');
      return;
    }

    setDialog({type: 'testEmail', sending: true});

    try {
      await network.fetch<{success: boolean; message: string}>('POST', `/campaigns/${id}/test`, {
        email: testEmailAddress,
      } as any);

      toast.success(`Test email sent to ${testEmailAddress}`);
      setDialog({type: 'none'});
      setTestEmailAddress('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t send the test email. Try again.');
    } finally {
      setDialog(d => (d.type === 'testEmail' ? {type: 'testEmail', sending: false} : d));
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
        type: editedCampaign.type,
        audienceType: editedCampaign.audienceType,
        segmentId: editedCampaign.segmentId || undefined,
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
          type: updated.data.type,
          audienceType: updated.data.audienceType,
          segmentId: updated.data.segmentId || undefined,
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t save the campaign. Try again.');
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
        type: campaign.data.type,
        audienceType: campaign.data.audienceType,
        segmentId: campaign.data.segmentId || undefined,
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
      editedCampaign.type !== campaign.data.type ||
      editedCampaign.audienceType !== campaign.data.audienceType ||
      (editedCampaign.segmentId || null) !== (campaign.data.segmentId || null);

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
          <IconSpinner />
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
  // Safe to add: the three counts are mutually exclusive per recipient.
  const lostContacts = s ? s.bouncedCount + s.complainedCount + s.unsubscribedCount : 0;
  // A scheduled campaign has stats, but they are all zero until it starts sending.
  const hasResults = c.status === CampaignStatus.SENDING || c.status === CampaignStatus.SENT;

  // Cancelling has two very different outcomes, and the dialog has to name the one
  // the user is about to get. A campaign with nothing sent comes back as an editable
  // draft; once a single email is away the record is frozen for good. The sent count
  // is a poll behind the send, so while a campaign is in flight this promises only
  // what is certain -- already-delivered copies cannot be recalled.
  const sentSoFar = s?.sentCount ?? 0;
  const cancelCopy =
    c.status === CampaignStatus.SCHEDULED || sentSoFar === 0
      ? {
          title: 'Stop this campaign?',
          description:
            c.status === CampaignStatus.SCHEDULED
              ? 'Nothing has been sent yet, so the campaign returns to draft and stays editable.'
              : 'Sending stops now. If nothing has gone out yet the campaign returns to draft; any contact who already received it keeps their copy.',
          confirmText: 'Stop campaign',
        }
      : {
          title: 'Cancel this campaign?',
          description: `Sending stops now. The ${sentSoFar.toLocaleString()} ${
            sentSoFar === 1 ? 'contact' : 'contacts'
          } who already received it keep their copy, and the campaign is permanently cancelled.`,
          confirmText: 'Cancel campaign',
        };

  // Get recipient count for draft campaigns from the campaign's totalRecipients field
  // The backend calculates this for all audience types when the campaign is created/updated
  const draftRecipientCount = isEditMode && campaign?.data ? campaign.data.totalRecipients : 0;

  // Render edit form for drafts
  if (isEditMode) {
    return (
      <DashboardLayout>
        <NextSeo title={campaign.data.name} />
        <form onSubmit={handleSave} className={`space-y-6 ${hasChanges ? 'pb-32' : ''}`}>
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/campaigns"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 truncate">{c.name}</h1>
                  <Badge variant="secondary">Draft</Badge>
                </div>
                <p className="text-neutral-500 mt-1 text-sm sm:text-base">
                  Not sent yet. Edit freely.
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
                  onClick={() => setDialog({type: 'delete'})}
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
                  <span className="hidden sm:inline">{isSubmitting ? 'Saving…' : 'Save'}</span>
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
                    <DropdownMenuItem onClick={() => setDialog({type: 'testEmail', sending: false})} className="py-3 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <TestTube className="h-4 w-4 mt-0.5 text-neutral-700" />
                        <div className="flex flex-col gap-0.5 flex-1">
                          <span className="font-medium text-sm">Send test email</span>
                          <span className="text-xs text-neutral-500 leading-snug">
                            Preview in your inbox before sending
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDialog({type: 'send'})} className="py-3 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <Send className="h-4 w-4 mt-0.5 text-neutral-700" />
                        <div className="flex flex-col gap-0.5 flex-1">
                          <span className="font-medium text-sm">Send now</span>
                          <span className="text-xs text-neutral-500 leading-snug">
                            Send immediately to all recipients
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDialog({type: 'schedule'})} className="py-3 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-4 w-4 mt-0.5 text-neutral-700" />
                        <div className="flex flex-col gap-0.5 flex-1">
                          <span className="font-medium text-sm">Schedule for later</span>
                          <span className="text-xs text-neutral-500 leading-snug">Choose a specific date and time</span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => void handleSetArchived(!c.archived)}
                      className="py-3 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        {c.archived ? (
                          <ArchiveRestore className="h-4 w-4 mt-0.5 text-neutral-700" />
                        ) : (
                          <Archive className="h-4 w-4 mt-0.5 text-neutral-700" />
                        )}
                        <div className="flex flex-col gap-0.5 flex-1">
                          <span className="font-medium text-sm">{c.archived ? 'Restore draft' : 'Archive draft'}</span>
                          <span className="text-xs text-neutral-500 leading-snug">
                            {c.archived
                              ? 'Put it back on the campaigns list'
                              : 'Hide it from the campaigns list without deleting it'}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Audience — surfaced first because Send lives in the header.
              Users need to see who/how many before pressing Send. */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Audience</CardTitle>
                <CardDescription>Who will receive this campaign when you send</CardDescription>
              </div>
              {draftRecipientCount > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 shrink-0">
                  <Users className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                    {draftRecipientCount.toLocaleString()} {draftRecipientCount === 1 ? 'recipient' : 'recipients'}
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="audienceType">
                    Audience Type <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={editedCampaign.audienceType ?? c.audienceType}
                    onValueChange={(value: CampaignAudienceType) => {
                      setEditedCampaign({
                        ...editedCampaign,
                        audienceType: value,
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
                        title={(editedCampaign.type ?? c.type) === TemplateType.TRANSACTIONAL ? 'All Contacts' : 'All Subscribed Contacts'}
                        description={(editedCampaign.type ?? c.type) === TemplateType.TRANSACTIONAL ? 'Send to all contacts regardless of subscription status' : "Send to everyone who hasn't unsubscribed"}
                      />
                      <SelectItemWithDescription
                        value={CampaignAudienceType.SEGMENT}
                        title="Specific segment"
                        description="Target a defined group of contacts"
                      />
                    </SelectContent>
                  </Select>
                </div>

                {(editedCampaign.audienceType ?? c.audienceType) === CampaignAudienceType.SEGMENT && (
                  <div className="space-y-2">
                    <Label htmlFor="segment">
                      Select Segment <span className="text-red-500">*</span>
                    </Label>
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
                      <p className="text-sm text-neutral-500">
                        No segments found.{' '}
                        <Link href="/segments/new" className="underline">
                          Create one first
                        </Link>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {editedCampaign.audienceType === CampaignAudienceType.FILTERED && (
                <p className="text-sm text-neutral-500">
                  Filtered audiences are configured with advanced filter conditions
                </p>
              )}

              {draftRecipientCount > 0 && (
                <p className="text-xs text-neutral-500">
                  Recalculated at send time. Final count may differ if contacts{' '}
                  {(editedCampaign.type ?? c.type) === TemplateType.TRANSACTIONAL
                    ? 'are added or removed, or segment membership changes.'
                    : 'subscribe, unsubscribe, or segment membership changes.'
                  }
                </p>
              )}
            </CardContent>
          </Card>

          {/* Row 1: Basic Info + Campaign Type */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic information</CardTitle>
                <CardDescription>Name and describe your campaign</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Campaign Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Spring Sale Announcement"
                    value={editedCampaign.name || ''}
                    onChange={e => setEditedCampaign({...editedCampaign, name: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="e.g., Q2 launch, list A"
                    value={editedCampaign.description || ''}
                    onChange={e => setEditedCampaign({...editedCampaign, description: e.target.value})}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Campaign Type */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign type</CardTitle>
                <CardDescription>Choose how this campaign should be treated</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {([
                    {value: TemplateType.MARKETING, label: 'Marketing', description: 'Subscribed contacts, includes unsubscribe link'},
                    {value: TemplateType.TRANSACTIONAL, label: 'Transactional', description: 'All contacts, no subscription check or footer'},
                    {value: TemplateType.HEADLESS, label: 'Headless', description: 'Subscribed contacts, no Plunk footer'},
                  ] as const).map(({value, label, description}) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setEditedCampaign({...editedCampaign, type: value})}
                      className={`flex items-center justify-between w-full min-h-[44px] px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                        (editedCampaign.type ?? c.type) === value
                          ? 'border-neutral-900 bg-neutral-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <span className="font-medium text-sm text-neutral-900 shrink-0">{label}</span>
                      <span className="text-xs text-neutral-500 ml-4 text-right">{description}</span>
                    </button>
                  ))}
                </div>
                {(editedCampaign.type ?? c.type) === TemplateType.HEADLESS &&
                  !detectUnsubscribeSignal(editedCampaign.body ?? c.body) && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-100/60 px-3 py-2">
                      <TriangleAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <p className="text-xs font-semibold text-amber-900">No unsubscribe link detected</p>
                    </div>
                    <div className="px-3 py-2.5 space-y-2">
                      <p className="text-xs text-amber-800 leading-relaxed">
                        You are responsible for providing recipients a way to opt out. Use the Plunk variables below to build your own footer.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <code className="inline-flex items-center rounded bg-amber-100 border border-amber-200 px-1.5 py-0.5 font-mono text-[11px] text-amber-900">
                          {'{{unsubscribeUrl}}'}
                        </code>
                        <code className="inline-flex items-center rounded bg-amber-100 border border-amber-200 px-1.5 py-0.5 font-mono text-[11px] text-amber-900">
                          {'{{manageUrl}}'}
                        </code>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Email settings</CardTitle>
              <CardDescription>Configure sender information and subject</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EmailSettings
                from={editedCampaign.from || ''}
                fromName={editedCampaign.fromName || ''}
                replyTo={editedCampaign.replyTo || ''}
                onFromChange={value => setEditedCampaign({...editedCampaign, from: value})}
                onFromNameChange={value => setEditedCampaign({...editedCampaign, fromName: value})}
                onReplyToChange={value => setEditedCampaign({...editedCampaign, replyTo: value})}
                fromNamePlaceholder={activeProject?.name || 'Your Company'}
              />

              <div className="space-y-2">
                <Label htmlFor="subject">
                  Email Subject <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="subject"
                  placeholder="e.g., Introducing our Spring Sale!"
                  value={editedCampaign.subject || ''}
                  onChange={e => setEditedCampaign({...editedCampaign, subject: e.target.value})}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Content */}
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle>Email content</CardTitle>
              <CardDescription>Design your email message</CardDescription>
            </CardHeader>
            <CardContent>
              <EmailEditor
                value={editedCampaign.body || ''}
                onChange={body => {
                  setEditedCampaign({...editedCampaign, body});
                  setHasChanges(true);
                }}
                segmentId={
                  (editedCampaign.audienceType ?? c.audienceType) === CampaignAudienceType.SEGMENT
                    ? (editedCampaign.segmentId ?? c.segmentId ?? undefined)
                    : undefined
                }
              />
            </CardContent>
          </Card>

          {/* Test Email Dialog */}
          <Dialog open={dialog.type === 'testEmail'} onOpenChange={open => !open && setDialog({type: 'none'})}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Send a preview</DialogTitle>
                <DialogDescription>
                  Get a copy of this campaign in your inbox before sending it for real.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Label htmlFor="testEmail">Send to</Label>
                <Select value={testEmailAddress} onValueChange={setTestEmailAddress}>
                  <SelectTrigger id="testEmail">
                    <SelectValue placeholder="Choose a teammate" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectMembers?.data.map(member => (
                      <SelectItem key={member.userId} value={member.email}>
                        {member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview of how the email will arrive */}
              <div className="space-y-2">
                <Label className="text-neutral-500">Will arrive as</Label>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 divide-y divide-neutral-200 text-sm">
                  <div className="grid grid-cols-[64px_1fr] gap-3 px-3 py-2.5">
                    <span className="text-neutral-500">From</span>
                    <span className="text-neutral-900 truncate">{editedCampaign.from || c.from}</span>
                  </div>
                  <div className="grid grid-cols-[64px_1fr] gap-3 px-3 py-2.5">
                    <span className="text-neutral-500">Subject</span>
                    <span className="text-neutral-900 truncate">
                      <span className="font-medium">[TEST]</span> {editedCampaign.subject || c.subject}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-neutral-500 leading-relaxed">
                Variables like {'{{firstName}}'} aren{"'"}t replaced in previews. You{"'"}ll see them as written.
              </p>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialog({type: 'none'});
                    setTestEmailAddress('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={(dialog.type === 'testEmail' && dialog.sending) || !testEmailAddress}
                >
                  <TestTube className="h-4 w-4" />
                  {dialog.type === 'testEmail' && dialog.sending ? 'Sending…' : 'Send preview'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Schedule Dialog */}
          <Dialog open={dialog.type === 'schedule'} onOpenChange={open => !open && setDialog({type: 'none'})}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule for later</DialogTitle>
                <DialogDescription>
                  Pick a time and Plunk will send it for you. Times shown in {getUserTimezone()}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Quick presets */}
                <div className="space-y-2">
                  <Label>Quick options</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      {key: 'in1h', label: 'In 1 hour', getValue: schedulePresets.inOneHour},
                      {key: 'in3h', label: 'In 3 hours', getValue: schedulePresets.inThreeHours},
                      {key: 'tom9', label: 'Tomorrow, 9 AM', getValue: schedulePresets.tomorrowAt9AM},
                      {key: 'tom2', label: 'Tomorrow, 2 PM', getValue: schedulePresets.tomorrowAt2PM},
                      {key: 'nextMon', label: 'Next Monday', getValue: schedulePresets.nextMonday},
                      {key: 'in1w', label: 'In 1 week', getValue: schedulePresets.inOneWeek},
                    ].map(({key, label, getValue}) => {
                      const isActive = selectedPreset === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setScheduledDateTime(getValue());
                            setSelectedPreset(key);
                          }}
                          className={`min-h-[40px] px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                            isActive
                              ? 'border-neutral-900 bg-neutral-50 text-neutral-900 font-medium'
                              : 'border-neutral-200 text-neutral-700 hover:border-neutral-400 hover:text-neutral-900'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Date/Time */}
                <div className="space-y-2">
                  <Label htmlFor="scheduledDateTime">Or pick an exact time</Label>
                  <Input
                    id="scheduledDateTime"
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={e => {
                      setScheduledDateTime(e.target.value);
                      setSelectedPreset(null);
                    }}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                {/* Confirmation preview — date + audience together */}
                {scheduledDateTime && (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 divide-y divide-neutral-200">
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-2 text-neutral-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium uppercase tracking-wide">Sending on</span>
                      </div>
                      <p className="mt-1 text-base font-semibold text-neutral-900">
                        {formatFullDateTime(new Date(scheduledDateTime))}
                      </p>
                    </div>
                    {draftRecipientCount > 0 && (
                      <div className="px-4 py-3">
                        <div className="flex items-center gap-2 text-neutral-500">
                          <Users className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium uppercase tracking-wide">To</span>
                        </div>
                        <p className="mt-1 text-sm text-neutral-900">
                          <span className="font-semibold tabular-nums">{draftRecipientCount.toLocaleString()}</span>
                          <span className="text-neutral-600">
                            {draftRecipientCount === 1 ? ' recipient in ' : ' recipients in '}
                          </span>
                          {(editedCampaign.audienceType ?? c.audienceType) === CampaignAudienceType.ALL &&
                            ((editedCampaign.type ?? c.type) === TemplateType.TRANSACTIONAL
                              ? 'all contacts'
                              : 'all subscribed contacts')}
                          {(editedCampaign.audienceType ?? c.audienceType) === CampaignAudienceType.SEGMENT &&
                            (segments?.find(s => s.id === (editedCampaign.segmentId ?? c.segmentId))?.name ?? 'the selected segment')}
                          {(editedCampaign.audienceType ?? c.audienceType) === CampaignAudienceType.FILTERED && 'filtered contacts'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-neutral-500 leading-relaxed">
                You can edit or cancel this campaign anytime before it sends.
              </p>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialog({type: 'none'});
                    setScheduledDateTime('');
                    setSelectedPreset(null);
                  }}
                >
                  Not yet
                </Button>
                <Button type="button" onClick={handleSchedule} disabled={!scheduledDateTime}>
                  <Calendar className="h-4 w-4" />
                  Schedule send
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </form>

        {/* Sticky Save Bar */}
        <StickySaveBar status={isSubmitting ? 'saving' : hasChanges ? 'dirty' : 'idle'} onSave={handleSave} />

        <Dialog open={dialog.type === 'send'} onOpenChange={open => !open && setDialog({type: 'none'})}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ready to send?</DialogTitle>
              <DialogDescription>Review the details below, then send when you{"'"}re ready.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Hero: recipient count */}
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-6 text-center">
                <div className="flex items-center justify-center gap-2 text-neutral-500">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Recipients</span>
                </div>
                <div className="mt-1.5 text-4xl font-bold text-neutral-900 tabular-nums">
                  {draftRecipientCount.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-neutral-500">
                  {(editedCampaign.audienceType ?? c.audienceType) === CampaignAudienceType.ALL &&
                    ((editedCampaign.type ?? c.type) === TemplateType.TRANSACTIONAL
                      ? 'All contacts'
                      : 'All subscribed contacts')}
                  {(editedCampaign.audienceType ?? c.audienceType) === CampaignAudienceType.SEGMENT &&
                    (segments?.find(s => s.id === (editedCampaign.segmentId ?? c.segmentId))?.name ?? 'Selected segment')}
                  {(editedCampaign.audienceType ?? c.audienceType) === CampaignAudienceType.FILTERED && 'Filtered contacts'}
                </div>
              </div>

              {/* Compact summary */}
              <div className="rounded-lg border border-neutral-200 divide-y divide-neutral-200 text-sm">
                <div className="grid grid-cols-[80px_1fr] gap-3 px-3 py-2.5">
                  <span className="text-neutral-500">From</span>
                  <span className="text-neutral-900 truncate">{editedCampaign.from || c.from}</span>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-3 px-3 py-2.5">
                  <span className="text-neutral-500">Subject</span>
                  <span className="text-neutral-900 truncate">{editedCampaign.subject || c.subject}</span>
                </div>
              </div>

              {/* Reassurance */}
              <div className="flex items-start gap-2 rounded-lg bg-neutral-50 px-3 py-2.5">
                <Info className="h-4 w-4 text-neutral-500 mt-0.5 shrink-0" />
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Sending takes a few minutes. You can cancel the campaign at any time while it{"'"}s still sending.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialog({type: 'none'})}>
                Not yet
              </Button>
              <Button onClick={async () => { await handleSend(); setDialog({type: 'none'}); }}>
                <Send className="h-4 w-4" />
                Send to {draftRecipientCount.toLocaleString()} {draftRecipientCount === 1 ? 'contact' : 'contacts'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={dialog.type === 'delete'}
          onOpenChange={open => !open && setDialog({type: 'none'})}
          onConfirm={handleDelete}
          title={`Delete ${c.name}?`}
          description="This draft and its content are gone for good."
          confirmText="Delete campaign"
          variant="destructive"
        />
      </DashboardLayout>
    );
  }

  // Render stats view for sent/scheduled campaigns
  return (
    <DashboardLayout>
      <NextSeo title={campaign.data.name} />
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/campaigns"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 truncate">{c.name}</h1>
                {getStatusBadge(c.status)}
                {/* Explains, to someone who arrived by direct link, why this campaign is
                    missing from the list. */}
                {c.archived && (
                  <Badge variant="neutral" className="shrink-0">
                    <Archive className="h-3 w-3" />
                    Archived
                  </Badge>
                )}
              </div>
              {c.description && <p className="text-neutral-500 text-sm sm:text-base">{c.description}</p>}
            </div>
          </div>

          {/* Actions */}
          {c.status === CampaignStatus.SCHEDULED || c.status === CampaignStatus.SENDING ? (
            <div className="flex justify-end">
              <Button variant="destructive" onClick={() => setDialog({type: 'cancel'})} className="w-full sm:w-auto">
                <XCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Cancel campaign</span>
                <span className="sm:hidden">Cancel</span>
              </Button>
            </div>
          ) : (
            /* SENT and CANCELLED. This region was empty for them, and it is the natural place
               to file a campaign away: the user has just finished reading its results. */
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => void handleSetArchived(!c.archived)}
                className="w-full sm:w-auto"
              >
                {c.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {c.archived ? 'Restore campaign' : 'Archive campaign'}
              </Button>
            </div>
          )}
        </div>

        {/* Sending Progress Banner */}
        {c.status === CampaignStatus.SENDING && s && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-neutral-900 text-lg">Sending in progress</h3>
                    <p className="text-sm text-neutral-500 mt-1">
                      {s.sentCount.toLocaleString()} of {s.totalRecipients.toLocaleString()} emails sent
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-neutral-900">
                      {((s.sentCount / s.totalRecipients) * 100).toFixed(0)}%
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">Complete</p>
                  </div>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2">
                  <div
                    className="bg-neutral-900 h-2 rounded-full transition-all duration-500"
                    style={{width: `${(s.sentCount / s.totalRecipients) * 100}%`}}
                  />
                </div>
                <p className="text-xs text-neutral-400">Updating every 5 seconds</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results. Only from the moment sending starts: a scheduled campaign has nothing to
            report yet, and its audience and send time are already in Campaign info below. */}
        {hasResults && statsError && !s && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>Couldn{"'"}t load results. Try again in a moment.</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => void mutateStats()}>
                  Try again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {hasResults && !s && !statsError && (
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-2 w-full" />
              </div>
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-full max-w-lg" />
            </CardContent>
          </Card>
        )}

        {/*
          One panel, one focal point. The previous version gave every metric the same weight,
          which meant the reader had to scan the whole thing to find the answer. Opens are the
          headline because "did anyone read it" is the question this screen exists to answer;
          delivery is a hygiene check and lives in the supporting line, and the three ways a
          contact was lost sit quietest of all, since on a healthy campaign they are all zero.

          Every figure reads number-first ("11 delivered", not "Delivered ... 11") so the
          numbers form a single scannable column instead of pairs separated by whitespace.
        */}
        {hasResults && s && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                {`Sent to ${s.sentCount.toLocaleString()} ${s.sentCount === 1 ? 'contact' : 'contacts'}`}
                {c.sentAt ? ` on ${formatFullDateTime(new Date(c.sentAt))}` : ''}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Headline */}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tabular-nums text-neutral-900">
                    {s.openedCount.toLocaleString()}
                  </span>
                  <span className="text-xl font-medium text-neutral-500">
                    {s.openedCount === 1 ? 'open' : 'opens'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-500">
                  {s.sentCount > 0
                    ? `${s.openRate.toFixed(1)}% of the ${s.sentCount.toLocaleString()} emails sent`
                    : 'Nothing has been sent yet'}
                </p>
                {/* Decorative: the percentage above states the same value. */}
                <div aria-hidden className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-neutral-900"
                    style={{width: `${Math.min(s.openRate, 100)}%`}}
                  />
                </div>
              </div>

              {/* Supporting reach figures, in funnel order */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-neutral-100 pt-4 text-sm">
                {REACH_FIGURES.map(figure => (
                  <span key={figure.label} className="text-neutral-500">
                    <span className="font-medium tabular-nums text-neutral-900">
                      {figure.count(s).toLocaleString()}
                    </span>{' '}
                    {figure.label}
                    {s.sentCount > 0 && (
                      <span className="tabular-nums"> ({figure.rate(s).toFixed(1)}%)</span>
                    )}
                  </span>
                ))}
              </div>

              {/* What it cost. Quietest row: on a healthy campaign every figure here is zero. */}
              <div className="border-t border-neutral-100 pt-4">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  <span className="font-medium tabular-nums text-neutral-900">
                    {lostContacts.toLocaleString()}
                  </span>
                  <span className="text-neutral-500">
                    {lostContacts === 1 ? 'contact lost' : 'contacts lost'}
                    {s.sentCount > 0 && lostContacts > 0
                      ? ` (${((lostContacts / s.sentCount) * 100).toFixed(1)}%)`
                      : ''}
                  </span>
                  {lostContacts > 0 && (
                    <span className="text-neutral-500">
                      —{' '}
                      {LOST_REASONS.filter(reason => reason.count(s) > 0)
                        .map(reason => `${reason.count(s).toLocaleString()} ${reason.label}`)
                        .join(', ')}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-neutral-400">
                  {lostContacts > 0
                    ? 'These contacts no longer receive marketing from this project.'
                    : 'Nobody bounced, complained, or unsubscribed.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaign Details in Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Email Content - Takes 2 columns */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Email preview</CardTitle>
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
                <p className="text-sm font-medium text-neutral-700 mb-3">Message content</p>
                <div className="border-2 border-neutral-200 rounded-lg overflow-hidden bg-white">
                  <div className="p-6 max-h-96 overflow-y-auto">
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(c.body)}} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Details */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign info</CardTitle>
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
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Scheduled for</p>
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
                        <p className="text-xs text-neutral-500">Recipient count will be recalculated at send time</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sent At */}
              {c.sentAt && (
                <div className="pb-3 border-b border-neutral-100">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Sent on</p>
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
        open={dialog.type === 'cancel'}
        onOpenChange={open => !open && setDialog({type: 'none'})}
        onConfirm={handleCancel}
        title={cancelCopy.title}
        description={cancelCopy.description}
        cancelText="Keep sending"
        confirmText={cancelCopy.confirmText}
        variant="destructive"
      />
    </DashboardLayout>
  );
}
