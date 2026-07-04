import {Button, Card, CardContent} from '@plunk/ui';
import type {Form} from '@plunk/db';
import {DashboardLayout} from '../../components/DashboardLayout';
import {FormEditor} from '../../components/FormEditor';
import {network} from '../../lib/network';
import {DASHBOARD_URI} from '../../lib/constants';
import {ArrowLeft, ClipboardCopy, ExternalLink} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {NextSeo} from 'next-seo';
import {toast} from 'sonner';
import useSWR from 'swr';

export default function FormDetailPage() {
  const router = useRouter();
  const {id} = router.query;
  const {data: form} = useSWR<Form>(id ? `/forms/${id}` : null);

  const copyLink = async () => {
    if (!form) return;
    const url = `${DASHBOARD_URI}/form/${form.publicId}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  return (
    <>
      <NextSeo title={form?.name ?? 'Form'} />
      <DashboardLayout>
        <div className="space-y-6 max-w-6xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button asChild variant="outline" size="sm">
                <Link href="/forms">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">{form?.name ?? 'Form'}</h1>
                <p className="text-neutral-500 mt-1">Edit form settings and destination</p>
              </div>
            </div>
            {form && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => void copyLink()}>
                  <ClipboardCopy className="h-4 w-4 mr-1" />
                  Copy link
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/form/${form.publicId}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Preview
                  </a>
                </Button>
              </div>
            )}
          </div>

          {form && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-neutral-600">
                  Public URL:{' '}
                  <code className="bg-neutral-100 px-2 py-1 rounded text-xs break-all">
                    {DASHBOARD_URI}/form/{form.publicId}
                  </code>
                </p>
                <p className="text-sm text-neutral-500 mt-2">
                  {form.submissions} submission{form.submissions !== 1 ? 's' : ''} · slug{' '}
                  <code className="bg-neutral-100 px-1 rounded">{form.slug}</code>
                </p>
              </CardContent>
            </Card>
          )}

          {typeof id === 'string' && <FormEditor mode="edit" formId={id} />}
        </div>
      </DashboardLayout>
    </>
  );
}
