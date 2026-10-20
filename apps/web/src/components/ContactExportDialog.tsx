import type {ContactExportStatus} from '@plunk/types';
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@plunk/ui';
import {Download, Loader2} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';

import {API_URI} from '../lib/constants';
import {network} from '../lib/network';

export function ContactExportDialog({open, onOpenChange}: {open: boolean; onOpenChange: (open: boolean) => void}) {
  const [jobId, setJobId] = useState<string>();
  const [status, setStatus] = useState<ContactExportStatus>();
  const [pollAttempt, setPollAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const requestInFlight = useRef(false);

  useEffect(() => {
    if (!open || !jobId) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await network.fetch<ContactExportStatus>('GET', `/contacts/exports/${jobId}`);
        if (disposed) return;
        setStatus(result);
        if (result.status === 'failed') setError(result.error);
        if (result.status === 'waiting' || result.status === 'active') timer = setTimeout(() => void poll(), 1500);
      } catch (err) {
        if (!disposed) setError(err instanceof Error ? err.message : 'Could not check the export. Please try again.');
      }
    };
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [open, jobId, pollAttempt]);

  const start = async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const result = await network.fetch<{jobId: string}>('POST', '/contacts/exports');
      setJobId(result.jobId);
      setPollAttempt(attempt => attempt + 1);
      setStatus({status: 'waiting', rows: 0});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the export. Please try again.');
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  };

  const close = async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setBusy(true);
    try {
      if (jobId && (status?.status === 'waiting' || status?.status === 'active')) {
        await network.fetch('DELETE', `/contacts/exports/${jobId}`);
      }
      setJobId(undefined);
      setStatus(undefined);
      setError(undefined);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel the export. Please try again.');
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  };

  const running = status?.status === 'waiting' || status?.status === 'active';
  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!value) void close();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export all contacts</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-sm text-neutral-600">
          Download every contact in this project as CSV, including custom fields. Search, filters and selected rows do
          not limit this export.
        </DialogDescription>
        <p className="text-xs text-neutral-500">
          Contacts are read when the export runs. Exports expire 24 hours after they are requested. Formula-like text is
          prefixed with an apostrophe for spreadsheet safety.
        </p>
        <div role="status" aria-live="polite" className="text-sm">
          {running && (
            <p className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {status.status === 'waiting'
                ? 'Queued — waiting for the export worker…'
                : `Preparing CSV — ${status.rows.toLocaleString()} contacts read…`}
            </p>
          )}
          {status?.status === 'completed' && <p>Ready: {status.rows.toLocaleString()} contacts.</p>}
          {status?.status === 'cancelled' && <p>Export cancelled.</p>}
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => void close()}>
            {running ? 'Cancel export' : 'Close'}
          </Button>
          {status?.status === 'completed' && jobId ? (
            <Button asChild>
              <a href={`${API_URI}/contacts/exports/${jobId}/download`} target="_blank" rel="noreferrer">
                <Download className="h-4 w-4" aria-hidden="true" />
                Download CSV
              </a>
            </Button>
          ) : (
            <Button disabled={busy || (!!running && !error)} onClick={() => void start()}>
              {busy ? 'Please wait…' : error ? 'Try again' : running ? 'Preparing…' : 'Export all contacts'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
