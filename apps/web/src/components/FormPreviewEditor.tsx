import {Button, Card, CardContent, Input, Label, Textarea} from '@plunk/ui';
import type {FormField, FormSettings} from '@plunk/types';
import {GripVertical, Plus, Trash2} from 'lucide-react';
import {useState, type DragEvent} from 'react';

import {
  FORM_EMAIL_FIELD_KEY,
  getFormFieldInputType,
  resolveFieldOrder,
  selectClassName,
} from './formPreviewShared';

interface FormPreviewEditorProps {
  name: string;
  settings: FormSettings;
  fields: FormField[];
  fieldOrder: string[];
  onSettingsChange: (patch: Partial<FormSettings>) => void;
  onFieldUpdate: (key: string, patch: Partial<FormField>) => void;
  onFieldOrderChange: (order: string[]) => void;
  onAddField: () => void;
  onRemoveField: (key: string) => void;
}

const editableTitleClass =
  'w-full text-center font-bold text-neutral-900 text-xl bg-transparent border border-transparent rounded-md px-2 py-1 hover:border-neutral-200 focus:border-neutral-400 focus:outline-none focus:ring-0';
const editableDescriptionClass =
  'w-full text-center text-neutral-500 text-sm bg-transparent border border-transparent rounded-md px-2 py-1 hover:border-neutral-200 focus:border-neutral-400 focus:outline-none focus:ring-0';
const editableLabelClass =
  'w-full bg-transparent border border-transparent rounded px-1 -mx-1 text-sm font-medium hover:border-neutral-200 focus:border-neutral-400 focus:outline-none';
const editablePlaceholderClass =
  'w-full text-xs text-neutral-400 bg-transparent border border-transparent rounded px-1 -mx-1 mt-1 hover:border-neutral-200 focus:border-neutral-400 focus:outline-none';

