import {useMemo} from 'react';
import {
  Alert,
  AlertDescription,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@plunk/ui';
import {AlertCircle} from 'lucide-react';
import Link from 'next/link';
import {useDomains} from '../lib/hooks/useDomains';
import {useActiveProject} from '../lib/contexts/ActiveProjectProvider';

interface EmailDomainInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  required?: boolean;
  label?: string;
}

export function EmailDomainInput({value, onChange, id, placeholder, required, label}: EmailDomainInputProps) {
  const {activeProject} = useActiveProject();
  const {domains, isLoading} = useDomains(activeProject?.id);

  // Get verified domains only - memoized to avoid re-creating on every render
  const verifiedDomains = useMemo(() => domains?.filter(d => d.verified) || [], [domains]);

  // Derive local state directly from the value prop
  const parsedEmail = useMemo(() => {
    if (value && value.includes('@')) {
      const [local, domain] = value.split('@');
      return {localPart: local ?? '', domain: domain ?? ''};
    } else if (value) {
      return {localPart: value, domain: ''};
    }
    return {localPart: '', domain: ''};
  }, [value]);

  // Use derived state for display, with fallback to first domain if none specified
  const displayDomain = parsedEmail.domain || (verifiedDomains.length > 0 ? verifiedDomains[0]!.domain : '');
  const displayLocalPart = parsedEmail.localPart;

  const handleLocalPartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLocal = e.target.value;
    if (newLocal && displayDomain) {
      onChange(`${newLocal}@${displayDomain}`);
    } else {
      onChange(newLocal);
    }
  };

  const handleDomainChange = (newDomain: string) => {
    if (displayLocalPart && newDomain) {
      onChange(`${displayLocalPart}@${newDomain}`);
    } else if (displayLocalPart) {
      onChange(displayLocalPart);
    }
    // If no local part, don't call onChange - wait for user to type something
  };

  if (isLoading) {
    return (
      <div>
        {label && (
          <Label htmlFor={id}>
            {label}
            {required && <span className="text-red-500"> *</span>}
          </Label>
        )}
        <div className="flex items-center gap-2">
          <Input id={id} type="text" placeholder="Loading…" disabled className="flex-1" />
        </div>
      </div>
    );
  }

  if (verifiedDomains.length === 0) {
    return (
      <div>
        {label && (
          <Label htmlFor={id}>
            {label}
            {required && <span className="text-red-500"> *</span>}
          </Label>
        )}
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium text-sm">No verified domains</p>
            <p className="text-xs mt-1">
              Please add and verify a domain in{' '}
              <Link href="/settings?tab=domains" className="underline hover:text-red-800">
                Settings → Domains
              </Link>{' '}
              before creating templates.
            </p>
          </AlertDescription>
        </Alert>
        {/* Fallback to regular email input */}
        <Input
          id={id}
          type="email"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || 'email@example.com'}
          required={required}
          className="mt-2"
        />
      </div>
    );
  }

  return (
    <div>
      {label && (
          <Label htmlFor={id}>
            {label}
            {required && <span className="text-red-500"> *</span>}
          </Label>
        )}
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="text"
          value={displayLocalPart}
          onChange={handleLocalPartChange}
          placeholder={placeholder || 'hello'}
          required={required}
          className="flex-1"
        />
        <span className="text-neutral-500">@</span>
        <Select value={displayDomain} onValueChange={handleDomainChange} required={required}>
          <SelectTrigger className="w-[200px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {verifiedDomains.map(domain => (
              <SelectItem key={domain.id} value={domain.domain}>
                {domain.domain}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
