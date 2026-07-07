import {
  Badge,
  Button,
  Card,
  CardContent,
  ConfirmDialog,
  EmptyState,
  IconSpinner,
  Input,
} from '@plunk/ui';
import type {Form} from '@plunk/db';
import {DashboardLayout} from '../../components/DashboardLayout';
import {network} from '../../lib/network';
import {formatRelativeTime} from '../../lib/dateUtils';
import {Edit, FileInput, Plus, Search, Trash2} from 'lucide-react';
import {NextSeo} from 'next-seo';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';

type FormWithSegment = Form & {
  segment?: {id: string; name: string; type: string} | null;
};

export default function FormsPage() {
  const {data: forms, mutate, isLoading} = useSWR<FormWithSegment[]>('/forms', {
    revalidateOnFocus: false,
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const filteredForms = useMemo(() => {
    if (!forms || !searchInput.trim()) return forms;
    const q = searchInput.toLowerCase();
    return forms.filter(f => f.name.toLowerCase().includes(q) || f.slug.toLowerCase().includes(q));
  }, [forms, searchInput]);

  const handleDelete = async () => {
    if (!formToDelete) return;
    try {
      await network.fetch('DELETE', `/forms/${formToDelete}`);
      toast.success('Form deleted');
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete form');
    } finally {
      setFormToDelete(null);
    }
  };

  return (
    <>
      <NextSeo title="Forms" />
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Forms</h1>
              <p className="text-neutral-500 mt-1">
                Create forms to embed in{' '}
                <Link href="/landing-pages" className="text-neutral-700 hover:underline">
                  landing pages
                </Link>
              </p>
            </div>
            <Button asChild>
              <Link href="/forms/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Form
              </Link>
            </Button>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search forms..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <IconSpinner />
            </div>
          ) : !filteredForms?.length ? (
            <EmptyState
              icon={FileInput}
              title={searchInput ? 'No forms found' : 'No forms yet'}
              description={
                searchInput
                  ? 'Try a different search term'
                  : 'Create a form to collect signups and add contacts to your segments'
              }
              action={
                !searchInput ? (
                  <Button asChild>
                    <Link href="/forms/new">Create your first form</Link>
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4">
              {filteredForms.map(form => (
                <Card key={form.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/forms/${form.id}`} className="text-lg font-semibold text-neutral-900 hover:underline truncate">
                            {form.name}
                          </Link>
                          <Badge variant={form.enabled ? 'default' : 'secondary'}>
                            {form.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        <p className="text-sm text-neutral-500">
                          /{form.slug} · {form.submissions} submission{form.submissions !== 1 ? 's' : ''}
                          {form.segment ? ` · ${form.segment.name}` : ''}
                        </p>
                        <p className="text-xs text-neutral-400">Created {formatRelativeTime(form.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/forms/${form.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormToDelete(form.id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={() => void handleDelete()}
          title="Delete form"
          description="This will permanently delete the form. Embedded forms on landing pages will stop accepting submissions. Contacts already captured are not removed."
          confirmText="Delete"
          variant="destructive"
        />
      </DashboardLayout>
    </>
  );
}
