import {Button, Card, CardContent} from '@plunk/ui';
import type {Form} from '@plunk/db';
import {DashboardLayout} from '../../components/DashboardLayout';
import {FormEditor} from '../../components/FormEditor';
import {ArrowLeft} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {NextSeo} from 'next-seo';
import useSWR from 'swr';

export default function FormDetailPage() {
  const router = useRouter();
  const {id} = router.query;
  const {data: form} = useSWR<Form>(id ? `/forms/${id}` : null);

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
              <Button variant="outline" size="sm" asChild>
                <Link href="/landing-pages">Manage landing pages</Link>
              </Button>
            )}
          </div>

          {form && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-neutral-600">
                  Share this form by adding a <strong>Form</strong> block to a landing page, then publish and share the
                  landing page link (<code className="bg-neutral-100 px-1 rounded text-xs">/p/&#123;publicId&#125;</code>
                  ).
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
