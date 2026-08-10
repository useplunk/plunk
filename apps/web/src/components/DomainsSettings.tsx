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

  const handleCopyToken = async (token: string, index: number) => {
    await navigator.clipboard.writeText(token);
    setCopiedToken(`${token}-${index}`);
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
                          <div className="mt-3 space-y-4">
                            {/* Required DKIM Records for Sending */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-xs font-semibold text-neutral-900">Required for sending</h4>
                                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                  REQUIRED
                                </Badge>
                              </div>
                              {!status.verified && (
                                <p className="text-xs text-neutral-600 mb-2">
                                  Copy each record into your DNS provider, then hit refresh above. DNS changes can take
                                  up to 48 hours to propagate.
                                </p>
                              )}

                              <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse">
                                  <thead>
                                    <tr className="border-b border-neutral-200">
                                      <th className="text-left py-2 px-3 font-medium text-neutral-700 bg-neutral-50">
                                        Type
                                      </th>
                                      <th className="text-left py-2 px-3 font-medium text-neutral-700 bg-neutral-50">
                                        Name
                                      </th>
                                      <th className="text-left py-2 px-3 font-medium text-neutral-700 bg-neutral-50">
                                        Value
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-neutral-200">
                                    {/* DKIM Records */}
                                    {status.tokens.map((token: string, index: number) => (
                                      <tr key={index} className="hover:bg-neutral-50/50">
                                        <td className="py-3 px-3">
                                          <code className="text-xs font-medium text-neutral-900">CNAME</code>
                                        </td>
                                        <td className="py-3 px-3">
                                          <div className="flex items-center gap-2">
                                            <code className="text-xs font-mono text-neutral-700 break-all flex-1">
                                              {token}._domainkey.{domain.domain}
                                            </code>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleCopyToken(`${token}._domainkey.${domain.domain}`, index + 2000)
                                              }
                                              className="shrink-0 h-6 w-6 p-0 overflow-hidden"
                                            >
                                              <AnimatedCopyIcon
                                                isCopied={
                                                  copiedToken === `${token}._domainkey.${domain.domain}-${index + 2000}`
                                                }
                                              />
                                            </Button>
                                          </div>
                                        </td>
                                        <td className="py-3 px-3">
                                          <div className="flex items-center gap-2">
                                            <code className="text-xs font-mono text-neutral-700 break-all flex-1">
                                              {token}.dkim.amazonses.com
                                            </code>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleCopyToken(`${token}.dkim.amazonses.com`, index)}
                                              className="shrink-0 h-6 w-6 p-0 overflow-hidden"
                                            >
                                              <AnimatedCopyIcon
                                                isCopied={copiedToken === `${token}.dkim.amazonses.com-${index}`}
                                              />
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Optional: Custom MAIL FROM Domain */}
                            {config?.aws?.sesRegion && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-xs font-semibold text-neutral-900">Custom MAIL FROM Domain</h4>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    OPTIONAL
                                  </Badge>
                                </div>
                                <p className="text-xs text-neutral-600 mb-2">
                                  Set up a custom MAIL FROM domain ({mailFromHost}) to improve deliverability and handle
                                  bounces/complaints.
                                </p>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border-collapse">
                                    <thead>
                                      <tr className="border-b border-neutral-200">
                                        <th className="text-left py-2 px-3 font-medium text-neutral-700 bg-neutral-50">
                                          Type
                                        </th>
                                        <th className="text-left py-2 px-3 font-medium text-neutral-700 bg-neutral-50">
                                          Name
                                        </th>
                                        <th className="text-left py-2 px-3 font-medium text-neutral-700 bg-neutral-50">
                                          Value
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200">
                                      {/* MX Record (Bounce/Complaint Handling) */}
                                      <tr className="hover:bg-neutral-50/50">
                                        <td className="py-3 px-3">
                                          <code className="text-xs font-medium text-neutral-900">MX</code>
                                        </td>
                                        <td className="py-3 px-3">
                                          <div className="flex items-center gap-2">
                                            <code className="text-xs font-mono text-neutral-700 break-all flex-1">
                                              {mailFromHost}
                                            </code>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleCopyToken(mailFromHost, 3000)}
                                              className="shrink-0 h-6 w-6 p-0 overflow-hidden"
                                            >
                                              <AnimatedCopyIcon
                                                isCopied={copiedToken === `${mailFromHost}-3000`}
                                              />
                                            </Button>
                                          </div>
                                        </td>
                                        <td className="py-3 px-3">
                                          <div className="flex items-center gap-2">
                                            <code className="text-xs font-mono text-neutral-700 break-all flex-1">
                                              10 feedback-smtp.{config.aws.sesRegion}.amazonses.com
                                            </code>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleCopyToken(
                                                  `10 feedback-smtp.${config.aws.sesRegion}.amazonses.com`,
                                                  1000,
                                                )
                                              }
                                              className="shrink-0 h-6 w-6 p-0 overflow-hidden"
                                            >
                                              <AnimatedCopyIcon
                                                isCopied={
                                                  copiedToken ===
                                                  `10 feedback-smtp.${config.aws.sesRegion}.amazonses.com-1000`
                                                }
                                              />
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>

                                      {/* TXT Record (SPF) */}
                                      <tr className="hover:bg-neutral-50/50">
                                        <td className="py-3 px-3">
                                          <code className="text-xs font-medium text-neutral-900">TXT</code>
                                        </td>
                                        <td className="py-3 px-3">
                                          <div className="flex items-center gap-2">
                                            <code className="text-xs font-mono text-neutral-700 break-all flex-1">
                                              {mailFromHost}
                                            </code>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleCopyToken(mailFromHost, 3001)}
                                              className="shrink-0 h-6 w-6 p-0 overflow-hidden"
                                            >
                                              <AnimatedCopyIcon
                                                isCopied={copiedToken === `${mailFromHost}-3001`}
                                              />
                                            </Button>
                                          </div>
                                        </td>
                                        <td className="py-3 px-3">
                                          <div className="flex items-center gap-2">
                                            <code className="text-xs font-mono text-neutral-700 break-all flex-1">
                                              &quot;v=spf1 include:amazonses.com ~all&quot;
                                            </code>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleCopyToken('"v=spf1 include:amazonses.com ~all"', 1001)
                                              }
                                              className="shrink-0 h-6 w-6 p-0 overflow-hidden"
                                            >
                                              <AnimatedCopyIcon
                                                isCopied={copiedToken === '"v=spf1 include:amazonses.com ~all"-1001'}
                                              />
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Optional: Inbound Email */}
                            {config?.aws?.sesRegion && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-xs font-semibold text-neutral-900">Inbound email</h4>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    OPTIONAL
                                  </Badge>
                                </div>
                                <p className="text-xs text-neutral-600 mb-2">
                                  Configure this MX record to receive emails at your domain.
                                </p>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border-collapse">
                                    <thead>
                                      <tr className="border-b border-neutral-200">
                                        <th className="text-left py-2 px-3 font-medium text-neutral-700 bg-neutral-50">
                                          Type
                                        </th>
                                        <th className="text-left py-2 px-3 font-medium text-neutral-700 bg-neutral-50">
                                          Name
                                        </th>
                                        <th className="text-left py-2 px-3 font-medium text-neutral-700 bg-neutral-50">
                                          Value
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-200">
                                      {/* Inbound MX Record */}
                                      <tr className="hover:bg-neutral-50/50">
                                        <td className="py-3 px-3">
                                          <code className="text-xs font-medium text-neutral-900">MX</code>
                                        </td>
                                        <td className="py-3 px-3">
                                          <div className="flex items-center gap-2">
                                            <code className="text-xs font-mono text-neutral-700 break-all flex-1">
                                              {domain.domain}
                                            </code>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleCopyToken(domain.domain, 3002)}
                                              className="shrink-0 h-6 w-6 p-0 overflow-hidden"
                                            >
                                              <AnimatedCopyIcon isCopied={copiedToken === `${domain.domain}-3002`} />
                                            </Button>
                                          </div>
                                        </td>
                                        <td className="py-3 px-3">
                                          <div className="flex items-center gap-2">
                                            <code className="text-xs font-mono text-neutral-700 break-all flex-1">
                                              10 inbound-smtp.{config.aws.sesRegion}.amazonaws.com
                                            </code>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleCopyToken(
                                                  `10 inbound-smtp.${config.aws.sesRegion}.amazonaws.com`,
                                                  1002,
                                                )
                                              }
                                              className="shrink-0 h-6 w-6 p-0 overflow-hidden"
                                            >
                                              <AnimatedCopyIcon
                                                isCopied={
                                                  copiedToken ===
                                                  `10 inbound-smtp.${config.aws.sesRegion}.amazonaws.com-1002`
                                                }
                                              />
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

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
