import {Button, Collapsible, CollapsibleContent, CollapsibleTrigger, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@plunk/ui';
import {ChevronDown, Plus, Trash2} from 'lucide-react';
import Link from 'next/link';
import {useState} from 'react';
import {toast} from 'sonner';

import {WIKI_URI} from '../../lib/constants';

import {type EditStepDialogProps, getStepConfig, StepDialogShell, useStepUpdate} from './shared';

interface HeaderEntry {
  key: string;
  value: string;
}

export function WebhookStepDialog({step, workflowId, open, onOpenChange, onSuccess}: EditStepDialogProps) {
  const config = getStepConfig(step);

  const initialHeaders: HeaderEntry[] =
    config.headers && typeof config.headers === 'object'
      ? Object.entries(config.headers as Record<string, unknown>).map(([key, value]) => ({key, value: String(value)}))
      : [];

  const [name, setName] = useState(step.name);
  const [webhookUrl, setWebhookUrl] = useState(String(config.url ?? ''));
  const [webhookMethod, setWebhookMethod] = useState(String(config.method ?? 'POST'));
  const [webhookHeaders, setWebhookHeaders] = useState<HeaderEntry[]>(initialHeaders);
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);

  const {update, isSubmitting} = useStepUpdate(workflowId, step.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!webhookUrl) {
      toast.error('Webhook URL is required');
      return;
    }

    const headers: Record<string, string> = {};
    webhookHeaders.forEach(header => {
      if (header.key.trim() && header.value.trim()) {
        headers[header.key.trim()] = header.value.trim();
      }
    });

    const ok = await update({
      name,
      config: {url: webhookUrl, method: webhookMethod, headers},
    });

    if (ok) {
      onOpenChange(false);
      onSuccess();
    }
  };

  const updateHeader = (index: number, patch: Partial<HeaderEntry>) => {
    setWebhookHeaders(prev => prev.map((h, i) => (i === index ? {...h, ...patch} : h)));
  };

  return (
    <StepDialogShell
      step={step}
      open={open}
      onOpenChange={onOpenChange}
      name={name}
      onNameChange={setName}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    >
      <div className="space-y-4">
        <Collapsible open={showWebhookInfo} onOpenChange={setShowWebhookInfo}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700">
              <ChevronDown className={`h-3 w-3 transition-transform ${showWebhookInfo ? 'rotate-180' : ''}`} />
              {showWebhookInfo ? 'Hide' : 'View'} request payload
            </CollapsibleTrigger>
            <Link
              href={`${WIKI_URI}/guides/webhooks#webhook-payload`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-neutral-500 hover:text-neutral-700 underline underline-offset-2"
            >
              Webhook guide
            </Link>
          </div>
          <CollapsibleContent className="mt-2">
            <pre className="text-[10px] bg-neutral-50 p-2 rounded border border-neutral-200 overflow-x-auto">
              {`{
  "contact": { "email": "user@example.com", "subscribed": true, "data": { ... } },
  "workflow": { "id": "wf_...", "name": "Welcome Series" },
  "execution": { "id": "exec_...", "startedAt": "2025-01-19T..." },
  "event": { ... }
}`}
            </pre>
          </CollapsibleContent>
        </Collapsible>

        <div>
          <Label htmlFor="editWebhookUrl">URL</Label>
          <Input
            className="font-mono mt-1.5"
            id="editWebhookUrl"
            type="url"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            required
            placeholder="https://api.example.com/webhook"
          />
        </div>

        <div>
          <Label htmlFor="editWebhookMethod">Method</Label>
          <Select value={webhookMethod} onValueChange={setWebhookMethod}>
            <SelectTrigger id="editWebhookMethod" className="font-mono mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Headers</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWebhookHeaders(prev => [...prev, {key: '', value: ''}])}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {webhookHeaders.map((header, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  placeholder="e.g., plan"
                  value={header.key}
                  onChange={e => updateHeader(index, {key: e.target.value})}
                  className="text-sm font-mono"
                />
                <Input
                  placeholder="e.g., pro"
                  value={header.value}
                  onChange={e => updateHeader(index, {value: e.target.value})}
                  className="text-sm font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWebhookHeaders(prev => prev.filter((_, i) => i !== index))}
                  className="h-9 w-9 p-0 flex-shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StepDialogShell>
  );
}
