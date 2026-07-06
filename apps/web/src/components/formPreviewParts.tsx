import {Button, Card, CardContent, IconSpinner, Input, Label, Textarea} from '@plunk/ui';
import type {FormField, FormSettings} from '@plunk/types';
import {useEffect, useState} from 'react';

import {FORM_EMAIL_FIELD_KEY, getFormFieldInputType, selectClassName} from './formPreviewShared';

const editingRingClass = 'ring-2 ring-blue-200 border-blue-300';

export function formPreviewTitleClass(compact?: boolean) {
  return `font-bold text-neutral-900 text-center w-full ${compact ? 'text-xl' : 'text-2xl'}`;
}

export function FormPreviewShell({children}: {children: React.ReactNode}) {
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-6 relative">{children}</div>
      </CardContent>
    </Card>
  );
}

function FormPreviewHeaderEditable({
  name,
  settings,
  compact,
  onSettingsChange,
}: {
  name: string;
  settings: FormSettings;
  compact?: boolean;
  onSettingsChange?: (patch: Partial<FormSettings>) => void;
}) {
  const fallbackTitle = name || 'Subscribe';
  const titleClass = formPreviewTitleClass(compact);
  const [showDescription, setShowDescription] = useState(Boolean(settings.description));

  useEffect(() => {
    if (settings.description) setShowDescription(true);
  }, [settings.description]);

  return (
    <div className="text-center space-y-2">
      <input
        type="text"
        value={settings.title ?? ''}
        onChange={e => onSettingsChange?.({title: e.target.value || undefined})}
        placeholder={fallbackTitle}
        className={`${titleClass} bg-transparent border border-transparent rounded-md px-2 py-1 hover:border-neutral-200 focus:border-neutral-400 focus:outline-none placeholder:text-neutral-900 placeholder:font-bold`}
        aria-label="Form title"
      />
      {showDescription ? (
        <input
          type="text"
          value={settings.description ?? ''}
          onChange={e => onSettingsChange?.({description: e.target.value || undefined})}
          onBlur={e => {
            if (!e.target.value.trim()) setShowDescription(false);
          }}
          placeholder="Add a description (optional)"
          className="w-full text-center text-neutral-500 text-sm bg-transparent border border-transparent rounded-md px-2 py-1 hover:border-neutral-200 focus:border-neutral-400 focus:outline-none"
          aria-label="Form description"
          autoFocus={!settings.description}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowDescription(true)}
          className="text-neutral-400 text-sm hover:text-neutral-500 transition-colors"
        >
          Add description
        </button>
      )}
    </div>
  );
}

export function FormPreviewHeader({
  name,
  settings,
  compact,
  editable,
  onSettingsChange,
}: {
  name: string;
  settings: FormSettings;
  compact?: boolean;
  editable?: boolean;
  onSettingsChange?: (patch: Partial<FormSettings>) => void;
}) {
  const fallbackTitle = name || 'Subscribe';
  const titleClass = formPreviewTitleClass(compact);

  if (editable) {
    return (
      <FormPreviewHeaderEditable
        name={name}
        settings={settings}
        compact={compact}
        onSettingsChange={onSettingsChange}
      />
    );
  }

  const title = settings.title || fallbackTitle;
  const description = settings.description;

  return (
    <div className="text-center space-y-2">
      <h2 className={titleClass}>{title}</h2>
      {description && <p className="text-neutral-500 text-sm">{description}</p>}
    </div>
  );
}

function EditableLabel({
  htmlFor,
  value,
  onChange,
  inline,
}: {
  htmlFor?: string;
  value: string;
  onChange: (value: string) => void;
  inline?: boolean;
}) {
  return (
    <input
      type="text"
      id={htmlFor}
      value={value}
      onChange={e => onChange(e.target.value)}
      className={
        inline
          ? 'bg-transparent border border-transparent rounded px-0.5 -mx-0.5 text-sm hover:border-neutral-200 focus:border-neutral-400 focus:outline-none min-w-16'
          : 'text-sm font-medium leading-none w-full bg-transparent border border-transparent rounded px-0.5 -mx-0.5 hover:border-neutral-200 focus:border-neutral-400 focus:outline-none'
      }
      aria-label="Field label"
    />
  );
}

