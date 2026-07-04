import {Button} from '@plunk/ui';
import {DashboardLayout} from '../../components/DashboardLayout';
import {FormEditor} from '../../components/FormEditor';
import {ArrowLeft} from 'lucide-react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';

export default function NewFormPage() {
  return (
    <>
      <NextSeo title="Create Form" />
      <DashboardLayout>
        <div className="space-y-6 max-w-6xl">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/forms">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Create Form</h1>
              <p className="text-neutral-500 mt-1">Build a hosted signup page</p>
            </div>
          </div>
          <FormEditor mode="create" />
        </div>
      </DashboardLayout>
    </>
  );
}
