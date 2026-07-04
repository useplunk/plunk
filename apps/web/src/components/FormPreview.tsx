import {Button, Card, CardContent, IconSpinner, Input, Label, Textarea} from '@plunk/ui';
import type {FormField, FormSettings} from '@plunk/types';
import {AnimatePresence, motion} from 'framer-motion';
import React from 'react';

import {
  FORM_EMAIL_FIELD_KEY,
  type FormFieldValues,
  getFormFieldInputType,
  resolveFieldOrder,
  selectClassName,
} from './formPreviewShared';

export type {FormFieldValues};
export {
  FORM_EMAIL_FIELD_KEY,
  FORM_FIELD_TYPE_OPTIONS,
  reorderFieldsFromOrder,
  resolveFieldOrder,
} from './formPreviewShared';

interface FormFieldInputProps {
  field: FormField;
  value: string | number | boolean | undefined;
  onChange?: (key: string, value: string | number | boolean) => void;
  disabled?: boolean;
}

function FormFieldInput({field, value, onChange, disabled}: FormFieldInputProps) {
  const handleChange = (newValue: string | number | boolean) => {
    onChange?.(field.key, newValue);
  };

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          id={field.key}
          checked={value === true}
          required={field.required}
          disabled={disabled}
          onChange={e => handleChange(e.target.checked)}
          className="rounded"
        />
        <span>{field.label}</span>
      </label>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.key}>{field.label}</Label>
        <Textarea
          id={field.key}
          required={field.required}
          disabled={disabled}
          value={value !== undefined ? String(value) : ''}
          onChange={e => handleChange(e.target.value)}
          placeholder={field.placeholder}
        />
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="space-y-2">
        <Label htmlFor={field.key}>{field.label}</Label>
        <select
          id={field.key}
          required={field.required}
          disabled={disabled}
          value={value !== undefined ? String(value) : ''}
          onChange={e => handleChange(e.target.value)}
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
      <Label htmlFor={field.key}>{field.label}</Label>
      <Input
        id={field.key}
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
            handleChange(e.target.value === '' ? '' : Number(e.target.value));
          } else {
            handleChange(e.target.value);
          }
        }}
        placeholder={field.placeholder}
      />
    </div>
  );
}

export interface FormPreviewProps {
  name: string;
  settings: FormSettings;
  fields: FormField[];
  email?: string;
  fieldValues?: FormFieldValues;
  onEmailChange?: (email: string) => void;
  onFieldChange?: (key: string, value: string | number | boolean) => void;
  onSubmit?: (e: React.FormEvent) => void;
  submitting?: boolean;
  error?: string | null;
  success?: boolean;
  disabled?: boolean;
  showHoneypot?: boolean;
  hp?: string;
  onHpChange?: (hp: string) => void;
  compact?: boolean;
}

export function FormPreview({
  name,
  settings,
  fields,
  email = '',
  fieldValues = {},
  onEmailChange,
  onFieldChange,
  onSubmit,
  submitting = false,
  error = null,
  success = false,
  disabled = false,
  showHoneypot = false,
  hp = '',
  onHpChange,
  compact = false,
}: FormPreviewProps) {
  const title = settings.title || name || 'Subscribe';
  const description = settings.description;
  const successMessage = settings.successMessage || 'Thanks for signing up!';
  const isInteractive = !disabled && !!onSubmit;
  const fieldDisabled = disabled || !onFieldChange;
  const orderedKeys = resolveFieldOrder(settings.fieldOrder, fields);
  const fieldsByKey = new Map(fields.map(f => [f.key, f]));

  if (success) {
    return (
      <div className={compact ? '' : 'min-h-[200px] flex items-center justify-center'}>
        <Card className="w-full">
          <CardContent className={compact ? 'p-6' : 'p-8 text-center'}>
            <motion.div
              initial={{scale: 0}}
              animate={{scale: 1}}
              className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
            >
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <h2 className="text-xl font-bold text-neutral-900">{successMessage}</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formContent = (
    <>
      <div className="text-center space-y-2">
        <h2 className={`font-bold text-neutral-900 ${compact ? 'text-xl' : 'text-2xl'}`}>{title}</h2>
        {description && <p className="text-neutral-500 text-sm">{description}</p>}
      </div>

      {showHoneypot && (
        <input
          type="text"
          name="hp"
          value={hp}
          onChange={e => onHpChange?.(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          className="absolute opacity-0 pointer-events-none h-0 w-0"
          aria-hidden
        />
      )}

      {orderedKeys.map(orderKey => {
        if (orderKey === FORM_EMAIL_FIELD_KEY) {
          return (
            <div key={orderKey} className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                disabled={fieldDisabled}
                value={email}
                onChange={e => onEmailChange?.(e.target.value)}
                placeholder={settings.emailPlaceholder || 'you@example.com'}
                autoComplete="email"
              />
            </div>
          );
        }

        const field = fieldsByKey.get(orderKey);
        if (!field) return null;

        return (
          <FormFieldInput
            key={field.key}
            field={field}
            value={fieldValues[field.key]}
            onChange={onFieldChange}
            disabled={fieldDisabled}
          />
        );
      })}

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{opacity: 0, y: -10}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -10}}
            className="text-sm font-medium text-red-500 text-center"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <Button type={isInteractive ? 'submit' : 'button'} className="w-full" disabled={disabled || submitting}>
        {submitting ? (
          <span className="flex items-center gap-2">
            <IconSpinner size="sm" />
            Submitting...
          </span>
        ) : (
          'Subscribe'
        )}
      </Button>
    </>
  );

  if (isInteractive) {
    return (
      <Card className="w-full">
        <CardContent className={compact ? 'p-6' : 'p-8'}>
          <form onSubmit={e => onSubmit?.(e)} className="space-y-6 relative">
            {formContent}
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className={compact ? 'p-6' : 'p-8'}>
        <div className="space-y-6 relative">{formContent}</div>
      </CardContent>
    </Card>
  );
}
