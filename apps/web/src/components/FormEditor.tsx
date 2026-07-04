
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@plunk/ui';
import type {FormField, FormFieldType, FormSettings} from '@plunk/types';
import type {Segment} from '@plunk/db';
import {FormSchemas} from '@plunk/shared';
import {network} from '../lib/network';
import {FORM_EMAIL_FIELD_KEY, FORM_FIELD_TYPE_OPTIONS, FormPreview, reorderFieldsFromOrder, resolveFieldOrder} from './FormPreview';
import {FormPreviewEditor} from './FormPreviewEditor';
import {ChevronDown, ChevronUp, GripVertical, Plus, Save, Trash2, X} from 'lucide-react';
import {useRouter} from 'next/router';
import {useEffect, useState, type DragEvent} from 'react';
import {toast} from 'sonner';
import useSWR from 'swr';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

interface FormEditorProps {
  mode: 'create' | 'edit';
  formId?: string;
}

export function FormEditor({mode, formId}: FormEditorProps) {
  const router = useRouter();
  const {data: existingForm, isLoading: loadingForm} = useSWR(
    mode === 'edit' && formId ? `/forms/${formId}` : null,
  );
  const {data: segments} = useSWR<Segment[]>('/segments');

  const staticSegments = segments?.filter(s => s.type === 'STATIC') ?? [];

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [fieldOrder, setFieldOrder] = useState<string[]>([FORM_EMAIL_FIELD_KEY]);
  const [destinationTab, setDestinationTab] = useState<'static' | 'dynamic'>('dynamic');
  const [segmentId, setSegmentId] = useState<string>('');
  const [createSegment, setCreateSegment] = useState(false);
  const [tags, setTags] = useState<Array<{key: string; value: string}>>([{key: 'source', value: 'form'}]);
  const [settings, setSettings] = useState<FormSettings>({
    title: '',
    description: '',
    successMessage: 'Thanks for signing up!',
    doubleOptIn: false,
    verifyEmail: false,
  });
  const [enabled, setEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedFieldIndex, setDraggedFieldIndex] = useState<number | null>(null);
  const [dragOverFieldIndex, setDragOverFieldIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    if (existingForm && mode === 'edit') {
      const form = existingForm as {
        name: string;
        slug: string;
        fields: FormField[];
        settings: FormSettings;
        segmentId: string | null;
        enabled: boolean;
      };
      setName(form.name);
      setSlug(form.slug);
      setSlugTouched(true);
      setFields(Array.isArray(form.fields) ? form.fields : []);
      setFieldOrder(resolveFieldOrder(form.settings?.fieldOrder, Array.isArray(form.fields) ? form.fields : []));
      setSettings(typeof form.settings === 'object' && form.settings ? form.settings : {});
      setSegmentId(form.segmentId ?? '');
      setCreateSegment(false);
      setDestinationTab(form.segmentId ? 'static' : 'dynamic');
      const formTags = form.settings?.tags;
      if (formTags && typeof formTags === 'object') {
        setTags(Object.entries(formTags).map(([key, value]) => ({key, value: String(value)})));
      }
      setEnabled(form.enabled);
    }
  }, [existingForm, mode]);

  useEffect(() => {
    if (!slugTouched && name) {
      setSlug(slugify(name));
    }
  }, [name, slugTouched]);

  const addField = () => {
    const newKey = `field_${fields.length + 1}`;
    setFields(prev => [
      ...prev,
      {
        key: newKey,
        label: 'Custom field',
        type: 'text',
        required: false,
        placeholder: '',
      },
    ]);
    setFieldOrder(prev => [...prev, newKey]);
  };

  const updateField = (index: number, patch: Partial<FormField>) => {
    const oldKey = fields[index]?.key;
    if (patch.key && oldKey && patch.key !== oldKey) {
      setFieldOrder(order => order.map(k => (k === oldKey ? patch.key! : k)));
    }

    setFields(prev =>
      prev.map((f, i) => {
        if (i !== index) return f;
        const updated = {...f, ...patch};
        if (patch.type === 'select' && !updated.options?.length) {
          updated.options = ['Option 1'];
        }
        if (patch.type && patch.type !== 'select') {
          updated.options = undefined;
        }
        return updated;
      }),
    );
  };

  const updateFieldByKey = (key: string, patch: Partial<FormField>) => {
    const index = fields.findIndex(f => f.key === key);
    if (index >= 0) updateField(index, patch);
  };

  const updateFieldOption = (fieldIndex: number, optionIndex: number, value: string) => {
    setFields(prev =>
      prev.map((f, i) => {
        if (i !== fieldIndex) return f;
        const options = [...(f.options ?? [])];
        options[optionIndex] = value;
        return {...f, options};
      }),
    );
  };

  const addFieldOption = (fieldIndex: number) => {
    setFields(prev =>
      prev.map((f, i) => {
        if (i !== fieldIndex) return f;
        const options = [...(f.options ?? []), `Option ${(f.options?.length ?? 0) + 1}`];
        return {...f, options};
      }),
    );
  };

  const removeFieldOption = (fieldIndex: number, optionIndex: number) => {
    setFields(prev =>
      prev.map((f, i) => {
        if (i !== fieldIndex) return f;
        const options = (f.options ?? []).filter((_, oi) => oi !== optionIndex);
        return {...f, options};
      }),
    );
  };

  const removeField = (key: string) => {
    setFields(prev => prev.filter(f => f.key !== key));
    setFieldOrder(prev => prev.filter(k => k !== key));
  };

  const moveFieldOrderItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= fieldOrder.length) return;
    setFieldOrder(prev => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const handleFieldDragStart = (index: number) => {
    setDraggedFieldIndex(index);
  };

  const handleFieldDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedFieldIndex === null || draggedFieldIndex === index) return;
    setDragOverFieldIndex(index);
  };

  const handleFieldDrop = (index: number) => {
    if (draggedFieldIndex !== null) {
      moveFieldOrderItem(draggedFieldIndex, index);
    }
    setDraggedFieldIndex(null);
    setDragOverFieldIndex(null);
  };

  const handleFieldDragEnd = () => {
    setDraggedFieldIndex(null);
    setDragOverFieldIndex(null);
  };

  const addTag = () => setTags(prev => [...prev, {key: '', value: ''}]);
  const updateTag = (index: number, patch: Partial<{key: string; value: string}>) => {
    setTags(prev => prev.map((t, i) => (i === index ? {...t, ...patch} : t)));
  };
  const removeTag = (index: number) => setTags(prev => prev.filter((_, i) => i !== index));

  const buildPayload = () => {
    const tagsRecord: Record<string, string> = {};
    for (const tag of tags) {
      if (tag.key.trim()) tagsRecord[tag.key.trim()] = tag.value;
    }

    const settingsPayload: FormSettings = {
      ...settings,
      fieldOrder,
      tags: Object.keys(tagsRecord).length > 0 ? tagsRecord : undefined,
    };

    return {
      name,
      slug,
      fields: reorderFieldsFromOrder(fields, fieldOrder),
      settings: settingsPayload,
      enabled,
      ...(destinationTab === 'static'
        ? {
            segmentId: createSegment ? undefined : segmentId || undefined,
            createSegment: createSegment || undefined,
          }
        : mode === 'edit'
          ? {segmentId: null}
          : {}),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (destinationTab === 'static' && !createSegment && !segmentId) {
      toast.error('Select a static segment or choose to create one');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = buildPayload();
      if (mode === 'create') {
        FormSchemas.create.parse(payload);
        const form = await network.fetch<{id: string}, typeof FormSchemas.create>('POST', '/forms', payload);
        toast.success('Form created');
        void router.push(`/forms/${form.id}`);
      } else if (formId) {
        FormSchemas.update.parse(payload);
        await network.fetch('PATCH', `/forms/${formId}`, payload);
        toast.success('Form saved');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save form');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === 'edit' && loadingForm) {
    return <div className="flex justify-center py-24">Loading...</div>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
      <form onSubmit={e => void handleSubmit(e)} className="space-y-6 min-w-0">
      <Card>
        <CardHeader>
          <CardTitle>Basic info</CardTitle>
          <CardDescription>Name and URL slug for this form</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="Newsletter signup" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={e => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              required
              placeholder="newsletter-signup"
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            />
            <p className="text-xs text-neutral-500">
              Writes tag <code className="bg-neutral-100 px-1 rounded">form:{slug || 'slug'}</code> on each contact
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="rounded" />
            Published (public link active)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Page content</CardTitle>
          <CardDescription>What visitors see on the hosted form page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={settings.title ?? ''}
              onChange={e => setSettings(s => ({...s, title: e.target.value}))}
              placeholder={name || 'Subscribe'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={settings.description ?? ''}
              onChange={e => setSettings(s => ({...s, description: e.target.value}))}
              placeholder="Get updates delivered to your inbox"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="successMessage">Success message</Label>
            <Input
              id="successMessage"
              value={settings.successMessage ?? ''}
              onChange={e => setSettings(s => ({...s, successMessage: e.target.value}))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="redirectUrl">Redirect URL (optional)</Label>
            <Input
              id="redirectUrl"
              type="url"
              value={settings.redirectUrl ?? ''}
              onChange={e => setSettings(s => ({...s, redirectUrl: e.target.value || undefined}))}
              placeholder="https://yoursite.com/thanks"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fields</CardTitle>
          <CardDescription>Email is always collected. Add optional custom fields stored on the contact.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fieldOrder.map((orderKey, index) => {
            const reorderControls = (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => moveFieldOrderItem(index, index - 1)}
                  aria-label="Move field up"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={index === fieldOrder.length - 1}
                  onClick={() => moveFieldOrderItem(index, index + 1)}
                  aria-label="Move field down"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            );

            if (orderKey === FORM_EMAIL_FIELD_KEY) {
              return (
                <div
                  key={orderKey}
                  onDragOver={e => handleFieldDragOver(e, index)}
                  onDrop={() => handleFieldDrop(index)}
                  className={`p-4 border rounded-lg space-y-3 bg-neutral-50/50 transition-colors ${
                    draggedFieldIndex === index ? 'opacity-50' : ''
                  } ${dragOverFieldIndex === index ? 'border-neutral-400 bg-neutral-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div
                      draggable
                      onDragStart={() => handleFieldDragStart(index)}
                      onDragEnd={handleFieldDragEnd}
                      className="flex items-center gap-2 text-sm cursor-grab active:cursor-grabbing"
                    >
                      <GripVertical className="h-4 w-4 text-neutral-500" />
                      <Badge>email</Badge>
                      <span className="font-medium">Email</span>
                      <span className="text-neutral-500">Required</span>
                    </div>
                    {reorderControls}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-neutral-500">Placeholder</Label>
                    <Input
                      id="emailPlaceholder"
                      value={settings.emailPlaceholder ?? ''}
                      onChange={e => setSettings(s => ({...s, emailPlaceholder: e.target.value || undefined}))}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
              );
            }

            const fieldIndex = fields.findIndex(f => f.key === orderKey);
            if (fieldIndex === -1) return null;
            const field = fields[fieldIndex];

            return (
              <div
                key={orderKey}
                onDragOver={e => handleFieldDragOver(e, index)}
                onDrop={() => handleFieldDrop(index)}
                className={`p-4 border rounded-lg space-y-3 transition-colors ${
                  draggedFieldIndex === index ? 'opacity-50' : ''
                } ${dragOverFieldIndex === index ? 'border-neutral-400 bg-neutral-50' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    draggable
                    onDragStart={() => handleFieldDragStart(index)}
                    onDragEnd={handleFieldDragEnd}
                    className="flex items-center gap-2 text-sm text-neutral-500 cursor-grab active:cursor-grabbing"
                  >
                    <GripVertical className="h-4 w-4" />
                    <span>{field.label || field.key}</span>
                  </div>
                  {reorderControls}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-neutral-500">Key</Label>
                    <Input
                      value={field.key}
                      onChange={e => updateField(fieldIndex, {key: e.target.value})}
                      placeholder="field_key"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-neutral-500">Label</Label>
                    <Input
                      value={field.label}
                      onChange={e => updateField(fieldIndex, {label: e.target.value})}
                      placeholder="Label"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-neutral-500">Type</Label>
                    <select
                      value={field.type}
                      onChange={e => updateField(fieldIndex, {type: e.target.value as FormFieldType})}
                      className="w-full border rounded-md px-3 py-2 text-sm h-10"
                    >
                      {FORM_FIELD_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-neutral-500">Placeholder</Label>
                    <Input
                      value={field.placeholder ?? ''}
                      onChange={e => updateField(fieldIndex, {placeholder: e.target.value || undefined})}
                      placeholder="Optional placeholder"
                      disabled={field.type === 'checkbox'}
                    />
                  </div>
                </div>

                {field.type === 'select' && (
                  <div className="space-y-2 pl-1">
                    <Label className="text-xs text-neutral-500">Options</Label>
                    {(field.options ?? []).map((option, optionIndex) => (
                      <div key={optionIndex} className="flex gap-2">
                        <Input
                          value={option}
                          onChange={e => updateFieldOption(fieldIndex, optionIndex, e.target.value)}
                          placeholder={`Option ${optionIndex + 1}`}
                          className="flex-1"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={() => removeFieldOption(fieldIndex, optionIndex)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => addFieldOption(fieldIndex)}>
                      <Plus className="h-4 w-4 mr-1" /> Add option
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={e => updateField(fieldIndex, {required: e.target.checked})}
                      className="rounded"
                    />
                    Required
                  </label>
                  <Button type="button" variant="outline" size="sm" onClick={() => removeField(field.key)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
          <Button type="button" variant="outline" size="sm" onClick={addField}>
            <Plus className="h-4 w-4 mr-1" /> Add field
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Destination</CardTitle>
          <CardDescription>Where signups go after submit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 p-1 bg-neutral-100 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setDestinationTab('dynamic')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                destinationTab === 'dynamic' ? 'bg-white shadow text-neutral-900' : 'text-neutral-600'
              }`}
            >
              Dynamic (tags)
            </button>
            <button
              type="button"
              onClick={() => setDestinationTab('static')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                destinationTab === 'static' ? 'bg-white shadow text-neutral-900' : 'text-neutral-600'
              }`}
            >
              Static segment
            </button>
          </div>

          {destinationTab === 'dynamic' ? (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600">
                Tags are written to <code className="bg-neutral-100 px-1 rounded">contact.data</code> on every submit.
                Create a dynamic segment filtering on these tags — e.g.{' '}
                <code className="bg-neutral-100 px-1 rounded">data.form:{slug || 'slug'} equals true</code> or{' '}
                <code className="bg-neutral-100 px-1 rounded">data.source equals newsletter</code>.
              </p>
              <p className="text-sm text-neutral-500">
                Event <code className="bg-neutral-100 px-1 rounded">form.submitted</code> is tracked for workflows.
              </p>
              {tags.map((tag, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={tag.key}
                    onChange={e => updateTag(index, {key: e.target.value})}
                    placeholder="key"
                    className="sm:w-40"
                  />
                  <Input
                    value={tag.value}
                    onChange={e => updateTag(index, {value: e.target.value})}
                    placeholder="value"
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => removeTag(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                <Plus className="h-4 w-4 mr-1" /> Add tag
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createSegment}
                  onChange={e => setCreateSegment(e.target.checked)}
                  className="rounded"
                />
                Create new static segment automatically
              </label>
              {!createSegment && (
                <div className="space-y-2">
                  <Label>Link to existing static segment</Label>
                  <select
                    value={segmentId}
                    onChange={e => setSegmentId(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    <option value="">Select segment...</option>
                    {staticSegments.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <p className="text-sm text-neutral-500">
                Static membership is added directly on submit. Tags and events are still written for workflows.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.doubleOptIn ?? false}
              onChange={e => setSettings(s => ({...s, doubleOptIn: e.target.checked}))}
              className="rounded mt-0.5"
            />
            <span>
              <span className="font-medium">Double opt-in</span>
              <span className="block text-neutral-500">Create contacts as unsubscribed; use a workflow with{' '}
                <code className="bg-neutral-100 px-1 rounded">{'{{subscribeUrl}}'}</code> to confirm.</span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.verifyEmail ?? false}
              onChange={e => setSettings(s => ({...s, verifyEmail: e.target.checked}))}
              className="rounded mt-0.5"
            />
            <span>
              <span className="font-medium">Validate email</span>
              <span className="block text-neutral-500">Reject disposable addresses and invalid domains</span>
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {mode === 'create' ? 'Create form' : 'Save changes'}
        </Button>
      </div>
      </form>

      <aside className="hidden lg:block sticky top-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-neutral-700">Form preview</p>
            <div className="flex gap-1 p-0.5 bg-neutral-100 rounded-md">
              <button
                type="button"
                onClick={() => setPreviewMode('edit')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  previewMode === 'edit' ? 'bg-white shadow text-neutral-900' : 'text-neutral-600'
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('preview')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  previewMode === 'preview' ? 'bg-white shadow text-neutral-900' : 'text-neutral-600'
                }`}
              >
                Preview
              </button>
            </div>
          </div>
          <div className="rounded-xl bg-neutral-50 p-4 border">
            {previewMode === 'edit' ? (
              <FormPreviewEditor
                name={name}
                settings={{...settings, fieldOrder}}
                fields={fields}
                fieldOrder={fieldOrder}
                onSettingsChange={patch => setSettings(s => ({...s, ...patch}))}
                onFieldUpdate={updateFieldByKey}
                onFieldOrderChange={setFieldOrder}
                onAddField={addField}
                onRemoveField={removeField}
              />
            ) : (
              <FormPreview name={name} settings={{...settings, fieldOrder}} fields={fields} disabled compact />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
