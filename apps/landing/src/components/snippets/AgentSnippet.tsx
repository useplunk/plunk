import {motion, useReducedMotion} from 'framer-motion';
import {Sparkles} from 'lucide-react';
import React from 'react';

import {UICard} from './fragments';
import {SnippetTile} from './SnippetTile';

export interface AgentExchangeCopy {
  /** What the person asked, in their words. */
  prompt: string;
  /** What the agent did, in one sentence. */
  result: string;
  /** The approval it stops for. */
  question: string;
  accept: string;
  reject: string;
}

/**
 * An agent doing the work and stopping before it sends: the ask, what it did,
 * and the approval. This replaced a terminal full of tool names; the point a
 * scanner needs is only that the agent does the work and you decide.
 */
export function AgentSnippet({copy}: {copy: AgentExchangeCopy}) {
  const still = useReducedMotion();
  const step = (i: number) => ({
    initial: still ? undefined : {opacity: 0, y: 8},
    whileInView: still ? undefined : {opacity: 1, y: 0},
    viewport: {once: true, margin: '-10%'} as const,
    transition: {duration: 0.45, delay: still ? 0 : i * 0.35, ease: [0.23, 1, 0.32, 1] as const},
  });

  return (
    <SnippetTile className={'min-h-[26rem] sm:px-12'}>
      <div className={'mx-auto flex w-full max-w-md flex-col gap-4'}>
        <motion.p
          {...step(0)}
          className={'max-w-[85%] self-end rounded-2xl rounded-br-md bg-neutral-900 px-4 py-2.5 text-ui text-white'}
        >
          {copy.prompt}
        </motion.p>

        <motion.p {...step(1)} className={'flex items-center gap-2 text-ui text-neutral-600'}>
          <Sparkles className={'h-4 w-4 flex-shrink-0 text-neutral-500'} strokeWidth={1.75} aria-hidden />
          {copy.result}
        </motion.p>

        <motion.div {...step(2)}>
          <UICard className={'p-5'}>
            <p className={'text-ui font-semibold text-neutral-900'}>{copy.question}</p>
            <div className={'mt-4 flex flex-wrap gap-2'}>
              <span className={'rounded-full bg-neutral-900 px-4 py-2 text-ui font-semibold text-white'}>
                {copy.accept}
              </span>
              <span
                className={'rounded-full border border-neutral-300 px-4 py-2 text-ui font-semibold text-neutral-900'}
              >
                {copy.reject}
              </span>
            </div>
          </UICard>
        </motion.div>
      </div>
    </SnippetTile>
  );
}
