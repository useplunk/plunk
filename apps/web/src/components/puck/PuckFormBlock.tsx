import {IconSpinner} from '@plunk/ui';
import {createTranslator, FormSchemas, type Translator} from '@plunk/shared';
import type {FormField, FormSettings, FormSubmitResult, PublicFormConfig} from '@plunk/types';
import React, {useEffect, useState} from 'react';

import {FormPreview, type FormFieldValues} from '../FormPreview';
import {network} from '../../lib/network';

interface PuckFormBlockProps {
  formPublicId?: string;
  disabled?: boolean;
}

export function PuckFormBlock({formPublicId, disabled = false}: PuckFormBlockProps) {
  const [config, setConfig] = useState<PublicFormConfig | null>(null);
  const [translator, setTranslator] = useState<Translator | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [fieldValues, setFieldValues] = useState<FormFieldValues>({});
  const [hp, setHp] = useState('');

  useEffect(() => {
    if (!formPublicId) {
      setConfig(null);
      setError(null);
      return;
    }

    const fetchForm = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await network.fetch<PublicFormConfig>('GET', `/forms/public/${formPublicId}`);
        setConfig(data);
        const t = await createTranslator(data.language || 'en');
        setTranslator(t);
      } catch (err) {
        setConfig(null);
        setError(err instanceof Error ? err.message : 'Failed to load form');
        const t = await createTranslator('en');
        setTranslator(t);
      } finally {
        setLoading(false);
      }
    };

    void fetchForm();
  }, [formPublicId]);

  if (!formPublicId) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-neutral-500">
        Select a form in the block settings
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <IconSpinner />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center">
        <p className="text-sm font-medium text-red-500">{error}</p>
      </div>
    );
  }

  if (!config) return null;

  const fields: FormField[] = config.fields ?? [];
  const settings: FormSettings = config.settings ?? {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || !formPublicId) return;

    try {
      setSubmitting(true);
      setError(null);
      const result = await network.fetch<FormSubmitResult, typeof FormSchemas.submit>(
        'POST',
        `/forms/public/${formPublicId}/submit`,
        {
          email,
          data: fieldValues,
          hp,
        },
      );

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto w-full">
      <FormPreview
        name={config.name}
        settings={settings}
        fields={fields}
        email={email}
        fieldValues={fieldValues}
        onEmailChange={disabled ? undefined : setEmail}
        onFieldChange={disabled ? undefined : (key, value) => setFieldValues(v => ({...v, [key]: value}))}
        onSubmit={disabled ? undefined : handleSubmit}
        submitting={submitting}
        error={error}
        success={success}
        disabled={disabled}
        showHoneypot={!disabled}
        hp={hp}
        onHpChange={setHp}
      />
      {!disabled && error && !success && translator && (
        <p className="sr-only">{translator.t('pages.common.error')}</p>
      )}
    </div>
  );
}
