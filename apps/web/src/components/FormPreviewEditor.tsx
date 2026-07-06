import {Button} from '@plunk/ui';
import type {FormField, FormSettings} from '@plunk/types';
import {GripVertical, Plus, Trash2} from 'lucide-react';
import {useState, type DragEvent, type ReactNode} from 'react';

import {
  FORM_EMAIL_FIELD_KEY,
  FormPreviewCustomField,
  FormPreviewEmailField,
  FormPreviewHeader,
  FormPreviewShell,
  FormPreviewSubmitButton,
} from './formPreviewParts';
import {resolveFieldOrder} from './formPreviewShared';

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

function EditableFieldWrapper({
  index,
  isEmail,
  onRemove,
  draggedIndex,
  dragOverIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  children,
}: {
  index: number;
  isEmail?: boolean;
  onRemove?: () => void;
  draggedIndex: number | null;
  dragOverIndex: number | null;
  onDragStart: (index: number) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>, index: number) => void;
  onDrop: (index: number) => void;
  onDragEnd: () => void;
  children: ReactNode;
}) {
  const isDragging = draggedIndex === index;
  const isDragOver = dragOverIndex === index;

  return (
    <div
      onDragOver={e => onDragOver(e, index)}
      onDrop={() => onDrop(index)}
      className={`group relative pl-6 pr-6 -mx-1 rounded-lg transition-colors ${
        isDragging ? 'opacity-50' : ''
      } ${isDragOver ? 'bg-neutral-100 ring-1 ring-neutral-300' : ''}`}
    >
      <div
        draggable
        onDragStart={() => onDragStart(index)}
        onDragEnd={onDragEnd}
        className="absolute left-0 top-3 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-neutral-400"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {!isEmail && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-0 top-2 opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-opacity"
          aria-label="Remove field"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {children}
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

  const wrapperProps = {
    draggedIndex,
    dragOverIndex,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
    onDragEnd: handleDragEnd,
  };

  return (
    <FormPreviewShell>
      <FormPreviewHeader name={name} settings={settings} compact editable onSettingsChange={onSettingsChange} />

      {orderedKeys.map((orderKey, index) => {
        if (orderKey === FORM_EMAIL_FIELD_KEY) {
          return (
            <EditableFieldWrapper key={orderKey} index={index} isEmail {...wrapperProps}>
              <FormPreviewEmailField
                settings={settings}
                editable
                onSettingsChange={onSettingsChange}
                inputId="preview-email"
              />
            </EditableFieldWrapper>
          );
        }

        const field = fieldsByKey.get(orderKey);
        if (!field) return null;

        return (
          <EditableFieldWrapper
            key={orderKey}
            index={index}
            onRemove={() => onRemoveField(field.key)}
            {...wrapperProps}
          >
            <FormPreviewCustomField field={field} editable onFieldUpdate={onFieldUpdate} />
          </EditableFieldWrapper>
        );
      })}

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={onAddField}>
        <Plus className="h-4 w-4 mr-1" />
        Add field
      </Button>

      <FormPreviewSubmitButton editable />
    </FormPreviewShell>
  );
}
