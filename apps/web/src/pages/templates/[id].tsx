import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  IconSpinner,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,

  SelectTrigger,
  SelectValue,
  StickySaveBar,
} from '@plunk/ui';
import type {Template} from '@plunk/db';
import {DashboardLayout} from '../../components/DashboardLayout';
import {EmailSettings} from '../../components/EmailSettings';
import {EmailEditor} from '../../components/EmailEditor';
import {network} from '../../lib/network';
import {useChangeTracking} from '../../lib/hooks/useChangeTracking';
import {ArrowLeft, Save, Send, Trash2, TriangleAlert} from 'lucide-react';
import Link from 'next/link';
import {NextSeo} from 'next-seo';
import {useRouter} from 'next/router';
import {useEffect, useMemo, useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';
import {TemplateSchemas, detectUnsubscribeSignal} from '@plunk/shared';
import {useActiveProject} from '../../lib/contexts/ActiveProjectProvider';

export default function TemplateEditorPage() {
  const router = useRouter();
  const {id} = router.query;
  const {activeProject} = useActiveProject();

  const {data: template, mutate} = useSWR<Template>(id ? `/templates/${id}` : null, {
    revalidateOnFocus: false,
  });

  const [editedTemplate, setEditedTemplate] = useState<Partial<Template>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isTestEmailDialogOpen, setIsTestEmailDialogOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  // Fetch project members for test email recipient selection
  const {data: projectMembers} = useSWR<{data: Array<{userId: string; email: string; role: string}>}>(
    template?.projectId ? `/projects/${template.projectId}/members` : null,
    {revalidateOnFocus: false},
  );

  // Initialize edit fields when template loads
  useEffect(() => {
    if (template && Object.keys(editedTemplate).length === 0) {
      setEditedTemplate({
        name: template.name,
        description: template.description || '',
        subject: template.subject,
        body: template.body,
        from: template.from,
        fromName: template.fromName || '',
        replyTo: template.replyTo || '',
        type: template.type,
      });
    }
  }, [template, editedTemplate]);

  const hasChanges = useMemo(() => {
    if (!template || Object.keys(editedTemplate).length === 0) return false;
    return (
      editedTemplate.name !== template.name ||
      (editedTemplate.description || '') !== (template.description || '') ||
      editedTemplate.subject !== template.subject ||
      editedTemplate.body !== template.body ||
      editedTemplate.from !== template.from ||
      (editedTemplate.fromName || '') !== (template.fromName || '') ||
      (editedTemplate.replyTo || '') !== (template.replyTo || '') ||
      editedTemplate.type !== template.type
    );
  }, [editedTemplate, template]);

  // Warn before leaving page with unsaved changes
  useChangeTracking(hasChanges);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      await network.fetch<Template, typeof TemplateSchemas.update>('PATCH', `/templates/${id}`, {
        name: editedTemplate.name,
        description: editedTemplate.description || undefined,
        subject: editedTemplate.subject,
        body: editedTemplate.body,
        from: editedTemplate.from,
        fromName: editedTemplate.fromName || null,
        replyTo: editedTemplate.replyTo || null,
        type: editedTemplate.type,
      });

      // Silent save - no toast notification
      void mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) return;
    setSendingTestEmail(true);
    try {
      // Send what is in the editor right now, so no save is required first.
      await network.fetch<unknown, never>('POST', `/templates/${id}/test`, {
        email: testEmailAddress,
        subject: editedTemplate.subject,
        body: editedTemplate.body,
        from: editedTemplate.from,
        fromName: editedTemplate.fromName || null,
        replyTo: editedTemplate.replyTo || null,
      } as Record<string, unknown> as never);
      toast.success(`Test email sent to ${testEmailAddress}`);
      setIsTestEmailDialogOpen(false);
      setTestEmailAddress('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send test email');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleDelete = async () => {
    try {
      await network.fetch('DELETE', `/templates/${id}`);
      toast.success('Template deleted successfully');
      void router.push('/templates');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete template');
    }
  };

  if (!template || Object.keys(editedTemplate).length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <IconSpinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <NextSeo title={template.name} />
      <div className={`space-y-6 ${hasChanges ? 'pb-32' : ''}`}>
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/templates"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Edit Template</h1>
            <p className="text-neutral-500 mt-1 text-sm sm:text-base">
              {isSubmitting
                ? 'Saving...'
                : hasChanges
                  ? <span className="text-amber-600">Unsaved changes</span>
                  : 'All changes saved'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Row 1: Basic Info + Template Type */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Name and describe your template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    type="text"
                    value={editedTemplate.name || ''}
                    onChange={e => setEditedTemplate({...editedTemplate, name: e.target.value})}
                    required
                    placeholder="Welcome Email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    type="text"
                    value={editedTemplate.description || ''}
                    onChange={e => setEditedTemplate({...editedTemplate, description: e.target.value})}
                    placeholder="Sent to new subscribers"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Template Type</CardTitle>
                <CardDescription>Choose how this template should be treated</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  {([
                    {value: 'MARKETING', label: 'Marketing', description: 'Subscribed contacts, includes unsubscribe link'},
                    {value: 'TRANSACTIONAL', label: 'Transactional', description: 'All contacts, no subscription check or footer'},
                    {value: 'HEADLESS', label: 'Headless', description: 'Subscribed contacts, no Plunk footer'},
                  ] as const).map(({value, label, description}) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setEditedTemplate({...editedTemplate, type: value})}
                      className={`flex items-center justify-between w-full min-h-[44px] px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                        editedTemplate.type === value
                          ? 'border-neutral-900 bg-neutral-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <span className="font-medium text-sm text-neutral-900 shrink-0">{label}</span>
                      <span className="text-xs text-neutral-500 ml-4 text-right">{description}</span>
                    </button>
                  ))}
                </div>
                {editedTemplate.type === 'HEADLESS' && !detectUnsubscribeSignal(editedTemplate.body ?? '') && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-100/60 px-3 py-2">
                      <TriangleAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <p className="text-xs font-semibold text-amber-900">No unsubscribe link detected</p>
                    </div>
                    <div className="px-3 py-2.5 space-y-2">
                      <p className="text-xs text-amber-800 leading-relaxed">
                        You are responsible for providing recipients a way to opt out. Use the Plunk variables below to build your own footer.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <code className="inline-flex items-center rounded bg-amber-100 border border-amber-200 px-1.5 py-0.5 font-mono text-[11px] text-amber-900">
                          {'{{unsubscribeUrl}}'}
                        </code>
                        <code className="inline-flex items-center rounded bg-amber-100 border border-amber-200 px-1.5 py-0.5 font-mono text-[11px] text-amber-900">
                          {'{{manageUrl}}'}
                        </code>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>Configure sender information and subject</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line <span className="text-red-500">*</span></Label>
                <Input
                  id="subject"
                  type="text"
                  value={editedTemplate.subject || ''}
                  onChange={e => setEditedTemplate({...editedTemplate, subject: e.target.value})}
                  required
                  placeholder="Welcome to our platform!"
                />
                <p className="text-xs text-neutral-500">Use {'{{variableName}}'} for dynamic content</p>
              </div>

              <EmailSettings
                from={editedTemplate.from || ''}
                fromName={editedTemplate.fromName || ''}
                replyTo={editedTemplate.replyTo || ''}
                onFromChange={value => setEditedTemplate({...editedTemplate, from: value})}
                onFromNameChange={value => setEditedTemplate({...editedTemplate, fromName: value})}
                onReplyToChange={value => setEditedTemplate({...editedTemplate, replyTo: value})}
                fromNamePlaceholder={activeProject?.name || 'Your Company'}
              />
            </CardContent>
          </Card>

          {/* Email Body */}
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle>Email Body</CardTitle>
              <CardDescription>Create your email using the visual editor or paste custom HTML</CardDescription>
            </CardHeader>
            <CardContent>
              <EmailEditor
                value={editedTemplate.body || ''}
                onChange={body => setEditedTemplate({...editedTemplate, body})}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Template
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTestEmailDialogOpen(true)}
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send Test</span>
              </Button>
              <Button type="submit" disabled={!hasChanges || isSubmitting}>
                <Save className="h-4 w-4" />
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Sticky Save Bar */}
      <StickySaveBar status={isSubmitting ? 'saving' : hasChanges ? 'dirty' : 'idle'} onSave={handleSave} />

      {/* Send Test Email Dialog */}
      <Dialog open={isTestEmailDialogOpen} onOpenChange={setIsTestEmailDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test version of this template to a project member to verify how it looks. The test email will be
              prefixed with [TEST] in the subject line.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="testEmail">Project Member</Label>
              <Select value={testEmailAddress} onValueChange={setTestEmailAddress}>
                <SelectTrigger id="testEmail" className="mt-2">
                  <SelectValue placeholder="Select a project member..." />
                </SelectTrigger>
                <SelectContent>
                  {projectMembers?.data.map(member => (
                    <SelectItem key={member.userId} value={member.email}>
                      {member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-neutral-500 mt-2">
                For security reasons, test emails can only be sent to project members.
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                Note: Variables will not be replaced in test emails. The email will be sent exactly as designed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsTestEmailDialogOpen(false);
                setTestEmailAddress('');
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSendTestEmail} disabled={sendingTestEmail || !testEmailAddress}>
              {sendingTestEmail ? 'Sending...' : 'Send Test Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title="Delete Template"
        description="Are you sure you want to delete this template? This action cannot be undone."
        confirmText="Delete Template"
        variant="destructive"
      />
    </DashboardLayout>
  );
}
