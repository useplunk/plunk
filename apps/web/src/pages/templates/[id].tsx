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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectItemWithDescription,
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
import {ArrowLeft, Save, Send, Trash2} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useEffect, useState} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';
import {TemplateSchemas} from '@plunk/shared';
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
  const [hasChanges, setHasChanges] = useState(false);
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
      // Reset hasChanges when loading fresh data
      setHasChanges(false);
    }
  }, [template, editedTemplate]);

  // Track changes
  useEffect(() => {
    if (!template || Object.keys(editedTemplate).length === 0) return;

    const changed =
      editedTemplate.name !== template.name ||
      (editedTemplate.description || '') !== (template.description || '') ||
      editedTemplate.subject !== template.subject ||
      editedTemplate.body !== template.body ||
      editedTemplate.from !== template.from ||
      (editedTemplate.fromName || '') !== (template.fromName || '') ||
      (editedTemplate.replyTo || '') !== (template.replyTo || '') ||
      editedTemplate.type !== template.type;

    setHasChanges(changed);
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
      setHasChanges(false);
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
      await network.fetch('POST', `/templates/${id}/test`, {
        email: testEmailAddress,
      });
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
          <div className="text-center">
            <svg
              className="h-8 w-8 animate-spin mx-auto text-neutral-900"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="mt-2 text-sm text-neutral-500">Loading template...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <form onSubmit={handleSave} className={`max-w-5xl mx-auto space-y-6 ${hasChanges ? 'pb-32' : ''}`}>
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/templates">
              <Button type="button" variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Edit Template</h1>
              <p className="text-neutral-500 mt-1 text-sm sm:text-base">Make changes to your email template</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              {!hasChanges && !isSubmitting && (
                <span className="text-xs sm:text-sm text-neutral-500">All changes saved</span>
              )}
              {hasChanges && !isSubmitting && (
                <span className="text-xs sm:text-sm text-amber-600">Unsaved changes</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTestEmailDialogOpen(true)}
                className="flex-1 sm:flex-none"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send Test</span>
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="flex-1 sm:flex-none"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
              <Button type="submit" disabled={!hasChanges || isSubmitting} className="flex-1 sm:flex-none">
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                <span className="sm:hidden">{isSubmitting ? 'Saving...' : 'Save'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Template Editor */}
        <div className="space-y-6">
          {/* Template Settings */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Template Settings</CardTitle>
                <CardDescription>Configure the basic settings for your template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={editedTemplate.name || ''}
                    onChange={e => setEditedTemplate({...editedTemplate, name: e.target.value})}
                    required
                    placeholder="Welcome Email"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    type="text"
                    value={editedTemplate.description || ''}
                    onChange={e => setEditedTemplate({...editedTemplate, description: e.target.value})}
                    placeholder="Sent to new subscribers"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={editedTemplate.type}
                    onValueChange={value =>
                      setEditedTemplate({...editedTemplate, type: value as 'MARKETING' | 'TRANSACTIONAL'})
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItemWithDescription
                        value="MARKETING"
                        title="Marketing"
                        description="Includes unsubscribe link, respects opt-out"
                      />
                      <SelectItemWithDescription
                        value="TRANSACTIONAL"
                        title="Transactional"
                        description="For receipts, alerts - sent regardless of opt-out"
                      />
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-neutral-500 mt-1">
                    Marketing templates will automatically include a Plunk-hosted unsubscribe link.
                  </p>
                </div>

                <div>
                  <Label htmlFor="subject">Subject Line *</Label>
                  <Input
                    id="subject"
                    type="text"
                    value={editedTemplate.subject || ''}
                    onChange={e => setEditedTemplate({...editedTemplate, subject: e.target.value})}
                    required
                    placeholder="Welcome to our platform!"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Use {'{{variableName}}'} for dynamic content</p>
                </div>

                <EmailSettings
                  from={editedTemplate.from || ''}
                  fromName={editedTemplate.fromName || ''}
                  replyTo={editedTemplate.replyTo || ''}
                  onFromChange={value => setEditedTemplate({...editedTemplate, from: value})}
                  onFromNameChange={value => setEditedTemplate({...editedTemplate, fromName: value})}
                  onReplyToChange={value => setEditedTemplate({...editedTemplate, replyTo: value})}
                  fromNamePlaceholder={activeProject?.name || 'Your Company'}
                  showFromNameHelpText
                  layout="vertical"
                />
              </CardContent>
            </Card>
          </div>

          {/* Email Body */}
          <div>
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
          </div>
        </div>
      </form>

      {/* Sticky Save Bar */}
      <StickySaveBar hasChanges={hasChanges} isSubmitting={isSubmitting} onSave={handleSave} />

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
