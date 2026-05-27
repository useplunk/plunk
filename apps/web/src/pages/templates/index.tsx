import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  IconSpinner,
  Input,
} from '@plunk/ui';
import type {Template} from '@plunk/db';
import type {PaginatedResponse} from '@plunk/types';
import {EmptyState} from '@plunk/ui';
import {DashboardLayout} from '../../components/DashboardLayout';
import {network} from '../../lib/network';
import {formatRelativeTime} from '../../lib/dateUtils';
import {Calendar, Files, Copy, Edit, FileText, Plus, Search, Trash2, X} from 'lucide-react';
import {NextSeo} from 'next-seo';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';
import dayjs from 'dayjs';

export default function TemplatesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'TRANSACTIONAL' | 'MARKETING' | 'HEADLESS'>('ALL');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const {data, mutate, isLoading} = useSWR<PaginatedResponse<Template>>(
    `/templates?page=${page}&pageSize=20${search ? `&search=${search}` : ''}${typeFilter !== 'ALL' ? `&type=${typeFilter}` : ''}`,
    {revalidateOnFocus: false},
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = async () => {
    if (!templateToDelete) return;

    try {
      await network.fetch('DELETE', `/templates/${templateToDelete}`);
      toast.success('Template deleted successfully');
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete template');
    } finally {
      setTemplateToDelete(null);
    }
  };

  const handleDuplicate = async (templateId: string) => {
    try {
      await network.fetch('POST', `/templates/${templateId}/duplicate`);
      toast.success('Template duplicated successfully');
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate template');
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <>
      <NextSeo title="Templates" />
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Email Templates</h1>
              <p className="text-neutral-500 mt-2 text-sm sm:text-base">
                Create and manage reusable email templates for your campaigns and workflows.{' '}
                {data?.total ? `${data.total} total templates` : ''}
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/templates/create">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Template</span>
                <span className="sm:hidden">Create</span>
              </Link>
            </Button>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                type="text"
                placeholder="Search templates..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="pl-10 pr-10 h-8 text-xs"
              />
              {searchInput && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchInput('');
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5 shrink-0">
              {(['ALL', 'MARKETING', 'TRANSACTIONAL', 'HEADLESS'] as const).map(type => (
                <Button
                  key={type}
                  type="button"
                  onClick={() => { setTypeFilter(type); setPage(1); }}
                  variant={typeFilter === type ? 'default' : 'secondary'}
                  size="sm"
                >
                  {type === 'ALL' ? 'All' : type.charAt(0) + type.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* Templates */}
          <div>
            {isLoading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-12">
                    <IconSpinner />
                  </div>
                </CardContent>
              </Card>
            ) : data?.data.length === 0 ? (
              <Card>
                <CardContent>
                  <EmptyState
                    icon={FileText}
                    title={search ? 'No templates match' : 'No templates yet'}
                    description={search ? 'Try a different search term.' : 'Create reusable email designs for campaigns.'}
                    action={
                      !search ? (
                        <Button asChild>
                          <Link href="/templates/create">
                            <Plus className="h-4 w-4" />
                            Create Template
                          </Link>
                        </Button>
                      ) : undefined
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data?.data.map(template => (
                    <Card key={template.id} className="transition-colors hover:border-neutral-300 flex flex-col [&:has([data-card-link]:focus-visible)]:ring-2 [&:has([data-card-link]:focus-visible)]:ring-ring [&:has([data-card-link]:focus-visible)]:ring-offset-2">
                      <Link
                        href={`/templates/${template.id}`}
                        data-card-link=""
                        className="flex-1 block p-6 pb-4 hover:bg-neutral-50/50 transition-colors rounded-t-xl focus-visible:outline-none"
                        aria-label={`Edit ${template.name}`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="font-semibold text-neutral-900 leading-snug">{template.name}</h3>
                          <Badge
                            className="capitalize shrink-0 mt-0.5"
                            variant="neutral"
                          >
                            {template.type.toLowerCase()}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-neutral-700 truncate">{template.subject}</p>
                      </Link>
                      <div className="px-6 py-3 border-t border-neutral-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                          <Calendar className="h-3 w-3" />
                          <div className="group relative inline-block cursor-help">
                            <span>Updated {formatRelativeTime(template.updatedAt)}</span>
                            <div className="hidden group-hover:block absolute z-10 w-48 p-2 bg-neutral-900 text-white text-xs rounded shadow-md bottom-full left-0 mb-1 whitespace-nowrap">
                              {dayjs(template.updatedAt).format('DD MMMM YYYY, hh:mm')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Copy template ID"
                            onClick={() => copyToClipboard(template.id, 'Template ID')}
                          >
                            <Files className="h-4 w-4" />
                          </Button>
                          <Button asChild variant="ghost" size="sm" title="Edit template">
                            <Link href={`/templates/${template.id}`} aria-label="Edit template"><Edit className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="ghost" size="sm" title="Duplicate template" onClick={() => handleDuplicate(template.id)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete template"
                            onClick={() => {
                              setTemplateToDelete(template.id);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {data && data.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-neutral-500">
                      Showing {(page - 1) * data.pageSize + 1} to {Math.min(page * data.pageSize, data.total)} of{' '}
                      {data.total} templates
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

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          title="Delete Template"
          description="Are you sure you want to delete this template? This action cannot be undone."
          confirmText="Delete"
          variant="destructive"
        />
      </DashboardLayout>
    </>
  );
}
