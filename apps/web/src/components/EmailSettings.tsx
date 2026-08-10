import {Input, Label} from '@plunk/ui';
import {EmailDomainInput} from './EmailDomainInput';

interface EmailSettingsProps {
  from: string;
  fromName: string;
  replyTo: string;
  onFromChange: (value: string) => void;
  onFromNameChange: (value: string) => void;
  onReplyToChange: (value: string) => void;
  fromPlaceholder?: string;
  fromNamePlaceholder?: string;
  replyToPlaceholder?: string;
  layout?: 'vertical' | 'grid';
}

export function EmailSettings({
  from,
  fromName,
  replyTo,
  onFromChange,
  onFromNameChange,
  onReplyToChange,
  fromPlaceholder = 'hello',
  fromNamePlaceholder = 'Your Company',
  replyToPlaceholder,
  layout = 'grid',
}: EmailSettingsProps) {
  // Use from email's local part as the reply-to placeholder if not provided
  // Extract local part (before @) since the domain is shown in a dropdown
  // Fall back to fromPlaceholder when from is empty (since reply-to defaults to from)
  const fromLocalPart = from.includes('@') ? from.split('@')[0] : from;
  const effectiveReplyToPlaceholder = replyToPlaceholder || fromLocalPart || fromPlaceholder;
  const GridWrapper = layout === 'grid' ? 'div' : 'div';
  const gridClassName = layout === 'grid' ? 'grid gap-4 md:grid-cols-2' : 'space-y-4';

  return (
    <div className="space-y-4">
      <GridWrapper className={gridClassName}>
        <div>
          <EmailDomainInput
            id="from"
            label="From email"
            value={from}
            onChange={onFromChange}
            required
            placeholder={fromPlaceholder}
          />
        </div>

        <div>
          <Label htmlFor="fromName">From name</Label>
          <Input
            id="fromName"
            type="text"
            value={fromName}
            onChange={e => onFromNameChange(e.target.value)}
            placeholder={fromNamePlaceholder}
          />
          <p className="text-xs text-neutral-500 mt-1">
            The sender name that appears in the recipient&apos;s inbox. Defaults to your project name if not set.
          </p>
        </div>
      </GridWrapper>

      <GridWrapper className={layout === 'grid' ? 'grid gap-4 md:grid-cols-2' : ''}>
        <div>
          <EmailDomainInput
            id="replyTo"
            label="Reply-To email"
            value={replyTo}
            onChange={onReplyToChange}
            placeholder={effectiveReplyToPlaceholder}
          />
        </div>
      </GridWrapper>
    </div>
  );
}
