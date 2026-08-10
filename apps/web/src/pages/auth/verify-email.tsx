import {AuthenticationSchemas} from '@plunk/shared';
import {Button, Card, CardContent, IconSpinner} from '@plunk/ui';
import {AnimatePresence, motion} from 'framer-motion';
import {NextSeo} from 'next-seo';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/router';
import React, {useEffect, useRef, useState} from 'react';

import {network} from '../../lib/network';

const dotGrid = {
  backgroundColor: '#fafafa',
  backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
  backgroundSize: '20px 20px',
};


export default function VerifyEmail() {
  const router = useRouter();
  const {token} = router.query;

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'pending'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string>('');
  const [cooldownExpiry, setCooldownExpiry] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const processedToken = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const normalizedToken = typeof token === 'string' ? token : undefined;

    if (processedToken.current === normalizedToken) {
      return;
    }

    processedToken.current = normalizedToken;

    if (!token || typeof token !== 'string') {
      setStatus('pending');
      return;
    }

    setStatus('verifying');

    async function verifyEmail() {
      try {
        const response = await network.fetch<{success: boolean}, typeof AuthenticationSchemas.verifyEmail>(
          'POST',
          '/auth/verify-email',
          {token: token as string},
        );

        if (response.success) {
          setStatus('success');
          setTimeout(() => {
            void router.push('/');
          }, 2000);
        } else {
          setStatus('error');
          setErrorMessage('Invalid or expired verification link');
        }
      } catch (error) {
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
      }
    }

    void verifyEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, token]);

  useEffect(() => {
    const storedExpiry = localStorage.getItem('plunk:email-verification-cooldown');
    if (storedExpiry) {
      const expiryTime = parseInt(storedExpiry, 10);
      if (!isNaN(expiryTime) && expiryTime > Date.now() && expiryTime < Date.now() + 3600000) {
        setCooldownExpiry(expiryTime);
      } else {
        localStorage.removeItem('plunk:email-verification-cooldown');
      }
    }
  }, []);

  useEffect(() => {
    if (!cooldownExpiry) {
      setRemainingSeconds(0);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((cooldownExpiry - Date.now()) / 1000));
      setRemainingSeconds(remaining);

      if (remaining === 0) {
        setCooldownExpiry(null);
        localStorage.removeItem('plunk:email-verification-cooldown');
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);

    return () => clearInterval(interval);
  }, [cooldownExpiry]);

  async function handleResend() {
    setIsResending(true);
    setResendMessage('');
    try {
      const response = await network.fetch<{success: boolean}>('POST', '/auth/request-verification');

      if (response.success) {
        setResendMessage('Verification email sent! Please check your inbox.');
        const expiryTime = Date.now() + 60000;
        setCooldownExpiry(expiryTime);
        localStorage.setItem('plunk:email-verification-cooldown', expiryTime.toString());
      } else {
        setResendMessage('Couldn’t send the verification email. Try again in a moment.');
      }
    } catch (error) {
      setResendMessage(error instanceof Error ? error.message : 'Couldn’t send the verification email. Try again in a moment.');
      const expiryTime = Date.now() + 60000;
      setCooldownExpiry(expiryTime);
      localStorage.setItem('plunk:email-verification-cooldown', expiryTime.toString());
    } finally {
      setIsResending(false);
    }
  }

  return (
    <>
      <NextSeo title="Verify email" />
      <div className="min-h-screen flex items-center justify-center py-12" style={dotGrid}>
        <div className="flex flex-col gap-6 max-w-md w-full px-4">
          <div className="flex items-center justify-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white shadow-sm border border-neutral-200 flex items-center justify-center p-1">
              <Image src="/assets/logo.svg" alt="" aria-hidden width={24} height={24} />
            </div>
            <span className="text-lg font-bold tracking-tight text-neutral-900">Plunk</span>
          </div>

          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col gap-6 text-center">
                <AnimatePresence mode="wait">
                  {status === 'pending' && (
                    <motion.div
                      key="pending"
                      initial={{opacity: 0, scale: 0.97}}
                      animate={{opacity: 1, scale: 1}}
                      exit={{opacity: 0}}
                      transition={{duration: 0.2}}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center">
                        <svg className="h-6 w-6 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <h1 className="text-xl font-bold tracking-tight">Check your email</h1>
                        <p className="text-sm text-neutral-500">
                          We sent a verification link to your inbox. Click it to verify your account.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 w-full mt-2">
                        <Button onClick={handleResend} disabled={isResending || cooldownExpiry !== null} className="w-full">
                          {isResending
                            ? 'Sending…'
                            : cooldownExpiry !== null
                              ? `Resend in ${remainingSeconds}s`
                              : 'Resend verification email'}
                        </Button>

                        {resendMessage && (
                          <p className={`text-sm ${resendMessage.includes('sent') ? 'text-neutral-600' : 'text-red-500'}`}>
                            {resendMessage}
                          </p>
                        )}

                        <Button asChild variant="outline" className="w-full">
                          <Link href="/auth/login">Back to login</Link>
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {status === 'verifying' && (
                    <motion.div
                      key="verifying"
                      initial={{opacity: 0}}
                      animate={{opacity: 1}}
                      exit={{opacity: 0}}
                      transition={{duration: 0.2}}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center">
                        <IconSpinner size="sm" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <h1 className="text-xl font-bold tracking-tight">Verifying…</h1>
                        <p className="text-sm text-neutral-500">Please wait a moment.</p>
                      </div>
                    </motion.div>
                  )}

                  {status === 'success' && (
                    <motion.div
                      key="success"
                      initial={{opacity: 0, scale: 0.97}}
                      animate={{opacity: 1, scale: 1}}
                      exit={{opacity: 0}}
                      transition={{duration: 0.2}}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center">
                        <svg className="h-6 w-6 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <h1 className="text-xl font-bold tracking-tight">Email verified</h1>
                        <p className="text-sm text-neutral-500">Redirecting to your dashboard...</p>
                      </div>
                    </motion.div>
                  )}

                  {status === 'error' && (
                    <motion.div
                      key="error"
                      initial={{opacity: 0, scale: 0.97}}
                      animate={{opacity: 1, scale: 1}}
                      exit={{opacity: 0}}
                      transition={{duration: 0.2}}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
                        <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <h1 className="text-xl font-bold tracking-tight">Verification failed</h1>
                        <p className="text-sm text-neutral-500">{errorMessage}</p>
                      </div>

                      <div className="flex flex-col gap-2 w-full mt-2">
                        <Button onClick={handleResend} disabled={isResending || cooldownExpiry !== null} className="w-full">
                          {isResending
                            ? 'Sending…'
                            : cooldownExpiry !== null
                              ? `Resend in ${remainingSeconds}s`
                              : 'Resend verification email'}
                        </Button>

                        {resendMessage && (
                          <p className={`text-sm ${resendMessage.includes('sent') ? 'text-neutral-600' : 'text-red-500'}`}>
                            {resendMessage}
                          </p>
                        )}

                        <Button asChild variant="outline" className="w-full">
                          <Link href="/auth/login">Back to login</Link>
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
