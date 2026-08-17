import {motion} from 'framer-motion';
import Script from 'next/script';
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
      <Script
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
        <div className={'mx-auto max-w-[88rem] px-6 py-16 sm:px-10 sm:py-20'}>
          <motion.div
            initial={{opacity: 0, y: 20}}
            whileInView={{opacity: 1, y: 0}}
            viewport={{once: true}}
            transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
            className={'mb-12'}
          >
            <h2
              style={{fontFamily: 'var(--font-display)'}}
              className={'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'}
            >
              Frequently asked questions
            </h2>
          </motion.div>

          <div className={'mx-auto max-w-3xl divide-y divide-neutral-200'}>
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{opacity: 0, y: 16}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1]}}
                className={'py-8'}
              >
                <h3
                  style={{fontFamily: 'var(--font-display)'}}
                  className={'text-lg font-bold tracking-[-0.02em] text-neutral-900'}
                >
                  {faq.question}
                </h3>
                <p className={'mt-3 leading-relaxed text-neutral-600'}>{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
