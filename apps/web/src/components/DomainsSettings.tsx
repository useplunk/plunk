import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {DomainSchemas} from '@plunk/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  EmptyState,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  IconSpinner,
  Input,
} from '@plunk/ui';
import {AnimatePresence, motion} from 'framer-motion';
import {Check, CheckCircle2, ChevronDown, Copy, Globe, RefreshCw, Trash2, XCircle} from 'lucide-react';
import {useConfig} from '../lib/hooks/useConfig';
import {useAddDomain, useCheckDomainVerification, useDomains, useRemoveDomain} from '../lib/hooks/useDomains';

function AnimatedCopyIcon({isCopied}: {isCopied: boolean}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {isCopied ? (
        <motion.span
          key="copied"
          initial={{opacity: 0, y: 4}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -4}}
          transition={{duration: 0.15}}
        >
          <Check className="h-3 w-3 text-green-600" />
        </motion.span>
      ) : (
        <motion.span
          key="idle"
          initial={{opacity: 0, y: 4}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -4}}
          transition={{duration: 0.15}}
        >
          <Copy className="h-3 w-3" />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

interface DnsField {
  label: string;
  /** The exact string the user pastes into their DNS provider. */
  value: string;
  /** Muted trailing context that is deliberately NOT copied, e.g. the zone a name is relative to. */
  suffix?: string;
  copyable?: boolean;
}

interface DnsRecord {
  key: string;
  type: 'CNAME' | 'MX' | 'TXT';
  /**
   * The fields a DNS provider's form asks for, in the order it asks for them. Priority simply
   * exists on MX records and is absent everywhere else, exactly as the provider's own form works.
   */
  fields: DnsField[];
}

interface DnsRecordGroup {
  key: string;
  label: string;
  hint: string;
  description?: string;
  collapsible: boolean;
  records: DnsRecord[];
}

function DnsFieldRow({
  field,
  recordKey,
  copiedToken,
  onCopy,
}: {
  field: DnsField;
  recordKey: string;
  copiedToken: string | null;
  onCopy: (value: string, key: string) => void;
}) {
  const copyKey = `${recordKey}-${field.label}`;
  const isCopied = copiedToken === `${field.value}-${copyKey}`;

  return (
    <div className="flex items-start gap-2">
      <dt className="w-16 shrink-0 text-[11px] leading-5 text-neutral-500">{field.label}</dt>
      <dd className="flex min-w-0 flex-1 items-start gap-1.5">
        <span className="min-w-0 flex-1 break-all font-mono text-xs leading-5">
          <span className="text-neutral-900">{field.value}</span>
          {field.suffix && <span className="text-neutral-400">{field.suffix}</span>}
        </span>
        {field.copyable !== false && (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Copy ${field.label.toLowerCase()}`}
            onClick={() => onCopy(field.value, copyKey)}
            className={`h-5 w-5 shrink-0 overflow-hidden p-0 transition-colors ${
              isCopied ? 'text-green-600' : 'text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <AnimatedCopyIcon isCopied={isCopied} />
          </Button>
        )}
      </dd>
    </div>
  );
}

function DnsRecordRow({
  record,
  copiedToken,
  onCopy,
}: {
  record: DnsRecord;
  copiedToken: string | null;
  onCopy: (value: string, key: string) => void;
}) {
  return (
    <div className="flex gap-3 py-2.5">
      <code className="w-12 shrink-0 text-[11px] font-semibold leading-5 text-neutral-900">{record.type}</code>
      <dl className="min-w-0 flex-1 space-y-0.5">
        {record.fields.map(field => (
          <DnsFieldRow
            key={field.label}
            field={field}
            recordKey={record.key}
            copiedToken={copiedToken}
            onCopy={onCopy}
          />
        ))}
      </dl>
    </div>
  );
}

function DnsRecordGroupSection({
  group,
  copiedToken,
  onCopy,
}: {
  group: DnsRecordGroup;
  copiedToken: string | null;
  onCopy: (value: string, key: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(!group.collapsible);

  const heading = (
    <>
      {group.collapsible && (
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${isOpen ? '' : '-rotate-90'}`}
        />
      )}
      <span className="text-xs font-semibold text-neutral-900">{group.label}</span>
      <span className="ml-auto text-[11px] text-neutral-500">{group.hint}</span>
    </>
  );

  return (
    <div className="border-t border-neutral-200 first:border-t-0">
      {group.collapsible ? (
        <button
          type="button"
          onClick={() => setIsOpen(open => !open)}
          aria-expanded={isOpen}
          className="flex w-full items-center gap-1.5 py-2.5 text-left transition-opacity hover:opacity-70"
        >
          {heading}
        </button>
      ) : (
        <div className="flex items-center gap-1.5 py-2.5">{heading}</div>
      )}

      {isOpen && (
        <div className="pb-1.5">
          {group.description && <p className="mb-1 text-xs text-neutral-600">{group.description}</p>}
          <div className="divide-y divide-neutral-100">
            {group.records.map(record => (
              <DnsRecordRow key={record.key} record={record} copiedToken={copiedToken} onCopy={onCopy} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface DomainsSettingsProps {
  projectId: string;
}

export function DomainsSettings({projectId}: DomainsSettingsProps) {
  const {domains, mutate: mutateDomains, isLoading} = useDomains(projectId);
  const {addDomain} = useAddDomain();
  const {checkVerification} = useCheckDomainVerification();
  const {removeDomain} = useRemoveDomain();
  const {data: config} = useConfig();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<{
    [key: string]: boolean | string | {tokens: string[] | null; status: string; verified: boolean};
  }>({});
  const [checkingVerification, setCheckingVerification] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [lastVerificationCheck, setLastVerificationCheck] = useState<{[key: string]: number}>({});
  const [cooldownSeconds, setCooldownSeconds] = useState<{[key: string]: number}>({});
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [domainToRemove, setDomainToRemove] = useState<{id: string; name: string} | null>(null);
  const [expandedDomains, setExpandedDomains] = useState<{[key: string]: boolean}>({});

  const form = useForm<{domain: string}>({
    resolver: zodResolver(DomainSchemas.create.omit({projectId: true})),
    defaultValues: {
      domain: '',
    },
  });

  // Handle cooldown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const newCooldowns: {[key: string]: number} = {};
      let hasActiveCooldowns = false;

      Object.keys(lastVerificationCheck).forEach(domainId => {
        const lastCheck = lastVerificationCheck[domainId];
        if (lastCheck === undefined) return;

        const elapsedSeconds = Math.floor((now - lastCheck) / 1000);
        const remainingSeconds = 10 - elapsedSeconds;

        if (remainingSeconds > 0) {
          newCooldowns[domainId] = remainingSeconds;
          hasActiveCooldowns = true;
        }
      });

      setCooldownSeconds(newCooldowns);

      // Clear interval if no active cooldowns
      if (!hasActiveCooldowns && Object.keys(newCooldowns).length === 0) {
        clearInterval(interval);
      }
    }, 100); // Update every 100ms for smooth countdown

    return () => clearInterval(interval);
  }, [lastVerificationCheck]);

  // Auto-expand unverified domains on initial load
  useEffect(() => {
    if (domains && domains.length > 0) {
      const unverifiedDomains = domains
        .filter(d => !d.verified)
        .reduce(
          (acc, d) => {
            acc[d.id] = true;
            return acc;
          },
          {} as {[key: string]: boolean},
        );

      if (Object.keys(unverifiedDomains).length > 0) {
        setExpandedDomains(prev => ({
          ...prev,
          ...unverifiedDomains,
        }));
      }
    }
  }, [domains]);

  const showMessage = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccessMessage(message);
      setErrorMessage(null);
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setErrorMessage(message);
      setSuccessMessage(null);
    }
  };

  const onSubmit = async (values: {domain: string}) => {
    try {
      setErrorMessage(null);
      const newDomain = await addDomain(projectId, values.domain);

      // Store DKIM tokens for display
      if (newDomain.dkimTokens) {
        setVerificationStatus(prev => ({
          ...prev,
          [newDomain.id]: {
            tokens: newDomain.dkimTokens as string[] | null,
            status: 'Pending',
            verified: false,
          },
        }));
        setSelectedDomain(newDomain.id);
        // Auto-expand newly added domain
        setExpandedDomains(prev => ({
          ...prev,
          [newDomain.id]: true,
        }));
      }

      await mutateDomains();
      form.reset();
      showMessage('success', `Domain ${values.domain} added. Add the DNS records below to verify it.`);
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Couldn’t add the domain. Check the spelling and try again.');
    }
  };

  const handleCheckVerification = async (domainId: string) => {
    // Check if cooldown is active
    const now = Date.now();
    const lastCheck = lastVerificationCheck[domainId];
    if (lastCheck) {
      const elapsedSeconds = Math.floor((now - lastCheck) / 1000);
      if (elapsedSeconds < 10) {
        return; // Still in cooldown, do nothing
      }
    }

    try {
      setCheckingVerification(domainId);
      setLastVerificationCheck(prev => ({
        ...prev,
        [domainId]: now,
      }));

      const status = await checkVerification(domainId);

      setVerificationStatus(prev => ({
        ...prev,
        [domainId]: status,
      }));

      await mutateDomains();

      if (status.verified) {
        showMessage('success', `Domain ${status.domain} is verified!`);
      } else {
        showMessage('error', `Domain ${status.domain} is not yet verified. Please check your DNS records.`);
      }
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Couldn’t check verification. Try again in a moment.');
    } finally {
      setCheckingVerification(null);
    }
  };

  const handleRemoveDomain = async () => {
    if (!domainToRemove) return;

    try {
      await removeDomain(domainToRemove.id);
      await mutateDomains();
      if (selectedDomain === domainToRemove.id) {
        setSelectedDomain(null);
      }
      showMessage('success', `Domain ${domainToRemove.name} deleted`);
    } catch (error) {
      showMessage('error', error instanceof Error ? error.message : 'Couldn’t delete the domain. Try again.');
    } finally {
      setDomainToRemove(null);
    }
  };

  const handleCopyToken = async (token: string, key: string) => {
    await navigator.clipboard.writeText(token);
    setCopiedToken(`${token}-${key}`);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getDomainStatus = (domain: {
    id: string;
    verified: boolean;
    dkimTokens: unknown;
  }): {verified: boolean; tokens: unknown; status: string} => {
    const status = verificationStatus[domain.id];
    if (status && typeof status === 'object' && 'verified' in status) {
      return status;
    }
    return {verified: domain.verified, tokens: domain.dkimTokens, status: domain.verified ? 'Success' : 'Pending'};
  };

  return (
    <div className="space-y-6">
      {/* Add Domain Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add domain</CardTitle>
          <CardDescription>Send from your own address instead of a Plunk one.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="domain"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Domain</FormLabel>
                    <FormControl>
                      <Input placeholder="example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Success/Error Messages */}
              <AnimatePresence mode="wait">
                {successMessage && (
                  <motion.div
                    initial={{opacity: 0, y: -10}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0}}
                    className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800"
                  >
                    {successMessage}
                  </motion.div>
                )}
                {errorMessage && (
                  <motion.div
                    initial={{opacity: 0, y: -10}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0}}
                    className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
                  >
                    {errorMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Adding…' : 'Add Domain'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Domains List */}
      <Card>
        <CardHeader>
          <CardTitle>Your domains</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <IconSpinner />
            </div>
          ) : !domains || domains.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No domains added"
              description="Add a custom domain above to send emails from your own address."
            />
          ) : (
            <div className="space-y-4">
              {domains.map(domain => {
                const status = getDomainStatus(domain);
                const mailFromSubdomain = config?.aws?.mailFromSubdomain ?? 'plunk';
                const mailFromHost = `${mailFromSubdomain}.${domain.domain}`;
                const sesRegion = config?.aws?.sesRegion;
                const dnsGroups: DnsRecordGroup[] = [
                  {
                    key: 'sending',
                    label: 'Sending',
                    hint: 'Required',
                    collapsible: false,
                    records: ((status.tokens as string[] | null) ?? []).map((token, index) => ({
                      key: `dkim-${index}`,
                      type: 'CNAME',
                      fields: [
                        {label: 'Name', value: `${token}._domainkey`, suffix: `.${domain.domain}`},
                        {label: 'Value', value: `${token}.dkim.amazonses.com`},
                      ],
                    })),
                  },
                ];

                if (sesRegion) {
                  dnsGroups.push(
                    {
                      key: 'mail-from',
                      label: 'Custom MAIL FROM domain',
                      hint: 'Optional',
                      collapsible: true,
                      description: `Routes bounces and complaints through ${mailFromHost} and improves deliverability.`,
                      records: [
                        {
                          key: 'mail-from-mx',
                          type: 'MX',
                          fields: [
                            {label: 'Name', value: mailFromSubdomain, suffix: `.${domain.domain}`},
                            {label: 'Priority', value: '10'},
                            {label: 'Value', value: `feedback-smtp.${sesRegion}.amazonses.com`},
                          ],
                        },
                        {
                          key: 'mail-from-spf',
                          type: 'TXT',
                          fields: [
                            {label: 'Name', value: mailFromSubdomain, suffix: `.${domain.domain}`},
                            {label: 'Value', value: '"v=spf1 include:amazonses.com ~all"'},
                          ],
                        },
                      ],
                    },
                    {
                      key: 'inbound',
                      label: 'Inbound email',
                      hint: 'Optional',
                      collapsible: true,
                      description: `Receive email sent to addresses at ${domain.domain}.`,
                      records: [
                        {
                          key: 'inbound-mx',
                          type: 'MX',
                          fields: [
                            {label: 'Name', value: '@', suffix: ` (${domain.domain})`},
                            {label: 'Priority', value: '10'},
                            {label: 'Value', value: `inbound-smtp.${sesRegion}.amazonaws.com`},
                          ],
                        },
                      ],
                    },
                  );
                }
                return (
                  <div key={domain.id} className="border border-neutral-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-neutral-900">{domain.domain}</h3>
                        {status.verified ? (
                          <Badge variant="success" className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCheckVerification(domain.id)}
                          disabled={checkingVerification === domain.id || (cooldownSeconds[domain.id] ?? 0) > 0}
                          className="min-w-[80px]"
                        >
                          {checkingVerification === domain.id ? (
                            <IconSpinner size="sm" />
                          ) : (cooldownSeconds[domain.id] ?? 0) > 0 ? (
                            <span className="text-xs">{cooldownSeconds[domain.id]}s</span>
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="destructiveGhost"
                          size="sm"
                          onClick={() => {
                            setDomainToRemove({id: domain.id, name: domain.domain});
                            setShowRemoveDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {Array.isArray(status.tokens) && (status.tokens as string[]).length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() =>
                            setExpandedDomains(prev => ({
                              ...prev,
                              [domain.id]: !prev[domain.id],
                            }))
                          }
                          className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 transition-colors"
                        >
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${
                              expandedDomains[domain.id] ? 'rotate-180' : ''
                            }`}
                          />
                          <span>{status.verified ? 'View DNS Records' : 'DNS Configuration Required'}</span>
                        </button>

                        {expandedDomains[domain.id] && (
                          <div className="mt-3">
                            {!status.verified && (
                              <p className="text-xs text-neutral-600">
                                Copy each record into your DNS provider, then hit refresh above. DNS changes can take up
                                to 48 hours to propagate.
                              </p>
                            )}
                            <p className="mt-0.5 text-xs text-neutral-500">
                              Names are relative to {domain.domain}. Add it back if your provider asks for the full name.
                            </p>

                            <div className="mt-2">
                              {dnsGroups.map(group => (
                                <DnsRecordGroupSection
                                  key={group.key}
                                  group={group}
                                  copiedToken={copiedToken}
                                  onCopy={handleCopyToken}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showRemoveDialog}
        onOpenChange={setShowRemoveDialog}
        onConfirm={handleRemoveDomain}
        title={`Delete ${domainToRemove?.name}?`}
        description="You'll stop being able to send from this address until you add and verify it again."
        confirmText="Delete domain"
        variant="destructive"
      />
    </div>
  );
}
