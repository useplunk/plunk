import {IconSpinner} from '@plunk/ui';
import {createTranslator, FormSchemas, type Translator} from '@plunk/shared';
import type {FormField, FormSettings, FormSubmitResult, PublicFormConfig} from '@plunk/types';
import {useRouter} from 'next/router';
import React, {useEffect, useState} from 'react';

import {FormPreview, type FormFieldValues} from '../../components/FormPreview';
import {network} from '../../lib/network';

export default function PublicFormPage() {
  const router = useRouter();
  const {publicId} = router.query;

  const [config, setConfig] = useState<PublicFormConfig | null>(null);
  const [translator, setTranslator] = useState<Translator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [email, setEmail] = useState('');
  const [fieldValues, setFieldValues] = useState<FormFieldValues>({});
  const [hp, setHp] = useState('');

  useEffect(() => {
    if (!router.isReady || !publicId || typeof publicId !== 'string') return;

    const fetchForm = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await network.fetch<PublicFormConfig>('GET', `/forms/public/${publicId}`);
        setConfig(data);
        const t = await createTranslator(data.language || 'en');
        setTranslator(t);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form');
        const t = await createTranslator('en');
        setTranslator(t);
      } finally {
        setLoading(false);
      }
    };

    void fetchForm();
  }, [publicId, router.isReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicId || typeof publicId !== 'string') return;

    try {
      setSubmitting(true);
      setError(null);
      const result = await network.fetch<FormSubmitResult, typeof FormSchemas.submit>(
        'POST',
        `/forms/public/${publicId}/submit`,
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

  const fields: FormField[] = config?.fields ?? [];
  const settings: FormSettings = config?.settings ?? {};

  if (!router.isReady || (loading && !config)) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50">
        <IconSpinner />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-lg w-full rounded-lg border bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-neutral-900">{translator?.t('pages.common.error') ?? 'Error'}</h1>
          <p className="text-neutral-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="max-w-lg w-full">
        <FormPreview
          name={config?.name ?? 'Subscribe'}
          settings={settings}
          fields={fields}
          email={email}
          fieldValues={fieldValues}
          onEmailChange={setEmail}
          onFieldChange={(key, value) => setFieldValues(v => ({...v, [key]: value}))}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={error}
          success={success}
          showHoneypot
          hp={hp}
          onHpChange={setHp}
        />
      </div>
    </div>
  );
}
