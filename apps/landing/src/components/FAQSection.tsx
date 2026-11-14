import {motion, useReducedMotion} from 'framer-motion';
import {Plus} from 'lucide-react';
import React, {useState} from 'react';

export interface FAQ {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs: FAQ[];
  schemaId?: string;
}

export function FAQSection({faqs, schemaId = 'faq-schema'}: FAQSectionProps) {
  const still = useReducedMotion();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      {/* A plain `<script>` rather than `next/script`.
          `next/script` defaults to the `afterInteractive` strategy, which
          injects the tag from JavaScript once the page has hydrated — so the
          JSON-LD was absent from the server-rendered HTML entirely. Structured
          data that only exists after hydration is structured data a crawler may
          never see, which defeats the point of emitting it. Rendering the tag
          directly puts it in the document. */}
      <script
        id={schemaId}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            'mainEntity': faqs.map(faq => ({
              '@type': 'Question',
              'name': faq.question,
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': faq.answer,
              },
            })),
          }),
        }}
      />

      <section className={'border-t border-neutral-200'}>
        {/* Heading beside the questions, not above them.
            Stacked, the heading spanned the container while the answers sat in
            a `max-w-3xl` column beneath it, leaving roughly 560px of empty page
            down the right of every entry. Putting the heading in its own column
            uses that space and gives the list a shorter, more readable measure
            at the same time. */}
        <div className={'mx-auto grid max-w-[88rem] gap-10 px-6 py-16 sm:px-10 sm:py-20 lg:grid-cols-12 lg:gap-16'}>
          <motion.div
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
            className={'lg:col-span-4'}
          >
            <h2
              className={
                'max-w-[12ch] font-display text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'
              }
            >
              Frequently asked questions
            </h2>
          </motion.div>

          {/* Questions only, answers on demand, one open at a time.

              This was `<details>`, which cannot animate its own height, so
              opening an answer snapped the rest of the page down in one
              frame. The answers are now always in the document (crawlers and
              screen readers still get them) and their height eases open and
              shut instead. */}
          <div className={'border-y border-neutral-200 lg:col-span-8'}>
            {faqs.map((faq, index) => {
              const open = openIndex === index;
              const id = `${schemaId}-answer-${index}`;
              return (
                <motion.div
                  key={faq.question}
                  initial={still ? undefined : {opacity: 0, y: 12}}
                  whileInView={still ? undefined : {opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.45, delay: still ? 0 : index * 0.04, ease: [0.22, 1, 0.36, 1]}}
                  className={'border-b border-neutral-200 last:border-b-0'}
                >
                  <h3>
                    <button
                      type={'button'}
                      aria-expanded={open}
                      aria-controls={id}
                      onClick={() => setOpenIndex(open ? null : index)}
                      className={
                        'flex w-full items-center justify-between gap-6 py-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900'
                      }
                    >
                      <span className={'font-display text-lg font-semibold tracking-[-0.01em] text-neutral-900'}>
                        {faq.question}
                      </span>
                      <Plus
                        aria-hidden
                        strokeWidth={1.75}
                        className={`h-5 w-5 flex-shrink-0 text-neutral-500 transition-transform duration-300 ${open ? 'rotate-45' : ''}`}
                      />
                    </button>
                  </h3>
                  <motion.div
                    id={id}
                    role={'region'}
                    aria-hidden={!open}
                    initial={false}
                    animate={open ? {height: 'auto', opacity: 1} : {height: 0, opacity: 0}}
                    transition={
                      still
                        ? {duration: 0}
                        : {
                            height: {duration: 0.35, ease: [0.22, 1, 0.36, 1]},
                            opacity: {duration: 0.25, delay: open ? 0.08 : 0},
                          }
                    }
                    className={'overflow-hidden'}
                  >
                    <p className={'max-w-[70ch] pb-6 pr-11 leading-relaxed text-neutral-600'}>{faq.answer}</p>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
