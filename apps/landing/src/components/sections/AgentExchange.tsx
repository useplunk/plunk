import {motion} from 'framer-motion';
import React from 'react';
import {Megaphone, Sparkles} from 'lucide-react';

import {Connector, Node} from './Diagram';

export interface Exchange {
  /** The ask, in one short line. */
  prompt: string;
  /** Tools the agent reached for. Real names from @plunk/mcp. */
  tools: string[];
  /** What came back: the object that was made. */
  result: {title: string; recipients: number};
}

/**
 * What happens when an agent has Plunk connected, drawn.
 *
 * This started as a chat transcript, which was a lot of reading for a section
 * whose whole job is to make one point: you ask, tools run, and nothing reaches
 * an inbox until you say so. So it is a diagram now — the ask, the tools it
 * touched, the draft it produced, and the confirmation gate — with the tool
 * names doing the technical talking and everything else reduced to a number and
 * a state.
 */
export function AgentExchange({exchange}: {exchange: Exchange}) {
  return (
    <div className={'flex flex-col'}>
      {/* The ask */}
      <motion.div
        initial={{opacity: 0, y: 8}}
        whileInView={{opacity: 1, y: 0}}
        viewport={{once: true}}
        transition={{duration: 0.4, ease: [0.22, 1, 0.36, 1]}}
        className={'flex items-center gap-4'}
      >
        <Node icon={<Sparkles className="h-5 w-5" strokeWidth={1.5} />} tone={'solid'} />
        <p className={'min-w-0 flex-1 text-neutral-900'}>{exchange.prompt}</p>
      </motion.div>

      <Connector height={44} delay={0.25} />

      {/* The tools it reached for */}
      <motion.ul
        initial={{opacity: 0}}
        whileInView={{opacity: 1}}
        viewport={{once: true}}
        transition={{duration: 0.4, delay: 0.45, ease: [0.22, 1, 0.36, 1]}}
        className={'flex flex-wrap justify-center gap-2'}
      >
        {exchange.tools.map((tool, i) => (
          <motion.li
            key={tool}
            initial={{opacity: 0, scale: 0.96}}
            whileInView={{opacity: 1, scale: 1}}
            viewport={{once: true}}
            transition={{duration: 0.3, delay: 0.5 + i * 0.1, ease: [0.22, 1, 0.36, 1]}}
            style={{fontFamily: 'var(--font-mono)'}}
            className={'rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-label text-neutral-700'}
          >
            {tool}
          </motion.li>
        ))}
      </motion.ul>

      <Connector height={44} delay={0.8} />

      {/* What it made, and the gate in front of it */}
      <motion.div
        initial={{opacity: 0, y: 8}}
        whileInView={{opacity: 1, y: 0}}
        viewport={{once: true}}
        transition={{duration: 0.5, delay: 1, ease: [0.22, 1, 0.36, 1]}}
        className={'overflow-hidden rounded-2xl border border-neutral-200'}
      >
        <div className={'flex items-center gap-4 p-5'}>
          <Node icon={<Megaphone className="h-5 w-5" strokeWidth={1.5} />} />
          <div className={'min-w-0 flex-1'}>
            <div
              style={{fontFamily: 'var(--font-display)'}}
              className={'font-semibold tracking-[-0.01em] text-neutral-900'}
            >
              {exchange.result.title}
            </div>
            <div style={{fontFamily: 'var(--font-mono)'}} className={'mt-0.5 text-label text-neutral-500'}>
              Draft
            </div>
          </div>
          <div className={'text-right'}>
            <div
              style={{fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums'}}
              className={'text-h3 font-bold tracking-[-0.02em] text-neutral-900'}
            >
              {exchange.result.recipients.toLocaleString('en-US')}
            </div>
            <div style={{fontFamily: 'var(--font-mono)'}} className={'text-label text-neutral-500'}>
              recipients
            </div>
          </div>
        </div>

        <div className={'flex items-center justify-between gap-4 bg-neutral-900 px-5 py-4'}>
          <span className={'text-neutral-300'}>Send it?</span>
          <div className={'flex flex-shrink-0 gap-2'}>
            <span className={'rounded-full bg-white px-4 py-1.5 text-ui font-semibold text-neutral-900'}>Send</span>
            <span className={'rounded-full border border-neutral-700 px-4 py-1.5 text-ui font-semibold text-neutral-300'}>
              Not yet
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
