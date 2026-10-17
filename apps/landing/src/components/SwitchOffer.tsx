import {AnimatePresence, motion} from 'framer-motion';
import React, {useEffect, useState} from 'react';
import {ArrowRight, Check, Copy, X} from 'lucide-react';
import {DASHBOARD_URI} from '../lib/constants';

/** The code people enter at checkout to redeem the credits. */
const CODE = 'SWITCH';

interface SwitchOfferProps {
  competitorName: string;
}

export function SwitchOffer({competitorName}: SwitchOfferProps) {
  const storageKey = `switch-offer-dismissed:${competitorName}`;
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(storageKey) === '1') return;
    const t = window.setTimeout(() => setVisible(true), 800);
    return () => window.clearTimeout(t);
  }, [storageKey]);

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, '1');
    }
  };

  const copy = () => {
    void navigator.clipboard?.writeText(CODE).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{opacity: 0, y: 16}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: 12}}
          transition={{duration: 0.4, ease: [0.22, 1, 0.36, 1]}}
          className={
            'pointer-events-auto fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-[25rem] sm:bottom-8 sm:right-8'
          }
          role="dialog"
          aria-label={`Switch from ${competitorName} to Plunk offer`}
        >
          {/* Same material as the navbar menu: a hairline card with a soft
              shadow, a pale tile inside for the code, and the black button
              as the only dark element. It was a black-bordered card with a
              mono "Switching offer" chip and a dashed coupon box. */}
          <div
            className={
              'relative rounded-[1.25rem] border border-neutral-200 bg-white p-3 shadow-[0_12px_32px_-16px_rgba(23,23,23,0.28)]'
            }
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss offer"
              className={
                'absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900'
              }
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className={'px-4 pb-6 pr-12 pt-5'}>
              <p className={'font-display text-xl font-bold leading-snug tracking-[-0.01em] text-neutral-900'}>
                Switching from {competitorName}?
              </p>
              <p className={'mt-2 text-neutral-600'}>
                Get 2,000 free emails when you sign up with this code.
              </p>
            </div>

            <div className={'flex items-center justify-between gap-3 rounded-xl bg-tile py-2.5 pl-5 pr-2.5'}>
              <span className={'font-code text-ui font-semibold tracking-[0.06em] text-neutral-900'}>{CODE}</span>
              <button
                type="button"
                onClick={copy}
                className={
                  'inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-label font-semibold text-neutral-900 shadow-fragment transition hover:bg-neutral-50'
                }
              >
                {copied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <motion.a
              whileHover={{scale: 1.015}}
              whileTap={{scale: 0.985}}
              href={`${DASHBOARD_URI}/auth/signup`}
              className={
                'group mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-neutral-900 px-4 py-3.5 text-ui font-semibold text-white transition hover:bg-neutral-800'
              }
            >
              Claim your free emails
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </motion.a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
