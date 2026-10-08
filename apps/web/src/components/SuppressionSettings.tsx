import {Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input} from '@plunk/ui';
import {useRef, useState} from 'react';
import useSWR from 'swr';
import type {z} from 'zod';

import {network} from '../lib/network';

type Rule = {id: string; name: string; kind: string; pattern: string; enabled: boolean};
type Capture = {
  id: string;
  recipientAddress: string;
  subject: string;
  renderedSubject: string | null;
  renderedBody?: string | null;
  body?: string;
  suppression: {name: string; pattern: string};
};
const empty = {name: '', kind: 'DOMAIN', pattern: '', enabled: true};

// Parent keys this component by project ID: drafts, previews and selection cannot cross projects.
export function SuppressionSettings({projectId}: {projectId: string}) {
  const [cursor, setCursor] = useState<string | null>(null);
  const {
    data: rules,
    error: rulesError,
    mutate,
  } = useSWR<Rule[]>(['suppression-rules', projectId], () =>
    network.fetch('GET', '/suppressions', undefined, projectId),
  );
  const {
    data: captures,
    error: capturesError,
    mutate: refreshCaptures,
  } = useSWR<{emails: Capture[]; nextCursor: string | null}>(
    ['suppression-emails', projectId, cursor],
    () =>
      network.fetch(
        'GET',
        `/suppressions/emails${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
        undefined,
        projectId,
      ),
    {refreshInterval: 5000},
  );
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [selected, setSelected] = useState<Capture | null>(null);
  async function act(fn: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function save(rule: typeof empty, id?: string) {
    await network.fetch<unknown, z.ZodSchema>(
      id ? 'PUT' : 'POST',
      id ? `/suppressions/${id}` : '/suppressions',
      rule,
      projectId,
    );
    await mutate();
    setPreview('');
  }
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recipient suppression</CardTitle>
          <CardDescription>
            Capture matching messages without external delivery. Other recipients still receive their own copy. Rules
            apply to this project only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-600">
            Domains match exactly. Prefix and suffix match the local part before @. Wildcards match the whole address: *
            matches any characters and ? matches one. Matching is case-insensitive. Already captured messages remain
            suppressed when rules change.
          </p>
          {(error || rulesError || capturesError) && (
            <p role="alert" className="text-red-600">
              {error || rulesError?.message || capturesError?.message}
            </p>
          )}
          <form
            className="space-y-3"
            onSubmit={e => {
              e.preventDefault();
              void act(async () => {
                await save(draft, editing || undefined);
                setDraft(empty);
                setEditing(null);
              });
            }}
          >
            <label className="block">
              Rule name
              <Input
                required
                maxLength={100}
                value={draft.name}
                onChange={e => setDraft({...draft, name: e.target.value})}
              />
            </label>
            <label className="block">
              Match type
              <select
                className="block border rounded p-2 w-full"
                value={draft.kind}
                onChange={e => setDraft({...draft, kind: e.target.value})}
              >
                <option value="DOMAIN">Domain</option>
                <option value="ADDRESS">Exact address</option>
                <option value="PREFIX">Local-part prefix</option>
                <option value="SUFFIX">Local-part suffix</option>
                <option value="WILDCARD">Wildcard pattern</option>
              </select>
            </label>
            <label className="block">
              Pattern
              <Input
                required
                maxLength={254}
                value={draft.pattern}
                placeholder="example.com"
                onChange={e => setDraft({...draft, pattern: e.target.value})}
              />
            </label>
            <Button disabled={busy} type="submit">
              {editing ? 'Save rule' : 'Add rule'}
            </Button>
            {editing && (
              <Button
                variant="outline"
                type="button"
                disabled={busy}
                onClick={() => {
                  setDraft(empty);
                  setEditing(null);
                }}
              >
                Cancel edit
              </Button>
            )}
          </form>
          <ul className="divide-y">
            {rules?.map(rule => (
              <li key={rule.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <strong>{rule.name}</strong>
                  <p className="text-sm">
                    {rule.kind}: {rule.pattern} · {rule.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setDraft({name: rule.name, kind: rule.kind, pattern: rule.pattern, enabled: rule.enabled});
                      setEditing(rule.id);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void act(() =>
                        save(
                          {name: rule.name, kind: rule.kind, pattern: rule.pattern, enabled: !rule.enabled},
                          rule.id,
                        ),
                      )
                    }
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <form
            className="space-y-2"
            onSubmit={e => {
              e.preventDefault();
              void act(async () => {
                const result = await network.fetch<{suppressed: boolean; match: {name: string} | null}, z.ZodSchema>(
                  'POST',
                  '/suppressions/preview',
                  {address},
                  projectId,
                );
                setPreview(result.suppressed ? `Suppressed by ${result.match?.name}` : 'No enabled rule matches');
              });
            }}
          >
            <label>
              Test address
              <Input
                type="email"
                required
                value={address}
                onChange={e => {
                  setAddress(e.target.value);
                  setPreview('');
                }}
              />
            </label>
            <Button variant="outline" disabled={busy}>
              Test saved rules
            </Button>
            <p role="status">{preview}</p>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Captured emails</CardTitle>
          <CardDescription>
            Suppressed messages are never marked delivered. Stored content follows the project’s retention policy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" onClick={() => void refreshCaptures()}>
            Refresh captures
          </Button>
          {!captures?.emails.length && <p>No captured emails.</p>}
          {captures?.emails.map(email => (
            <button
              className="block text-left border rounded p-3 w-full"
              key={email.id}
              disabled={busy}
              onClick={() =>
                void act(async () =>
                  setSelected(await network.fetch('GET', `/suppressions/emails/${email.id}`, undefined, projectId)),
                )
              }
            >
              <strong>{email.renderedSubject || email.subject}</strong>
              <p>
                {email.recipientAddress} · Suppressed by {email.suppression.name} ({email.suppression.pattern})
              </p>
            </button>
          ))}
          <div className="flex gap-2">
            {cursor && (
              <Button variant="outline" onClick={() => setCursor(null)}>
                Newest captures
              </Button>
            )}
            {captures?.nextCursor && (
              <Button variant="outline" onClick={() => setCursor(captures.nextCursor)}>
                Older captures
              </Button>
            )}
          </div>
          {selected && (
            <section className="space-y-2">
              <h3>{selected.renderedSubject || selected.subject}</h3>
              <p>
                Suppressed by {selected.suppression.name} · {selected.recipientAddress}
              </p>
              <iframe
                title="Captured email content"
                className="w-full h-96 border"
                sandbox=""
                srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">${selected.renderedBody || '<p>Rendered content is no longer available.</p>'}`}
              />
              <details>
                <summary>Original HTML</summary>
                <pre className="whitespace-pre-wrap">{selected.body}</pre>
              </details>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Close capture
              </Button>
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
