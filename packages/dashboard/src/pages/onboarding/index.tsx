import React from 'react';
import {motion} from 'framer-motion';
import {useRouter} from 'next/router';
import {TerminalSquare, Workflow} from 'lucide-react';

/**
 *
 */
export default function Index() {
  const router = useRouter();

  return (
    <>
      <div className={'flex min-h-screen w-screen flex-col items-center justify-center gap-6'}>
        <div className={'text-center'}>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-800 sm:text-4xl">Pick your fighter</h1>

          <p className="mx-auto mt-2 text-lg text-neutral-500">
            Don't worry! You can use both, but we recommend starting with one.
          </p>
        </div>
        <div className={'grid gap-6 p-3 sm:grid-cols-2'}>
          <div
            className={
              'flex flex-col items-center gap-6 rounded-md border border-neutral-200 bg-white px-12 py-6 text-center'
            }
          >
            <div className={'rounded-md bg-neutral-100 p-3 text-neutral-800'}>
              <Workflow />
            </div>

            <div>
              <p className={'text-xl font-medium text-neutral-800'}>Actions</p>
              <p className={'text-neutral-600'}>Repeatable workflows that are triggered by your app</p>
            </div>

            <motion.button
              onClick={() => router.push('/onboarding/actions')}
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.9}}
              className={
                'flex items-center gap-x-0.5 rounded-md bg-neutral-800 px-10 py-2.5 text-center text-sm font-medium text-white sm:col-span-2'
              }
            >
              <span>Start with actions</span>
            </motion.button>
          </div>
          <div
            className={
              'flex flex-col items-center gap-6 rounded-md border border-neutral-200 bg-white px-12 py-6 text-center'
            }
          >
            <div className={'rounded-md bg-neutral-100 p-3 text-neutral-800'}>
              <TerminalSquare />
            </div>

            <div>
              <p className={'text-xl font-medium text-neutral-800'}>Transactional</p>
              <p className={'text-neutral-600'}>Emails sent with a single API call</p>
            </div>
            <motion.button
              onClick={() => router.push('/onboarding/transactional')}
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.9}}
              className={
                'mx-auto flex items-center gap-x-0.5 rounded-md bg-neutral-800 px-10 py-2.5 text-center text-sm font-medium text-white sm:col-span-2'
              }
            >
              <span>Start with transactional</span>
            </motion.button>
          </div>
        </div>
      </div>
    </>
  );
}
