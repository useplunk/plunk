import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItemWithDescription,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@plunk/ui';
import {NextSeo} from 'next-seo';
import {DashboardLayout} from '../../components/DashboardLayout';
import {EmailSettings} from '../../components/EmailSettings';
import {EmailEditor} from '../../components/EmailEditor';
import {network} from '../../lib/network';
import {EmailFormValidator} from '../../lib/validation';
import {ArrowLeft, Save} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useState} from 'react';
import {toast} from 'sonner';
import {TemplateSchemas} from '@plunk/shared';
import {useActiveProject} from '../../lib/contexts/ActiveProjectProvider';

export default function CreateTemplatePage() {
  const router = useRouter();
  const {activeProject} = useActiveProject();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [from, setFrom] = useState('');
  const [fromName, setFromName] = useState('');
  const [replyTo, setReplyTo] = useState('');
  const [type, setType] = useState<'MARKETING' | 'TRANSACTIONAL'>('MARKETING');
  const [disableFooter, setDisableFooter] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = EmailFormValidator.validateTemplate({name, subject, body, from});
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);

    try {
      const template = await network.fetch<{id: string}, typeof TemplateSchemas.create>('POST', '/templates', {
        name,
        description: description || undefined,
        subject,
        body,
        from,
        fromName: fromName || null,
        replyTo: replyTo || null,
        type,
        disableFooter,
      });

      toast.success('Template created successfully');
      void router.push(`/templates/${template.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create template');
      setSaving(false);
    }
  };

  return (
    <>
      <NextSeo title="Create Template" />
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Link href="/templates">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Create Template</h1>
                <p className="text-neutral-500 mt-1 text-sm sm:text-base">
                  Create a reusable email template for campaigns and workflows
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={saving} className="w-full sm:w-auto">
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">{saving ? 'Creating...' : 'Create Template'}</span>
                <span className="sm:hidden">{saving ? 'Creating...' : 'Create'}</span>
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Template Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Template Settings</CardTitle>
                <CardDescription>Configure your template details and email settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      placeholder="Welcome Email"
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Template Type *</Label>
                    <Select value={type} onValueChange={value => setType(value as 'MARKETING' | 'TRANSACTIONAL')}>
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
                  </div>
                </div>

                {type === 'MARKETING' && (
                  <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 md:col-span-2">
                    <div className="space-y-0.5">
                      <Label htmlFor="disableFooter">Disable default footer</Label>
                      <p className="text-xs text-neutral-500">
                        When enabled, the default unsubscribe footer will not be appended. You are responsible for
                        including your own unsubscribe mechanism.
                      </p>
                    </div>
                    <Switch
                      id="disableFooter"
                      checked={disableFooter}
                      onCheckedChange={setDisableFooter}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Sent to new subscribers"
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Subject Line *</Label>
                  <Input
                    id="subject"
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    required
                    placeholder="Welcome to our platform!"
                  />
                </div>

                <EmailSettings
                  from={from}
                  fromName={fromName}
                  replyTo={replyTo}
                  onFromChange={setFrom}
                  onFromNameChange={setFromName}
                  onReplyToChange={setReplyTo}
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
                <EmailEditor value={body} onChange={setBody} />
              </CardContent>
            </Card>
          </form>
        </div>
      </DashboardLayout>
    </>
  );
}
