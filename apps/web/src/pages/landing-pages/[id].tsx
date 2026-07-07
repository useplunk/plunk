import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Switch,
} from '@plunk/ui';
import type {LandingPage} from '@plunk/db';
import {LandingPageSchemas} from '@plunk/shared';
import {ArrowLeft, ClipboardCopy, ExternalLink, Pencil} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {NextSeo} from 'next-seo';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';

import {DashboardLayout} from '../../components/DashboardLayout';
import {DASHBOARD_URI} from '../../lib/constants';
import {network} from '../../lib/network';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export default function LandingPageDetailPage() {
  const router = useRouter();
  const {id} = router.query;
  const {data: page, mutate} = useSWR<LandingPage>(id ? `/landing-pages/${id}` : null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [published, setPublished] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!page) return;
    setName(page.name);
    setSlug(page.slug);
    setPublished(page.published);
  }, [page]);

  useEffect(() => {
    if (!slugTouched && name) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched]);

  const copyLink = async () => {
    if (!page) return;
    const url = `${DASHBOARD_URI}/p/${page.publicId}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const handleSave = async () => {
    if (typeof id !== 'string') return;

    try {
      setSaving(true);
      const payload = LandingPageSchemas.update.parse({
        name,
        slug,
        published,
      });
      await network.fetch<void, typeof LandingPageSchemas.update>('PATCH', `/landing-pages/${id}`, payload);
      toast.success('Settings saved');
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <NextSeo title={page?.name ?? 'Landing Page'} />
      <DashboardLayout>
        <div className="space-y-6 max-w-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button asChild variant="outline" size="sm">
                <Link href="/landing-pages">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">{page?.name ?? 'Landing Page'}</h1>
                <p className="text-neutral-500 mt-1">Settings and publishing</p>
              </div>
            </div>
            {page && (
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => void copyLink()}>
                  <ClipboardCopy className="h-4 w-4 mr-1" />
                  Copy link
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/p/${page.publicId}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Preview
                  </a>
                </Button>
                <Button size="sm" asChild>
                  <Link href={`/landing-pages/${page.id}/edit`}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit page
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {page && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <p className="text-sm text-neutral-600">
                  Public URL:{' '}
                  <code className="bg-neutral-100 px-2 py-1 rounded text-xs break-all">
                    {DASHBOARD_URI}/p/{page.publicId}
                  </code>
                </p>

                <div className="space-y-2">
                  <Label htmlFor="landing-name">Name</Label>
                  <Input id="landing-name" value={name} onChange={e => setName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="landing-slug">Slug</Label>
                  <Input
                    id="landing-slug"
                    value={slug}
                    onChange={e => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-neutral-900">Published</p>
                    <p className="text-sm text-neutral-500">Make this landing page publicly accessible</p>
                  </div>
                  <Switch checked={published} onCheckedChange={setPublished} />
                </div>

                <Button disabled={saving} onClick={() => void handleSave()}>
                  Save settings
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
