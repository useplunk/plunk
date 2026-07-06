import {AnimatePresence, motion} from 'framer-motion';
import React from 'react';

import {
  FORM_EMAIL_FIELD_KEY,
  FormPreviewCustomField,
  FormPreviewEmailField,
  FormPreviewHeader,
  FormPreviewShell,
  FormPreviewSubmitButton,
} from './formPreviewParts';
import type {FormFieldValues} from './formPreviewShared';
import {resolveFieldOrder} from './formPreviewShared';
import type {FormField, FormSettings} from '@plunk/types';

export type {FormFieldValues};
export {
  FORM_EMAIL_FIELD_KEY,
  FORM_FIELD_TYPE_OPTIONS,
  reorderFieldsFromOrder,
  resolveFieldOrder,
} from './formPreviewShared';

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
  const successMessage = settings.successMessage || 'Thanks for signing up!';
  const isInteractive = !disabled && !!onSubmit;
  const fieldDisabled = disabled || !onFieldChange;
  const orderedKeys = resolveFieldOrder(settings.fieldOrder, fields);
  const fieldsByKey = new Map(fields.map(f => [f.key, f]));

  if (success) {
    return (
      <div className={compact ? '' : 'min-h-[200px] flex items-center justify-center'}>
        <FormPreviewShell>
          <div className="text-center">
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
          </div>
        </FormPreviewShell>
      </div>
    );
  }

  const body = (
    <>
      <FormPreviewHeader name={name} settings={settings} compact={compact} />

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
            <FormPreviewEmailField
              key={orderKey}
              settings={settings}
              email={email}
              onEmailChange={onEmailChange}
              disabled={fieldDisabled}
            />
          );
        }

        const field = fieldsByKey.get(orderKey);
        if (!field) return null;

        return (
          <FormPreviewCustomField
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

      <FormPreviewSubmitButton interactive={isInteractive} submitting={submitting} disabled={disabled} />
    </>
  );

  if (isInteractive) {
    return (
      <FormPreviewShell>
        <form onSubmit={e => onSubmit?.(e)} className="space-y-6 relative">
          {body}
        </form>
      </FormPreviewShell>
    );
  }

  return <FormPreviewShell>{body}</FormPreviewShell>;
}
