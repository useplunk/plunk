
import '@puckeditor/core/puck.css';

import {Puck, type Data} from '@puckeditor/core';
import {Button, IconSpinner} from '@plunk/ui';
import {LandingPageSchemas} from '@plunk/shared';
import {EMPTY_PUCK_DATA} from '@plunk/types';
import {ArrowLeft, Save} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useCallback, useEffect, useState} from 'react';
import {toast} from 'sonner';

import {puckConfig} from '../lib/puck/config';
import {network} from '../lib/network';

interface LandingPageRecord {
  id: string;
  name: string;
  published: boolean;
  data: Data;
}

interface LandingPagePuckEditorProps {
  landingPageId: string;
}

function normalizeData(data: unknown): Data {
  if (data && typeof data === 'object' && 'content' in data) {
    return data as Data;
  }
  return EMPTY_PUCK_DATA as Data;
}

export default function LandingPagePuckEditor({landingPageId}: LandingPagePuckEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState<LandingPageRecord | null>(null);
  const [data, setData] = useState<Data>(EMPTY_PUCK_DATA as Data);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const result = await network.fetch<LandingPageRecord>('GET', `/landing-pages/${landingPageId}`);
        setPage(result);
        setData(normalizeData(result.data));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load landing page');
        void router.push('/landing-pages');
      } finally {
        setLoading(false);
      }
    };

    void fetchPage();
  }, [landingPageId, router]);

  const save = useCallback(
    async (nextData: Data, publish?: boolean) => {
      try {
        setSaving(true);
        const payload = LandingPageSchemas.update.parse({
          data: nextData,
          ...(publish !== undefined ? {published: publish} : {}),
        });
        const updated = await network.fetch<LandingPageRecord, typeof LandingPageSchemas.update>(
          'PATCH',
          `/landing-pages/${landingPageId}`,
          payload,
        );
        setPage(updated);
        setData(normalizeData(updated.data));
        toast.success(publish ? 'Landing page published' : 'Landing page saved');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to save landing page');
      } finally {
        setSaving(false);
      }
    },
    [landingPageId],
  );

  if (loading || !page) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-neutral-100">
        <IconSpinner />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-100">
      <div className="flex items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="outline" size="sm">
            <Link href={`/landing-pages/${landingPageId}`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="font-semibold text-neutral-900 truncate">{page.name}</p>
            <p className="text-xs text-neutral-500">Page editor</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" disabled={saving} onClick={() => void save(data)}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button size="sm" disabled={saving} onClick={() => void save(data, true)}>
            Publish
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 [&_.Puck]:h-full">
        <Puck
          config={puckConfig}
          data={data}
          onChange={setData}
          onPublish={nextData => void save(nextData, true)}
          headerTitle={page.name}
          height="100%"
        />
      </div>
    </div>
  );
}