function EditablePlaceholderInput({
  id,
  type = 'text',
  placeholder,
  fallbackPlaceholder,
  onPlaceholderChange,
}: {
  id?: string;
  type?: string;
  placeholder?: string;
  fallbackPlaceholder: string;
  onPlaceholderChange: (value: string | undefined) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const displayPlaceholder = placeholder || fallbackPlaceholder;

  const startEditing = () => {
    setEditing(true);
    setDraft(placeholder ?? '');
  };

  const commit = () => {
    setEditing(false);
    onPlaceholderChange(draft.trim() || undefined);
  };

  return (
    <Input
      id={id}
      type={type}
      readOnly={!editing}
      value={editing ? draft : ''}
      placeholder={displayPlaceholder}
      onFocus={startEditing}
      onBlur={commit}
      onChange={e => setDraft(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      className={`cursor-text ${editing ? editingRingClass : ''}`}
      aria-label="Edit placeholder"
    />
  );
}

function EditablePlaceholderTextarea({
  id,
  placeholder,
  fallbackPlaceholder,
  onPlaceholderChange,
}: {
  id?: string;
  placeholder?: string;
  fallbackPlaceholder: string;
  onPlaceholderChange: (value: string | undefined) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const displayPlaceholder = placeholder || fallbackPlaceholder;

  const startEditing = () => {
    setEditing(true);
    setDraft(placeholder ?? '');
  };

  const commit = () => {
    setEditing(false);
    onPlaceholderChange(draft.trim() || undefined);
  };

  return (
    <Textarea
      id={id}
      readOnly={!editing}
      value={editing ? draft : ''}
      placeholder={displayPlaceholder}
      onFocus={startEditing}
      onBlur={commit}
      onChange={e => setDraft(e.target.value)}
      className={`cursor-text resize-none ${editing ? editingRingClass : ''}`}
      aria-label="Edit placeholder"
    />
  );
}

function EditablePlaceholderSelect({
  id,
  placeholder,
  options,
  onPlaceholderChange,
}: {
  id?: string;
  placeholder?: string;
  options: string[];
  onPlaceholderChange: (value: string | undefined) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const displayPlaceholder = placeholder || 'Select...';

  const startEditing = () => {
    setEditing(true);
    setDraft(placeholder ?? '');
  };

  const commit = () => {
    setEditing(false);
    onPlaceholderChange(draft.trim() || undefined);
  };

  if (editing) {
    return (
      <Input
        id={id}
        autoFocus
        value={draft}
        placeholder={displayPlaceholder}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        className={`${selectClassName} ${editingRingClass}`}
        aria-label="Edit select placeholder"
      />
    );
  }

  return (
    <select
      id={id}
      className={`${selectClassName} cursor-text`}
      value=""
      onMouseDown={e => {
        e.preventDefault();
        startEditing();
      }}
      onFocus={e => {
        e.preventDefault();
        startEditing();
      }}
      aria-label="Edit placeholder"
    >
      <option value="">{displayPlaceholder}</option>
      {(options ?? []).map(opt => (
        <option key={opt} value={opt} disabled>
          {opt}
        </option>
      ))}
    </select>
  );
}

export function FormPreviewEmailField({
  settings,
  editable,
  onSettingsChange,
  email,
  onEmailChange,
  disabled,
  inputId = 'email',
}: {
  settings: FormSettings;
  editable?: boolean;
  onSettingsChange?: (patch: Partial<FormSettings>) => void;
  email?: string;
  onEmailChange?: (value: string) => void;
  disabled?: boolean;
  inputId?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Email</Label>
      {editable ? (
        <EditablePlaceholderInput
          id={inputId}
          type="email"
          placeholder={settings.emailPlaceholder}
          fallbackPlaceholder="you@example.com"
          onPlaceholderChange={value => onSettingsChange?.({emailPlaceholder: value})}
        />
      ) : (
        <Input
          id={inputId}
          type="email"
          required
          disabled={disabled}
          value={email ?? ''}
          onChange={e => onEmailChange?.(e.target.value)}
          placeholder={settings.emailPlaceholder || 'you@example.com'}
          autoComplete="email"
        />
      )}
    </div>
  );
}

export function FormPreviewCustomField({
  field,
  editable,
  onFieldUpdate,
  value,
  onChange,
  disabled,
}: {
  field: FormField;
  editable?: boolean;
  onFieldUpdate?: (key: string, patch: Partial<FormField>) => void;
  value?: string | number | boolean;
  onChange?: (key: string, value: string | number | boolean) => void;
  disabled?: boolean;
}) {
  const inputId = editable ? `preview-${field.key}` : field.key;

  if (field.type === 'checkbox') {
    if (editable) {
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" disabled tabIndex={-1} className="rounded pointer-events-none" />
          <EditableLabel
            inline
            value={field.label}
            onChange={label => onFieldUpdate?.(field.key, {label})}
          />
        </label>
      );
    }

    return (
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          id={inputId}
          checked={value === true}
          required={field.required}
          disabled={disabled}
          onChange={e => onChange?.(field.key, e.target.checked)}
          className="rounded"
        />
        <span>{field.label}</span>
      </label>
    );
  }

  const labelNode = editable ? (
    <EditableLabel
      htmlFor={inputId}
      value={field.label}
      onChange={label => onFieldUpdate?.(field.key, {label})}
    />
  ) : (
    <Label htmlFor={inputId}>{field.label}</Label>
  );

  if (editable) {
    return (
      <div className="space-y-2">
        {labelNode}
        {field.type === 'textarea' ? (
          <EditablePlaceholderTextarea
            id={inputId}
            placeholder={field.placeholder}
            fallbackPlaceholder="Placeholder text"
            onPlaceholderChange={v => onFieldUpdate?.(field.key, {placeholder: v})}
          />
        ) : field.type === 'select' ? (
          <EditablePlaceholderSelect
            id={inputId}
            placeholder={field.placeholder}
            options={field.options ?? []}
            onPlaceholderChange={v => onFieldUpdate?.(field.key, {placeholder: v})}
          />
        ) : (
          <EditablePlaceholderInput
            id={inputId}
            type={getFormFieldInputType(field)}
            placeholder={field.placeholder}
            fallbackPlaceholder="Placeholder text"
            onPlaceholderChange={v => onFieldUpdate?.(field.key, {placeholder: v})}
          />
        )}
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className="space-y-2">
        {labelNode}
        <Textarea
          id={inputId}
          required={field.required}
          disabled={disabled}
          value={value !== undefined ? String(value) : ''}
          onChange={e => onChange?.(field.key, e.target.value)}
          placeholder={field.placeholder}
        />
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="space-y-2">
        {labelNode}
        <select
          id={inputId}
          required={field.required}
          disabled={disabled}
          value={value !== undefined ? String(value) : ''}
          onChange={e => onChange?.(field.key, e.target.value)}
          className={selectClassName}
        >
          <option value="">{field.placeholder || 'Select...'}</option>
          {(field.options ?? []).map(opt => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const inputType = getFormFieldInputType(field);

  return (
    <div className="space-y-2">
      {labelNode}
      <Input
        id={inputId}
        type={inputType}
        required={field.required}
        disabled={disabled}
        value={
          field.type === 'number'
            ? value === undefined || value === ''
              ? ''
              : String(value)
            : value !== undefined
              ? String(value)
              : ''
        }
        onChange={e => {
          if (field.type === 'number') {
            onChange?.(field.key, e.target.value === '' ? '' : Number(e.target.value));
          } else {
            onChange?.(field.key, e.target.value);
          }
        }}
        placeholder={field.placeholder}
      />
    </div>
  );
}

export function FormPreviewSubmitButton({
  editable,
  interactive,
  submitting,
  disabled,
}: {
  editable?: boolean;
  interactive?: boolean;
  submitting?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type={interactive ? 'submit' : 'button'}
      className={`w-full ${editable ? 'pointer-events-none' : ''}`}
      disabled={disabled || submitting}
      tabIndex={editable ? -1 : undefined}
    >
      {submitting ? (
        <span className="flex items-center justify-center gap-2">
          <IconSpinner size="sm" />
          Submitting...
        </span>
      ) : (
        'Subscribe'
      )}
    </Button>
  );
}

export {FORM_EMAIL_FIELD_KEY};
