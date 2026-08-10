import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  IconSpinner,
  Input,
  Label,
} from '@plunk/ui';
import type {Contact, Segment} from '@plunk/db';
import type {PaginatedResponse} from '@plunk/types';
import {DashboardLayout} from '../../components/DashboardLayout';
import {network} from '../../lib/network';
import {ArrowLeft, Database, Filter, Layers, MailCheck, MailX, RefreshCw, Save, Trash2, UserMinus, Users} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';
import {NextSeo} from 'next-seo';
import type {FilterCondition} from '@plunk/types';
import {SegmentSchemas} from '@plunk/shared';
import {SegmentFilterBuilder} from '../../components/SegmentFilterBuilder';
import {ContactPicker} from '../../components/ContactPicker';
import dayjs from 'dayjs';

type SegmentType = 'DYNAMIC' | 'STATIC';
type SegmentWithType = Segment & {type: SegmentType};

// Count total filters in a condition (recursive)
function countFilters(condition: FilterCondition): number {
  let count = 0;
  for (const group of condition.groups) {
    count += group.filters.length;
    if (group.conditions) {
      count += countFilters(group.conditions);
    }
  }
  return count;
}

export default function SegmentDetailPage() {
  const router = useRouter();
  const {id} = router.query;

  const {data: segment, mutate, isLoading} = useSWR<SegmentWithType>(id ? `/segments/${id}` : null);
  const [contactsPage, setContactsPage] = useState(1);
  const {
    data: contactsData,
    isLoading: isLoadingContacts,
    mutate: mutateContacts,
  } = useSWR<PaginatedResponse<Contact>>(id ? `/segments/${id}/contacts?page=${contactsPage}&pageSize=10` : null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trackMembership, setTrackMembership] = useState(false);
  const [condition, setCondition] = useState<FilterCondition>({
    logic: 'AND',
    groups: [{filters: [{field: 'subscribed', operator: 'equals', value: true}]}],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Static segment member management
  const [pickedEmails, setPickedEmails] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (segment) {
      setName(segment.name);
      setDescription(segment.description || '');
      setTrackMembership(segment.trackMembership);
      setCondition(
        (segment.condition as unknown as FilterCondition) || {
          logic: 'AND',
          groups: [{filters: [{field: 'subscribed', operator: 'equals', value: true}]}],
        },
      );
    }
  }, [segment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await network.fetch<Segment, typeof SegmentSchemas.update>('PATCH', `/segments/${id}`, {
        name,
        description: description || undefined,
        ...(segment?.type !== 'STATIC' && {condition}),
        trackMembership,
      });
      toast.success('Segment updated');
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t save the segment. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComputeMembership = async () => {
    if (!trackMembership) {
      toast.error('Membership tracking must be enabled to compute membership');
      return;
    }

    setIsComputing(true);
    try {
      const result = await network.fetch<{added: number; removed: number; total: number}>(
        'POST',
        `/segments/${id}/compute`,
      );
      toast.success(`Membership updated: ${result.added} added, ${result.removed} removed, ${result.total} total`);
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t recompute membership. Try again.');
    } finally {
      setIsComputing(false);
    }
  };

  const handleAddMembers = async (emails: string[], subscribed = true) => {
    setIsAddingMembers(true);
    try {
      const result = await network.fetch<{added: number; created: number; notFound: string[]}, typeof SegmentSchemas.members>(
        'POST',
        `/segments/${id}/members`,
        {emails, createMissing: true, subscribed},
      );

      const msg = result.created > 0
        ? `Added ${result.added} contact${result.added !== 1 ? 's' : ''} (${result.created} new)`
        : `Added ${result.added} contact${result.added !== 1 ? 's' : ''} to segment`;
      toast.success(msg);
      setPickedEmails([]);
      void mutate();
      void mutateContacts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t add those contacts. Try again.');
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleRemoveMember = async (email: string) => {
    setRemovingEmail(email);
    try {
      await network.fetch<{removed: number}, typeof SegmentSchemas.members>('DELETE', `/segments/${id}/members`, {
        emails: [email],
      });
      toast.success(`Removed ${email} from segment`);
      void mutate();
      void mutateContacts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t remove the contact. Try again.');
    } finally {
      setRemovingEmail(null);
    }
  };

  const handleDelete = async () => {
    try {
      await network.fetch('DELETE', `/segments/${id}`);
      toast.success('Segment deleted');
      void router.push('/segments');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t delete the segment. Try again.');
    }
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

  if (!segment) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-neutral-900 mb-2">Segment not found</h3>
          <p className="text-neutral-500 mb-6">
            The segment you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <Button asChild>
            <Link href="/segments">
              <ArrowLeft className="h-4 w-4" />
              Back to segments
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isStatic = segment.type === 'STATIC';

  return (
    <DashboardLayout>
      <NextSeo title={segment.name} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/segments"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">{segment.name}</h1>
                <Badge variant={isStatic ? 'neutral' : 'default'}>
                  {isStatic ? 'Static' : 'Dynamic'}
                </Badge>
              </div>
              {segment.description && <p className="text-neutral-500 mt-1">{segment.description}</p>}
            </div>
          </div>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4" />
            Delete segment
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Edit Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Segment details</CardTitle>
                  <CardDescription>Update segment name and description</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name">Segment name
            <span className="text-red-500"> *</span>
          </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      placeholder="e.g., Active Pro Users"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      type="text"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="e.g., Users on pro plan who have been active in the last 30 days"
                      maxLength={500}
                    />
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                    <input
                      id="trackMembership"
                      type="checkbox"
                      checked={trackMembership}
                      onChange={e => setTrackMembership(e.target.checked)}
                      className="mt-1 h-4 w-4 text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border-neutral-300 rounded"
                    />
                    <div className="flex-1">
                      <Label htmlFor="trackMembership" className="font-medium cursor-pointer">
                        Track membership changes
                      </Label>
                      <p className="text-xs text-neutral-500 mt-1">
                        When enabled, segment entry and exit events will be tracked for use in workflows and analytics
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Filter Builder (DYNAMIC only) */}
              {!isStatic && (
                <Card>
                  <CardHeader>
                    <CardTitle>Filter conditions</CardTitle>
                    <CardDescription>Build complex audience filters with AND/OR logic</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SegmentFilterBuilder condition={condition} onChange={setCondition} currentSegmentId={id as string} />
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>

            {/* Static member management */}
            {isStatic && (
              <Card>
                <CardHeader>
                  <CardTitle>Add members</CardTitle>
                  <CardDescription>Search and select contacts, or paste a list of emails</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ContactPicker
                    selected={pickedEmails}
                    onChange={setPickedEmails}
                    onAdd={handleAddMembers}
                    existing={contactsData?.data.map(c => c.email) ?? []}
                    placeholder="Search contacts to add…"
                  />
                  {pickedEmails.length > 0 && (
                    <Button
                      type="button"
                      onClick={() => void handleAddMembers(pickedEmails)}
                      disabled={isAddingMembers}
                      className="w-full"
                    >
                      {isAddingMembers ? 'Adding…' : `Add ${pickedEmails.length} Contact${pickedEmails.length !== 1 ? 's' : ''}`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contacts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{isStatic ? 'Members' : 'Matching Contacts'}</CardTitle>
                    <CardDescription>
                      {isStatic ? 'Contacts in this static segment' : "Contacts that match this segment's filters"}
                    </CardDescription>
                  </div>
                  {!isStatic && trackMembership && (
                    <Button variant="outline" size="sm" onClick={handleComputeMembership} disabled={isComputing}>
                      <RefreshCw className={`h-4 w-4 ${isComputing ? 'animate-spin' : ''}`} />
                      {isComputing ? 'Computing…' : 'Recompute'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingContacts ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-neutral-500">Loading contacts...</p>
                  </div>
                ) : contactsData?.data.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title={isStatic ? 'No members yet' : 'No contacts match'}
                    description={isStatic ? 'Add contacts to this segment to get started.' : 'No contacts currently match these filter conditions.'}
                  />
                ) : (
                  <>
                    <div className="space-y-2">
                      {contactsData?.data.map(contact => (
                        <div key={contact.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            {contact.subscribed ? (
                              <MailCheck className="h-4 w-4 text-green-600" />
                            ) : (
                              <MailX className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-sm font-medium">{contact.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/contacts/${contact.id}`}>View</Link>
                            </Button>
                            {isStatic && (
                              <Button
                                variant="destructiveGhost"
                                size="sm"
                                onClick={() => handleRemoveMember(contact.email)}
                                disabled={removingEmail === contact.email}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {contactsData && contactsData.totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-sm text-neutral-500">
                          Page {contactsPage} of {contactsData.totalPages} ({contactsData.total} total)
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setContactsPage(p => p - 1)}
                            disabled={contactsPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setContactsPage(p => p + 1)}
                            disabled={contactsPage === contactsData.totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Metadata Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-neutral-500" />
                    <span className="text-sm text-neutral-600">Members</span>
                  </div>
                  <span className="text-2xl font-bold text-neutral-900">{segment.memberCount}</span>
                </div>

                {!isStatic && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-neutral-500" />
                        <span className="text-sm text-neutral-600">Filters</span>
                      </div>
                      <span className="text-lg font-semibold text-neutral-900">
                        {countFilters(segment.condition as unknown as FilterCondition)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-neutral-500" />
                        <span className="text-sm text-neutral-600">Groups</span>
                      </div>
                      <span className="text-lg font-semibold text-neutral-900">
                        {(segment.condition as unknown as FilterCondition)?.groups?.length || 0}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Database className="h-5 w-5 text-neutral-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900">Segment ID</p>
                    <p className="text-xs text-neutral-500 font-mono break-all">{segment.id}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-neutral-900">Created</p>
                  <div className="group relative inline-block cursor-help">
                    <p className="text-sm text-neutral-500">{dayjs(segment.createdAt).fromNow()}</p>
                    <div className="hidden group-hover:block absolute z-10 w-48 p-2 bg-neutral-900 text-white text-xs rounded shadow-md bottom-full left-0 mb-1 whitespace-nowrap">
                      {dayjs(segment.createdAt).format('DD MMMM YYYY, hh:mm')}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-neutral-900">Last updated</p>
                  <div className="group relative inline-block cursor-help">
                    <p className="text-sm text-neutral-500">{dayjs(segment.updatedAt).fromNow()}</p>
                    <div className="hidden group-hover:block absolute z-10 w-48 p-2 bg-neutral-900 text-white text-xs rounded shadow-md bottom-full left-0 mb-1 whitespace-nowrap">
                      {dayjs(segment.updatedAt).format('DD MMMM YYYY, hh:mm')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title={`Delete ${segment.name}?`}
        description="The contacts in it are kept. Only the segment is deleted."
        confirmText="Delete segment"
        variant="destructive"
      />
    </DashboardLayout>
  );
}
