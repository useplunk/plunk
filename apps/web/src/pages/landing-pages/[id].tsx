import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@plunk/ui';
import type {LandingPage} from '@plunk/db';
import type {LandingPageSettings} from '@plunk/types';
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

const EMPTY_SETTINGS: LandingPageSettings = {};

function parseSettings(value: unknown): LandingPageSettings {
  if (!value || typeof value !== 'object') {
    return EMPTY_SETTINGS;
  }

  return value as LandingPageSettings;
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
  const [settings, setSettings] = useState<LandingPageSettings>(EMPTY_SETTINGS);

  useEffect(() => {
    if (!page) return;
    setName(page.name);
    setSlug(page.slug);
    setPublished(page.published);
    setSettings(parseSettings(page.settings));
  }, [page]);

  useEffect(() => {
    if (!slugTouched && name) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched]);

  const updateSetting = <K extends keyof LandingPageSettings>(
    key: K,
    value: LandingPageSettings[K] | undefined,
  ) => {
    setSettings(current => ({...current, [key]: value}));
  };

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
        settings,
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
                <p className="text-neutral-500 mt-1">Settings, SEO, analytics, and publishing</p>
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
                  <Link href={`/landing-pages/edit/${page.id}`}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit page
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {page && (
            <>
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
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">SEO & Metadata</h2>
                    <p className="text-sm text-neutral-500 mt-1">
                      Controls how this page appears in search results and browser tabs.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo-title">Page title</Label>
                    <Input
                      id="seo-title"
                      value={settings.title ?? ''}
                      onChange={e => updateSetting('title', e.target.value || undefined)}
                      placeholder={name || 'Page title'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo-description">Meta description</Label>
                    <Textarea
                      id="seo-description"
                      value={settings.description ?? ''}
                      onChange={e => updateSetting('description', e.target.value || undefined)}
                      placeholder="Short description for search engines"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo-canonical">Canonical URL</Label>
                    <Input
                      id="seo-canonical"
                      type="url"
                      value={settings.canonicalUrl ?? ''}
                      onChange={e => updateSetting('canonicalUrl', e.target.value || undefined)}
                      placeholder={`${DASHBOARD_URI}/p/${page.publicId}`}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seo-favicon">Favicon URL</Label>
                    <Input
                      id="seo-favicon"
                      type="url"
                      value={settings.faviconUrl ?? ''}
                      onChange={e => updateSetting('faviconUrl', e.target.value || undefined)}
                      placeholder="https://example.com/favicon.ico"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Social (Open Graph)</h2>
                    <p className="text-sm text-neutral-500 mt-1">
                      Customize how this page appears when shared on social networks.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="og-title">OG title</Label>
                    <Input
                      id="og-title"
                      value={settings.ogTitle ?? ''}
                      onChange={e => updateSetting('ogTitle', e.target.value || undefined)}
                      placeholder={settings.title || name || 'Open Graph title'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="og-description">OG description</Label>
                    <Textarea
                      id="og-description"
                      value={settings.ogDescription ?? ''}
                      onChange={e => updateSetting('ogDescription', e.target.value || undefined)}
                      placeholder={settings.description || 'Open Graph description'}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="og-image">OG image URL</Label>
                    <Input
                      id="og-image"
                      type="url"
                      value={settings.ogImageUrl ?? ''}
                      onChange={e => updateSetting('ogImageUrl', e.target.value || undefined)}
                      placeholder="https://example.com/og-image.png"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitter-card">Twitter card type</Label>
                    <Select
                      value={settings.twitterCard ?? 'default'}
                      onValueChange={value =>
                        updateSetting(
                          'twitterCard',
                          value === 'default' ? undefined : (value as LandingPageSettings['twitterCard']),
                        )
                      }
                    >
                      <SelectTrigger id="twitter-card">
                        <SelectValue placeholder="Auto (based on OG image)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Auto (based on OG image)</SelectItem>
                        <SelectItem value="summary">Summary</SelectItem>
                        <SelectItem value="summary_large_image">Summary with large image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Analytics</h2>
                    <p className="text-sm text-neutral-500 mt-1">
                      Tracking scripts are injected only on the public landing page.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gtm-id">Google Tag Manager ID</Label>
                    <Input
                      id="gtm-id"
                      value={settings.gtmId ?? ''}
                      onChange={e => updateSetting('gtmId', e.target.value || undefined)}
                      placeholder="GTM-XXXXXXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ga4-id">Google Analytics 4 ID</Label>
                    <Input
                      id="ga4-id"
                      value={settings.ga4Id ?? ''}
                      onChange={e => updateSetting('ga4Id', e.target.value || undefined)}
                      placeholder="G-XXXXXXXXXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fb-pixel-id">Facebook Pixel ID</Label>
                    <Input
                      id="fb-pixel-id"
                      value={settings.fbPixelId ?? ''}
                      onChange={e => updateSetting('fbPixelId', e.target.value || undefined)}
                      placeholder="123456789012345"
                    />
                  </div>
                </CardContent>
              </Card>

              <Button disabled={saving} onClick={() => void handleSave()}>
                Save settings
              </Button>
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
