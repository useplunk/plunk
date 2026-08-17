import {motion} from 'framer-motion';
import React from 'react';

export interface FAQ {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs: FAQ[];
  schemaId?: string;
}

export function FAQSection({faqs, schemaId = 'faq-schema'}: FAQSectionProps) {
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

          <div className={'divide-y divide-neutral-200 lg:col-span-8'}>
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{opacity: 0, y: 16}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1]}}
                className={'py-7 first:pt-0'}
              >
                <h3 className={'font-display text-lg font-bold tracking-[-0.02em] text-neutral-900'}>
                  {faq.question}
                </h3>
                <p className={'mt-3 max-w-[70ch] leading-relaxed text-neutral-600'}>{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