function PreviewFieldBlock({
  orderKey,
  index,
  field,
  settings,
  onSettingsChange,
  onFieldUpdate,
  onRemoveField,
  draggedIndex,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  orderKey: string;
  index: number;
  field?: FormField;
  settings: FormSettings;
  onSettingsChange: (patch: Partial<FormSettings>) => void;
  onFieldUpdate: (key: string, patch: Partial<FormField>) => void;
  onRemoveField: (key: string) => void;
  draggedIndex: number | null;
  dragOverIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>, index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
}) {
  const isEmail = orderKey === FORM_EMAIL_FIELD_KEY;
  const isDragging = draggedIndex === index;
  const isDragOver = dragOverIndex === index;

  const blockClass = `group relative pl-7 pr-7 py-2 -mx-2 rounded-lg transition-colors ${
    isDragging ? 'opacity-50' : ''
  } ${isDragOver ? 'bg-neutral-100 ring-1 ring-neutral-300' : 'hover:bg-neutral-50/80'}`;

  const dragHandle = (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragEnd={onDragEnd}
      className="absolute left-0 top-3 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-neutral-400"
      aria-label="Drag to reorder"
    >
      <GripVertical className="h-4 w-4" />
    </div>
  );

  if (isEmail) {
    return (
      <div
        key={orderKey}
        onDragOver={e => onDragOver(e, index)}
        onDrop={() => onDrop(index)}
        className={blockClass}
      >
        {dragHandle}
        <div className="space-y-1">
          <Label htmlFor="preview-email">Email</Label>
          <Input
            id="preview-email"
            type="email"
            disabled
            tabIndex={-1}
            placeholder={settings.emailPlaceholder || 'you@example.com'}
            className="pointer-events-none"
          />
          <input
            type="text"
            value={settings.emailPlaceholder ?? ''}
            onChange={e => onSettingsChange({emailPlaceholder: e.target.value || undefined})}
            placeholder="Placeholder (e.g. you@example.com)"
            className={editablePlaceholderClass}
            aria-label="Email placeholder"
          />
        </div>
      </div>
    );
  }

  if (!field) return null;

  const inputType = getFormFieldInputType(field);

  return (
    <div key={orderKey} onDragOver={e => onDragOver(e, index)} onDrop={() => onDrop(index)} className={blockClass}>
      {dragHandle}
      {!isEmail && (
        <button
          type="button"
          onClick={() => onRemoveField(field.key)}
          className="absolute right-0 top-2 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity"
          aria-label="Remove field"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {field.type === 'checkbox' ? (
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled tabIndex={-1} className="rounded pointer-events-none" />
            <input
              type="text"
              value={field.label}
              onChange={e => onFieldUpdate(field.key, {label: e.target.value})}
              className={editableLabelClass}
              aria-label="Checkbox label"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-1">
          <input
            type="text"
            value={field.label}
            onChange={e => onFieldUpdate(field.key, {label: e.target.value})}
            className={editableLabelClass}
            aria-label="Field label"
          />
          {field.type === 'textarea' ? (
            <Textarea disabled tabIndex={-1} placeholder={field.placeholder} className="pointer-events-none resize-none" />
          ) : field.type === 'select' ? (
            <select disabled tabIndex={-1} className={`${selectClassName} pointer-events-none`} value="">
              <option value="">{field.placeholder || 'Select...'}</option>
              {(field.options ?? []).map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <Input
              type={inputType}
              disabled
              tabIndex={-1}
              placeholder={field.placeholder}
              className="pointer-events-none"
            />
          )}
          {field.type !== 'checkbox' && field.type !== 'select' && (
            <input
              type="text"
              value={field.placeholder ?? ''}
              onChange={e => onFieldUpdate(field.key, {placeholder: e.target.value || undefined})}
              placeholder="Placeholder text"
              className={editablePlaceholderClass}
              aria-label="Field placeholder"
            />
          )}
          {field.type === 'select' && (
            <input
              type="text"
              value={field.placeholder ?? ''}
              onChange={e => onFieldUpdate(field.key, {placeholder: e.target.value || undefined})}
              placeholder="Empty option label (e.g. Select...)"
              className={editablePlaceholderClass}
              aria-label="Select placeholder"
            />
          )}
        </div>
      )}
    </div>
  );
}

export function FormPreviewEditor({
  name,
  settings,
  fields,
  fieldOrder,
  onSettingsChange,
  onFieldUpdate,
  onFieldOrderChange,
  onAddField,
  onRemoveField,
}: FormPreviewEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const orderedKeys = resolveFieldOrder(fieldOrder, fields);
  const fieldsByKey = new Map(fields.map(f => [f.key, f]));

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= orderedKeys.length) return;
    const next = [...orderedKeys];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    onFieldOrderChange(next);
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex !== null) moveItem(draggedIndex, index);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <Card className="w-full ring-1 ring-neutral-200 shadow-sm">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <input
              type="text"
              value={settings.title ?? ''}
              onChange={e => onSettingsChange({title: e.target.value || undefined})}
              placeholder={name || 'Subscribe'}
              className={editableTitleClass}
              aria-label="Form title"
            />
            <input
              type="text"
              value={settings.description ?? ''}
              onChange={e => onSettingsChange({description: e.target.value || undefined})}
              placeholder="Add a description (optional)"
              className={editableDescriptionClass}
              aria-label="Form description"
            />
          </div>

          {orderedKeys.map((orderKey, index) => (
            <PreviewFieldBlock
              key={orderKey}
              orderKey={orderKey}
              index={index}
              field={fieldsByKey.get(orderKey)}
              settings={settings}
              onSettingsChange={onSettingsChange}
              onFieldUpdate={onFieldUpdate}
              onRemoveField={onRemoveField}
              draggedIndex={draggedIndex}
              dragOverIndex={dragOverIndex}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
            />
          ))}

          <Button type="button" variant="outline" size="sm" className="w-full" onClick={onAddField}>
            <Plus className="h-4 w-4 mr-1" />
            Add field
          </Button>

          <Button type="button" className="w-full pointer-events-none" tabIndex={-1}>
            Subscribe
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
