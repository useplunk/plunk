import {motion, useReducedMotion} from 'framer-motion';
import React from 'react';

import {Chip, Surface} from './Surface';

/**
 * Inbound email, drawn as the inbox it produces.
 *
 * Earlier attempts drew this abstractly — a message card wired to a JSON
 * payload, then two poles joined by arcs. Both were pictures *about* the
 * feature rather than pictures *of* it, and the arc version in particular was
 * a generic two-way-communication diagram that could have belonged to any
 * product on earth.
 *
 * What actually sells this is one specific detail: the addresses. You do not
 * create mailboxes, you add an MX record and every address at your domain
 * starts working. A list showing mail landing at support@, billing@ and hello@
 * demonstrates that in a way no arrow can, because the reader draws the
 * conclusion themselves from three rows they can scan in a second.
 *
 * The rows carry the rest of the claim without stating it: each sender shows a
 * contact id, because inbound saves the sender; the footer shows the webhook
 * firing, because that is the developer's half. The newest message arrives last
 * and slightly later than the rest, so the artifact ends on the word in the
 * heading — arrives.
 */

const EASE = [0.23, 1, 0.32, 1] as const;

interface Message {
  from: string;
  /** The local part the mail landed on. The point of the whole artifact. */
  to: string;
  subject: string;
  contact: string;
  age: string;
}

const messages: Message[] = [
  {from: 'Ana Ruiz', to: 'support@', subject: 'Can you resend my invoice?', contact: 'c_8f21', age: 'now'},
  {from: 'Tom Bakker', to: 'billing@', subject: 'Updated our VAT number', contact: 'c_7d04', age: '14m'},
  {from: 'Priya Nair', to: 'hello@', subject: 'Loved the changelog', contact: 'c_6b93', age: '1h'},
];

export function InboundMessage() {
  const still = useReducedMotion();

  return (
    <Surface
      label={'inbound'}
      meta={
        <>
          <span>yourdomain.com</span>
          <Chip>MX ok</Chip>
        </>
      }
    >
      <ul className={'divide-y divide-neutral-100'}>
        {messages.map((message, i) => {
          const newest = i === 0;
          return (
            <motion.li
              key={message.contact}
              /* The newest row drops in from above the list, the way a new
                 message actually appears, and it goes last so the sequence
                 ends on something arriving. The rest simply fade up. */
              initial={still ? {opacity: 0} : {opacity: 0, y: newest ? -10 : 6}}
              whileInView={still ? {opacity: 1} : {opacity: 1, y: 0}}
              viewport={{once: true, margin: '-15%'}}
              transition={{
                duration: newest ? 0.45 : 0.35,
                delay: still ? 0 : newest ? 0.55 : 0.1 + (3 - i) * 0.07,
                ease: EASE,
              }}
              className={`flex items-baseline gap-3 px-5 py-3.5 ${newest ? 'bg-neutral-50' : ''}`}
            >
              <span
                aria-hidden
                className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                  newest ? 'bg-neutral-900' : 'bg-transparent'
                }`}
              />

              <span className={'min-w-0 flex-1'}>
                <span className={'flex flex-wrap items-baseline gap-x-2.5 gap-y-1'}>
                  <span className={'font-display font-semibold tracking-[-0.01em] text-neutral-900'}>
                    {message.from}
                  </span>
                  {/* The address is the argument, so it is the one thing here
                      set in mono against a tint. */}
                  <Chip>{message.to}</Chip>
                  <span className={'font-code text-[0.6875rem] text-neutral-400'}>{message.contact}</span>
                </span>
                <span className={'mt-1 block truncate text-ui text-neutral-600'}>{message.subject}</span>
              </span>

              <span className={'flex-shrink-0 font-code text-[0.6875rem] text-neutral-400'}>{message.age}</span>
            </motion.li>
          );
        })}
      </ul>

      <motion.figcaption
        initial={still ? {opacity: 0} : {opacity: 0}}
        whileInView={{opacity: 1}}
        viewport={{once: true, margin: '-15%'}}
        transition={{duration: 0.35, delay: still ? 0 : 0.9, ease: EASE}}
        className={'flex items-center justify-between gap-4 border-t border-neutral-200 bg-neutral-50 px-5 py-3'}
      >
        <span className={'font-code text-label text-neutral-600'}>POST /hooks/plunk</span>
        <span className={'font-code text-label text-neutral-500'}>3 delivered</span>
      </motion.figcaption>
    </Surface>
  );
}
