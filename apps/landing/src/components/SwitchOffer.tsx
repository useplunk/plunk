import {AnimatePresence, motion} from 'framer-motion';
import React, {useEffect, useState} from 'react';
import {ArrowRight, Gift, X} from 'lucide-react';
import {DASHBOARD_URI} from '../lib/constants';

interface SwitchOfferProps {
  competitorName: string;
}

export function SwitchOffer({competitorName}: SwitchOfferProps) {
  const storageKey = `switch-offer-dismissed:${competitorName}`;
  const [visible, setVisible] = useState(false);

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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{opacity: 0, y: 24, scale: 0.96}}
          animate={{opacity: 1, y: 0, scale: 1}}
          exit={{opacity: 0, y: 16, scale: 0.97}}
          transition={{duration: 0.45, ease: [0.22, 1, 0.36, 1]}}
          className={
            'pointer-events-auto fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm sm:bottom-6 sm:right-6'
          }
          role="dialog"
          aria-label={`Switch from ${competitorName} to Plunk offer`}
        >
          <div
            className={
              'relative overflow-hidden rounded-2xl border border-neutral-900 bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]'
            }
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss offer"
              className={
                'absolute right-2.5 top-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900'
              }
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className={'p-5 pr-10 sm:p-6 sm:pr-12'}>
              <div
                className={
                  'inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1'
                }
              >
                <Gift className="h-3 w-3 text-neutral-700" />
                <span
                  style={{fontFamily: 'var(--font-mono)'}}
                  className={'text-label text-neutral-600'}
                >
                  Switching offer
                </span>
              </div>

              <h3
                style={{fontFamily: 'var(--font-display)'}}
                className={'mt-3 text-lg font-bold leading-[1.15] tracking-[-0.02em] text-neutral-900'}
              >
                Switching from {competitorName}?
                <br />
                <span className={'text-neutral-500'}>Get 2,000 free emails.</span>
              </h3>

              <p className={'mt-3 text-xs leading-relaxed text-neutral-600'}>
                Sign up and enter this code at checkout to redeem 2,000 email credits.
              </p>

              <div className={'mt-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-2.5'}>
                <div className={'mt-1 flex items-baseline justify-between gap-2'}>
                  <span
                    style={{fontFamily: 'var(--font-mono)'}}
                    className={'text-base font-bold tracking-[0.08em] text-neutral-900'}
                  >
                    SWITCH
                  </span>
                </div>
              </div>

              <motion.a
                whileHover={{scale: 1.015}}
                whileTap={{scale: 0.985}}
                href={`${DASHBOARD_URI}/auth/signup`}
                className={
                  'group mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-neutral-800'
                }
              >
                Claim your credits
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </motion.a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
