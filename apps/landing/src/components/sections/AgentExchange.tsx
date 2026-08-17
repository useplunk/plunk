import {motion, useReducedMotion} from 'framer-motion';
import React from 'react';

import {Surface} from '../home/Surface';

export interface ToolCall {
  /** Real tool name from @plunk/mcp. */
  tool: string;
  /** The interesting argument, if there is one. */
  args?: string;
  /** What came back, in as few words as the terminal would use. */
  result: string;
}

export interface Exchange {
  /** The ask, as typed. */
  prompt: string;
  calls: ToolCall[];
  confirm: {question: string; accept: string; reject: string};
}

/**
 * The MCP server, drawn as the session it actually is.
 *
 * Three earlier versions of this failed the same way from two directions. The
 * first was a chat transcript assembled out of card components, icon tiles and
 * a confirmation bar — a pile of unrelated UI widgets, which read as clutter.
 * The reaction to that was to strip elements out until only boxes and arrows
 * were left, which read as a generic flowchart: nothing about it was specific
 * to Plunk, and an abstract four-node diagram looks like it took no thought.
 *
 * The artifact on this page that works is the workflow canvas, and it works
 * because it is a faithful replica of a real product surface. So this is one
 * too. Developers who would use an MCP server know this exact interface: the
 * bullet-and-elbow tool log, the numbered permission prompt, the caret on the
 * selected option. Rendering it honestly is more persuasive than any diagram of
 * it, and a terminal is dense without being cluttered because everything in it
 * shares one type family, one grid and one alignment.
 *
 * The permission prompt is the climax, so it lands last and is the only thing
 * with a border. That prompt is the product claim: nothing reaches an inbox
 * until a person says so.
 */

const EASE = [0.23, 1, 0.32, 1] as const;

export function AgentExchange({exchange}: {exchange: Exchange}) {
  const still = useReducedMotion();

  /**
   * One shared timeline so the session plays back in the order it happened.
   * Each tool call occupies a slot; the prompt is slot 0 and the prompt box
   * comes after the last result.
   */
  const slot = (i: number) => (still ? 0 : 0.15 + i * 0.5);
  const line = {
    initial: still ? {opacity: 0} : {opacity: 0, y: 4},
    whileInView: still ? {opacity: 1} : {opacity: 1, y: 0},
    viewport: {once: true, margin: '-15%'} as const,
  };

  return (
    <Surface tone={'dark'} chrome label={'claude code'} meta={<span>plunk</span>}>
      <div className={'overflow-x-auto p-5 font-code text-[0.8125rem] leading-relaxed sm:p-6'}>
        {/* The ask */}
        <motion.p
          {...line}
          transition={{duration: 0.35, delay: slot(0), ease: EASE}}
          className={'flex gap-2.5 whitespace-pre text-neutral-100'}
        >
          <span className={'text-neutral-600'}>&rsaquo;</span>
          {exchange.prompt}
        </motion.p>

        {/* The tool log. Bullet, name, then an elbow with what came back —
            the shape the real client uses. */}
        <div className={'mt-5 flex flex-col gap-3.5'}>
          {exchange.calls.map((call, i) => (
            <motion.div
              key={call.tool}
              {...line}
              transition={{duration: 0.35, delay: slot(i + 1), ease: EASE}}
            >
              <p className={'flex gap-2.5 whitespace-pre'}>
                <span aria-hidden className={'text-neutral-500'}>
                  &#9679;
                </span>
                <span className={'text-neutral-100'}>
                  {call.tool}
                  {call.args && <span className={'text-neutral-500'}>({call.args})</span>}
                </span>
              </p>
              <p className={'flex gap-2.5 whitespace-pre pl-[1.35rem] text-neutral-500'}>
                <span aria-hidden>&#9495;</span>
                {call.result}
              </p>
            </motion.div>
          ))}
        </div>

        {/* The gate. The only bordered thing in the window, because it is the
            only thing that stops. */}
        <motion.div
          initial={still ? {opacity: 0} : {opacity: 0, y: 6, scale: 0.985}}
          whileInView={still ? {opacity: 1} : {opacity: 1, y: 0, scale: 1}}
          viewport={{once: true, margin: '-15%'}}
          transition={{duration: 0.4, delay: slot(exchange.calls.length + 1), ease: EASE}}
          className={'mt-6 rounded-lg border border-neutral-700 px-4 py-3.5'}
        >
          <p className={'text-neutral-100'}>{exchange.confirm.question}</p>
          <div className={'mt-3 flex flex-col gap-1'}>
            <p className={'flex gap-2 whitespace-pre text-white'}>
              <span aria-hidden>&#10095;</span>
              {exchange.confirm.accept}
            </p>
            <p className={'flex gap-2 whitespace-pre pl-[0.95rem] text-neutral-500'}>
              {exchange.confirm.reject}
            </p>
          </div>
        </motion.div>
      </div>
    </Surface>
  );
}
