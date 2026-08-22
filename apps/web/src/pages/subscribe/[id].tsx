import {Button, Card, CardContent, IconSpinner} from '@plunk/ui';
import {createTranslator, type Translator} from '@plunk/shared';
import {AnimatePresence, motion} from 'framer-motion';
import {useRouter} from 'next/router';
import {sourceEmailQuery} from '../../lib/sourceEmail';
import React, {useEffect, useState} from 'react';

import {network} from '../../lib/network';

interface ContactInfo {
  id: string;
  email: string;
  subscribed: boolean;
  language: string;
}

export default function Subscribe() {
  const router = useRouter();
  const {id} = router.query;

  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [translator, setTranslator] = useState<Translator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchContact = async () => {
      try {
        setLoading(true);
        const data = await network.fetch<ContactInfo>('GET', `/contacts/public/${id}`);
        setContact(data);

        // Load translations for the project's language
        const t = await createTranslator(data.language || 'en');
        setTranslator(t);

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contact information');
      } finally {
        setLoading(false);
      }
    };

    void fetchContact();
  }, [id]);

  const handleSubscribe = async () => {
    if (!id || typeof id !== 'string') return;

    try {
      setSubscribing(true);
      const data = await network.fetch<ContactInfo>(
        'POST',
        `/contacts/public/${id}/subscribe${sourceEmailQuery(router.query)}`,
      );
      setContact(data);
      setSuccess(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  // Don't render until translations are loaded
  if (!translator) {
    return (
      <div className={'h-screen flex items-center justify-center bg-neutral-50'}>
        <div className={'flex flex-col gap-6 max-w-2xl w-full px-4'}>
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4">
                <IconSpinner />
                <p className="text-sm text-neutral-500">Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={'h-screen flex items-center justify-center bg-neutral-50'}>
        <div className={'flex flex-col gap-6 max-w-2xl w-full px-4'}>
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4">
                <IconSpinner />
                <p className="text-sm text-neutral-500">{translator.t('pages.common.loading')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error && !contact) {
    return (
      <div className={'h-screen flex items-center justify-center bg-neutral-50'}>
        <div className={'flex flex-col gap-6 max-w-2xl w-full px-4'}>
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-neutral-900">{translator.t('pages.common.error')}</h1>
                <p className="text-neutral-500">{error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (success || (contact && contact.subscribed)) {
    return (
      <div className={'h-screen flex items-center justify-center bg-neutral-50'}>
        <div className={'flex flex-col gap-6 max-w-2xl w-full px-4'}>
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <motion.div
                  initial={{scale: 0}}
                  animate={{scale: 1}}
                  transition={{type: 'spring', stiffness: 200, damping: 15}}
                  className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center"
                >
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <h1 className="text-2xl font-bold text-neutral-900">{translator.t('pages.subscribe.successTitle')}</h1>
                <p className="text-neutral-500">
                  {translator.t('pages.subscribe.successDescription', {email: contact?.email || ''})}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={'h-screen flex items-center justify-center bg-neutral-50'}>
      <div className={'flex flex-col gap-6 max-w-2xl w-full px-4'}>
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center gap-2">
                <h1 className="text-2xl font-bold text-neutral-900">{translator.t('pages.subscribe.title')}</h1>
                <p className="text-neutral-500">
                  {translator.t('pages.subscribe.description', {email: contact?.email || ''})}
                </p>
              </div>

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

              <Button onClick={() => void handleSubscribe()} className="w-full" disabled={subscribing}>
                {subscribing ? (
                  <div className="flex items-center gap-2">
                    <IconSpinner size="sm" />
                    <span>{translator.t('pages.subscribe.buttonLoading')}</span>
                  </div>
                ) : (
                  translator.t('pages.subscribe.button')
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
