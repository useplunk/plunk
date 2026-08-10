/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  IconSpinner,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItemWithDescription,
  SelectTrigger,
  SelectValue,
} from '@plunk/ui';
import type {Segment, Template} from '@plunk/db';
import {CampaignAudienceType, TemplateType} from '@plunk/db';
import {NextSeo} from 'next-seo';
import {DashboardLayout} from '../../components/DashboardLayout';
import {EmailSettings} from '../../components/EmailSettings';
import {EmailEditor} from '../../components/EmailEditor';
import {network} from '../../lib/network';
import {EmailFormValidator} from '../../lib/validation';
import {ArrowLeft, TriangleAlert} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';
import {detectUnsubscribeSignal} from '@plunk/shared';
import {useActiveProject} from '../../lib/contexts/ActiveProjectProvider';

export default function CreateCampaignPage() {
  const router = useRouter();
  const {activeProject} = useActiveProject();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [from, setFrom] = useState('');
  const [fromName, setFromName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [campaignType, setCampaignType] = useState<TemplateType>(TemplateType.MARKETING);
  const [audienceType, setAudienceType] = useState<CampaignAudienceType>(CampaignAudienceType.ALL);
  const [segmentId, setSegmentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const {data: segments} = useSWR<Segment[]>('/segments', {revalidateOnFocus: false});

  useEffect(() => {
    const loadData = async () => {
      const {
        templateId,
        campaignId,
        name: queryName,
        subject: querySubject,
        from: queryFrom,
        fromName: queryFromName,
        replyTo: queryReplyTo,
        audienceType: queryAudienceType,
        segmentId: querySegmentId,
      } = router.query;

      if (templateId && typeof templateId === 'string') {
        setLoadingTemplate(true);
        try {
          const template = await network.fetch<Template>('GET', `/templates/${templateId}`);
          if (queryName && typeof queryName === 'string') setName(queryName);
          if (querySubject && typeof querySubject === 'string') setSubject(querySubject);
          if (queryFrom && typeof queryFrom === 'string') setFrom(queryFrom);
          if (queryFromName && typeof queryFromName === 'string') setFromName(queryFromName);
          if (queryReplyTo && typeof queryReplyTo === 'string') setReplyTo(queryReplyTo);
          setBody(template.body);
          toast.success('Template loaded');
        } catch {
          toast.error('Couldn’t load that template. Try again.');
        } finally {
          setLoadingTemplate(false);
        }
      } else if (campaignId && typeof campaignId === 'string') {
        setLoadingTemplate(true);
        try {
          const campaign = await network.fetch<{data: {body: string}}>('GET', `/campaigns/${campaignId}`);
          if (queryName && typeof queryName === 'string') setName(queryName);
          if (querySubject && typeof querySubject === 'string') setSubject(querySubject);
          if (queryFrom && typeof queryFrom === 'string') setFrom(queryFrom);
          if (queryFromName && typeof queryFromName === 'string') setFromName(queryFromName);
          if (queryReplyTo && typeof queryReplyTo === 'string') setReplyTo(queryReplyTo);
          if (queryAudienceType && typeof queryAudienceType === 'string') {
            setAudienceType(queryAudienceType as CampaignAudienceType);
          }
          if (querySegmentId && typeof querySegmentId === 'string') setSegmentId(querySegmentId);
          setBody(campaign.data.body);
          toast.success('Campaign loaded');
        } catch {
          toast.error('Couldn’t load that campaign. Try again.');
        } finally {
          setLoadingTemplate(false);
        }
      } else {
        if (queryName && typeof queryName === 'string') setName(queryName);
        if (querySubject && typeof querySubject === 'string') setSubject(querySubject);
        if (queryFrom && typeof queryFrom === 'string') setFrom(queryFrom);
        if (queryFromName && typeof queryFromName === 'string') setFromName(queryFromName);
        if (queryReplyTo && typeof queryReplyTo === 'string') setReplyTo(queryReplyTo);
        if (queryAudienceType && typeof queryAudienceType === 'string') {
          setAudienceType(queryAudienceType as CampaignAudienceType);
        }
        if (querySegmentId && typeof querySegmentId === 'string') setSegmentId(querySegmentId);
      }
    };

    if (router.isReady) {
      void loadData();
    }
  }, [router.isReady, router.query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = EmailFormValidator.validateCampaign({name, subject, body, from, segmentId}, audienceType);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);

    try {
      const response = await network.fetch<{data: {id: string}}>('POST', '/campaigns', {
        name,
        description: description || undefined,
        subject,
        body,
        from,
        fromName: fromName || null,
        replyTo: replyTo || null,
        type: campaignType,
        audienceType,
        segmentId: audienceType === CampaignAudienceType.SEGMENT ? segmentId : undefined,
        audienceFilter: audienceType === CampaignAudienceType.FILTERED ? [] : undefined,
      } as any);

      toast.success('Campaign created');
      void router.push(`/campaigns/${response.data.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t create the campaign. Try again.');
      setSaving(false);
    }
  };

  const getEstimatedRecipients = () => {
    if (audienceType === CampaignAudienceType.SEGMENT && segmentId && segments) {
      const segment = segments.find(s => s.id === segmentId);
      return segment?.memberCount || 0;
    }
    return 0;
  };

  const estimatedRecipients = getEstimatedRecipients();

  return (
    <>
      <NextSeo title="Create campaign" />
      <DashboardLayout>
        {loadingTemplate && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-5 flex items-center gap-3">
              <IconSpinner />
              <p className="text-sm text-neutral-700">Loading template...</p>
            </div>
          </div>
        )}
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 sm:gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/campaigns"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Create campaign</h1>
              <p className="text-neutral-500 mt-1 text-sm sm:text-base">
                A one-off email sent to a list of contacts.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Row 1: Basic Info + Campaign Type */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Basic information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        Campaign Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="e.g., Spring Sale Announcement"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        placeholder="e.g., Q2 launch, list A"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Campaign Type */}
                <Card>
                  <CardHeader>
                    <CardTitle>Campaign type</CardTitle>
                    <CardDescription>Transactional campaigns skip the subscription check and the footer.</CardDescription>
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
                          onClick={() => setCampaignType(value)}
                          className={`flex items-center justify-between w-full min-h-[44px] px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                            campaignType === value
                              ? 'border-neutral-900 bg-neutral-50'
                              : 'border-neutral-200 hover:border-neutral-300'
                          }`}
                        >
                          <span className="font-medium text-sm text-neutral-900 shrink-0">{label}</span>
                          <span className="text-xs text-neutral-500 ml-4 text-right">{description}</span>
                        </button>
                      ))}
                    </div>
                    {campaignType === TemplateType.HEADLESS && !detectUnsubscribeSignal(body) && (
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
                </CardHeader>
                <CardContent className="space-y-4">
                  <EmailSettings
                    from={from}
                    fromName={fromName}
                    replyTo={replyTo}
                    onFromChange={setFrom}
                    onFromNameChange={setFromName}
                    onReplyToChange={setReplyTo}
                    fromNamePlaceholder={activeProject?.name || 'Your Company'}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="subject">
                      Email Subject <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="subject"
                      placeholder="e.g., Introducing our Spring Sale!"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Email Content */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle>Email content</CardTitle>
                </CardHeader>
                <CardContent>
                  <EmailEditor
                    value={body}
                    onChange={setBody}
                    segmentId={audienceType === CampaignAudienceType.SEGMENT ? segmentId || undefined : undefined}
                  />
                </CardContent>
              </Card>

              {/* Audience */}
              <Card>
                <CardHeader>
                  <CardTitle>Audience</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="audienceType">
                      Audience Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={audienceType}
                      onValueChange={value => setAudienceType(value as CampaignAudienceType)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select audience type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItemWithDescription
                          value={CampaignAudienceType.ALL}
                          title={campaignType === TemplateType.TRANSACTIONAL ? 'All Contacts' : 'All Subscribed Contacts'}
                          description={campaignType === TemplateType.TRANSACTIONAL ? 'Send to all contacts regardless of subscription status' : "Send to everyone who hasn't unsubscribed"}
                        />
                        <SelectItemWithDescription
                          value={CampaignAudienceType.SEGMENT}
                          title="Specific segment"
                          description="Target a defined group of contacts"
                        />
                      </SelectContent>
                    </Select>
                  </div>

                  {audienceType === CampaignAudienceType.SEGMENT && (
                    <div className="space-y-2">
                      <Label htmlFor="segment">
                        Select Segment <span className="text-red-500">*</span>
                      </Label>
                      <Select value={segmentId} onValueChange={setSegmentId} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a segment" />
                        </SelectTrigger>
                        <SelectContent>
                          {segments?.map(segment => (
                            <SelectItemWithDescription
                              key={segment.id}
                              value={segment.id}
                              title={segment.name}
                              description={`${segment.memberCount.toLocaleString()} contacts`}
                            />
                          ))}
                        </SelectContent>
                      </Select>
                      {segments?.length === 0 && (
                        <p className="text-sm text-neutral-500">
                          No segments found.{' '}
                          <Link href="/segments/new" className="underline">
                            Create one first
                          </Link>
                        </p>
                      )}
                      {estimatedRecipients > 0 && (
                        <p className="text-sm text-neutral-500">
                          <span className="font-medium text-neutral-900">{estimatedRecipients.toLocaleString()} recipients</span> in this segment
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button asChild variant="outline">
                  <Link href="/campaigns">Cancel</Link>
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Campaign'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DashboardLayout>
    </>
  );
}
