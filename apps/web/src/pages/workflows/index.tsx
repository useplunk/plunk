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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@plunk/ui';
import type {Workflow} from '@plunk/db';
import type {PaginatedResponse} from '@plunk/types';
import {DashboardLayout} from '../../components/DashboardLayout';
import {network} from '../../lib/network';
import {formatRelativeTime} from '../../lib/dateUtils';
import {Calendar, Edit, Plus, Power, PowerOff, Search, Trash2, Workflow as WorkflowIcon} from 'lucide-react';
import {NextSeo} from 'next-seo';
import Link from 'next/link';
import {useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';
import {WorkflowSchemas} from '@plunk/shared';
import dayjs from 'dayjs';

export default function WorkflowsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);

  const {data, mutate, isLoading} = useSWR<
    PaginatedResponse<Workflow & {_count?: {steps: number; executions: number}}>
  >(`/workflows?page=${page}&pageSize=20${search ? `&search=${search}` : ''}`, {revalidateOnFocus: false});

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async () => {
    if (!workflowToDelete) return;

    try {
      await network.fetch('DELETE', `/workflows/${workflowToDelete}`);
      toast.success('Workflow deleted successfully');
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete workflow');
    } finally {
      setWorkflowToDelete(null);
    }
  };

  const handleToggleEnabled = async (workflowId: string, currentlyEnabled: boolean) => {
    try {
      await network.fetch<Workflow, typeof WorkflowSchemas.update>('PATCH', `/workflows/${workflowId}`, {
        enabled: !currentlyEnabled,
      });
      toast.success(`Workflow ${!currentlyEnabled ? 'enabled' : 'disabled'} successfully`);
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to toggle workflow');
    }
  };

  return (
    <>
      <NextSeo title="Workflows" />
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Workflows</h1>
              <p className="text-neutral-500 mt-2 text-sm sm:text-base">
                Automate your email campaigns with powerful workflows.{' '}
                {data?.total ? `${data.total} total workflows` : ''}
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Workflow</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>

          {/* Search & Filters */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <Input
                    type="text"
                    placeholder="Search workflows..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button type="submit">Search</Button>
                {search && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearch('');
                      setSearchInput('');
                      setPage(1);
                    }}
                  >
                    Clear
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Workflows Grid */}
          <div className="grid gap-4">
            {isLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <svg
                        className="h-8 w-8 animate-spin mx-auto text-neutral-900"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-neutral-500">Loading workflows...</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : data?.data.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <WorkflowIcon className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">No workflows found</h3>
                    <p className="text-neutral-500 mb-6">
                      {search ? 'Try adjusting your search terms' : 'Get started by creating your first workflow'}
                    </p>
                    {!search && (
                      <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4" />
                        Create Workflow
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {data?.data.map(workflow => (
                  <Card key={workflow.id} className={workflow.enabled ? 'border-green-200' : ''}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <CardTitle>{workflow.name}</CardTitle>
                            <Badge variant={workflow.enabled ? 'green' : 'neutral'}>
                              {workflow.enabled ? (
                                <>
                                  <Power className="h-3 w-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <PowerOff className="h-3 w-3 mr-1" />
                                  Disabled
                                </>
                              )}
                            </Badge>

                            {workflow.triggerConfig &&
                              typeof workflow.triggerConfig === 'object' &&
                              'eventName' in workflow.triggerConfig && (
                                <Badge variant={'info'}>{String(workflow.triggerConfig.eventName)}</Badge>
                              )}
                          </div>
                          {workflow.description && (
                            <CardDescription className="mt-2">{workflow.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleEnabled(workflow.id, workflow.enabled)}
                          >
                            {workflow.enabled ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                          </Button>
                          <Link href={`/workflows/${workflow.id}`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setWorkflowToDelete(workflow.id);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6 text-sm text-neutral-500">
                        <div>
                          <span className="font-medium text-neutral-900">{workflow._count?.steps ?? 0}</span> steps
                        </div>
                        <div>
                          <span className="font-medium text-neutral-900">{workflow._count?.executions ?? 0}</span>{' '}
                          executions
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-neutral-500 pt-3 border-t border-neutral-100">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          <div className="group relative inline-block cursor-help">
                            <span>Created {formatRelativeTime(workflow.createdAt)}</span>
                            <div className="hidden group-hover:block absolute z-10 w-48 p-2 bg-neutral-900 text-white text-xs rounded shadow-lg bottom-full left-0 mb-1 whitespace-nowrap">
                              {dayjs(workflow.createdAt).format('DD MMMM YYYY, hh:mm')}
                            </div>
                          </div>
                        </div>
                        <div className="group relative inline-block cursor-help">
                          <span>• Updated {formatRelativeTime(workflow.updatedAt)}</span>
                          <div className="hidden group-hover:block absolute z-10 w-48 p-2 bg-neutral-900 text-white text-xs rounded shadow-lg bottom-full left-0 mb-1 whitespace-nowrap">
                            {dayjs(workflow.updatedAt).format('DD MMMM YYYY, hh:mm')}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-neutral-500">
                      Showing {(page - 1) * data.pageSize + 1} to {Math.min(page * data.pageSize, data.total)} of{' '}
                      {data.total} workflows
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                        Previous
                      </Button>
                      <span className="text-sm text-neutral-700">
                        Page {page} of {data.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page === data.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Create Workflow Dialog */}
        <CreateWorkflowDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onSuccess={() => mutate()} />

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          title="Delete Workflow"
          description="Are you sure you want to delete this workflow? This action cannot be undone."
          confirmText="Delete"
          variant="destructive"
        />
      </DashboardLayout>
    </>
  );
}

interface CreateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function CreateWorkflowDialog({open, onOpenChange, onSuccess}: CreateWorkflowDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventName, setEventName] = useState('');
  const [allowReentry, setAllowReentry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch available event names
  const {data: eventNamesData} = useSWR<{eventNames: string[]}>(open ? '/events/names' : null, {
    revalidateOnFocus: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const workflow = await network.fetch<Workflow, typeof WorkflowSchemas.create>('POST', '/workflows', {
        name,
        description: description || undefined,
        eventName: eventName.trim(),
        allowReentry,
        enabled: false,
      });

      toast.success('Workflow created successfully');
      setName('');
      setDescription('');
      setEventName('');
      setAllowReentry(false);
      onOpenChange(false);
      onSuccess();

      // Redirect to the workflow editor
      window.location.href = `/workflows/${workflow.id}`;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create workflow');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Workflow</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Welcome Email Sequence"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Send a series of welcome emails to new subscribers"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="createEventName">Trigger Event *</Label>
            <Input
              id="createEventName"
              type="text"
              list="createEventNameSuggestions"
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              placeholder="e.g., contact.created, email.opened"
              required
            />
            {eventNamesData?.eventNames && eventNamesData.eventNames.length > 0 && (
              <datalist id="createEventNameSuggestions">
                {eventNamesData.eventNames.map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            )}
            <p className="text-xs text-neutral-500 mt-1">
              The event that triggers this workflow to start for a contact
            </p>
          </div>

          <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
            <input
              id="allowReentry"
              type="checkbox"
              checked={allowReentry}
              onChange={e => setAllowReentry(e.target.checked)}
              className="mt-1 h-4 w-4 text-neutral-900 focus:ring-neutral-900 border-neutral-300 rounded"
            />
            <div className="flex-1">
              <Label htmlFor="allowReentry" className="font-medium cursor-pointer">
                Allow Re-entry
              </Label>
              <p className="text-xs text-neutral-500 mt-1">
                When enabled, contacts can enter this workflow multiple times. When disabled, contacts can only enter
                once, ever.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? 'Creating...' : 'Create Workflow'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
