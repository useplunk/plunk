import {Footer, Navbar, SectionHeader} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI} from '../../lib/constants';
import React, {useMemo, useState} from 'react';
import {NextSeo} from 'next-seo';
import {ArrowRight, Check, Code2, Copy} from 'lucide-react';
import {MarkdownEmailEditor} from '../../components/tools/MarkdownEmailEditor';
import {convertToCompleteEmailHtml} from '../../lib/emailHtmlConverter';
import {Button} from '@plunk/ui';
import {Funnel_Display, Funnel_Sans, JetBrains_Mono} from 'next/font/google';
import Link from 'next/link';

const display = Funnel_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const body = Funnel_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500'],
});

export default function MarkdownToEmail() {
  const [editorContent, setEditorContent] = useState('<p>Hello!</p><p>Try editing this text...</p>');
  const [copied, setCopied] = useState(false);

  const emailSafeHtml = useMemo(() => convertToCompleteEmailHtml(editorContent), [editorContent]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(emailSafeHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <NextSeo
        title="Markdown to Email-Safe HTML Converter | Free Online Tool | Plunk"
        description="Convert Markdown to email-safe HTML instantly — handles inline styles, table layouts, and compatibility across email clients. Free, no sign-up required."
        canonical="https://www.useplunk.com/tools/markdown-to-email"
        openGraph={{
          title: 'Markdown to Email-Safe HTML Converter | Free Online Tool | Plunk',
          description:
            'Convert Markdown to email-safe HTML instantly — handles inline styles, table layouts, and compatibility across email clients. Free, no sign-up.',
          url: 'https://www.useplunk.com/tools/markdown-to-email',
          images: [{url: 'https://www.useplunk.com/api/og?title=Markdown+to+Email+HTML+Converter&tag=Tool', alt: 'Plunk Markdown to Email', width: 1200, height: 630}],
        }}
      />

      <Navbar />

      <div className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <main className={'text-neutral-800'}>
          {/* ========== HERO ========== */}
          <section className={'relative overflow-hidden'}>
            <div
              aria-hidden
              className={
                'absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#eeeeee_1px,transparent_1px),linear-gradient(to_bottom,#eeeeee_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_40%,transparent_95%)]'
              }
            />

            <div className={'mx-auto max-w-[88rem] px-6 pb-24 pt-20 sm:px-10 sm:pt-28 lg:pb-36'}>
              <motion.div
                initial={{opacity: 0, y: 8}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.5, ease: [0.22, 1, 0.36, 1]}}
                style={{fontFamily: 'var(--font-mono)'}}
                className={
                  'mb-16 flex items-center justify-between border-t border-neutral-900/90 pt-4 text-label text-neutral-700 sm:mb-24'
                }
              >
                <span className={'font-medium text-neutral-900'}>§ T-01 &nbsp;— &nbsp;Tool</span>
                <Link
                  href="/tools"
                  className={'text-neutral-500 transition hover:text-neutral-900'}
                >
                  ← All tools
                </Link>
              </motion.div>

              <motion.div
                initial={{opacity: 0, y: 16}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
                className={'mx-auto max-w-5xl text-center'}
              >
                <h1
                  style={{fontFamily: 'var(--font-display)'}}
                  className={
                    'text-display font-extrabold leading-[0.92] tracking-[-0.04em] text-neutral-900'
                  }
                >
                  Markdown to
                  <br />
                  Email HTML
                </h1>
                <p className={'mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl'}>
                  Format your content with the visual editor and get production-ready HTML with inlined styles that works across all email clients.
                </p>
              </motion.div>
            </div>
          </section>

          {/* ========== EDITOR ========== */}
          <section className={'mx-auto max-w-[88rem] px-6 py-16 sm:px-10 sm:py-20'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'grid gap-6 lg:grid-cols-2'}
            >
              {/* Left: Editor */}
              <div>
                <div className={'mb-4 flex items-center justify-between'}>
                  <div className={'flex items-center gap-3'}>
                    <Code2 className={'h-4 w-4 text-neutral-500'} strokeWidth={1.5} />
                    <span
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'text-label text-neutral-500'}
                    >
                      Visual Editor
                    </span>
                  </div>
                </div>
                <MarkdownEmailEditor value={editorContent} onChange={setEditorContent} />
              </div>

              {/* Right: Email-Safe HTML Output */}
              <div>
                <div className={'mb-4 flex items-center justify-between'}>
                  <span
                    style={{fontFamily: 'var(--font-mono)'}}
                    className={'text-label text-neutral-500'}
                  >
                    Email-Safe HTML
                  </span>
                  <Button onClick={handleCopy} size="sm" variant="outline" className={'gap-2'}>
                    {copied ? (
                      <>
                        <Check className={'h-4 w-4'} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className={'h-4 w-4'} />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className={'overflow-hidden rounded-[16px] border border-neutral-200 bg-white'}>
                  <pre className={'max-h-[500px] min-h-[500px] overflow-x-auto overflow-y-auto p-4 text-xs'}>
                    <code style={{fontFamily: 'var(--font-mono)'}} className={'text-neutral-700'}>
                      {emailSafeHtml}
                    </code>
                  </pre>
                </div>
              </div>
            </motion.div>
          </section>

          {/* ========== ABOUT ========== */}
          <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
            <div className={'mx-auto max-w-[88rem] px-6 py-28 sm:px-10 sm:py-36'}>
              <SectionHeader
                title={'Write once,'}
                titleAccent={'send everywhere.'}
                subtitle={
                  'Email clients ignore most CSS. This tool inlines every style rule so your formatting survives any inbox.'
                }
              />

              <div className={'mt-20 grid gap-10 sm:grid-cols-3 sm:gap-16'}>
                {[
                  {
                    tag: 'Step 1',
                    big: 'Write',
                    title: 'Format your content',
                    body: 'Use the visual editor to format text, add headings, lists, and links — just like a word processor.',
                  },
                  {
                    tag: 'Step 2',
                    big: 'Convert',
                    title: 'Styles get inlined',
                    body: 'Every CSS rule is moved inline so email clients like Outlook, Gmail, and Apple Mail render it correctly.',
                  },
                  {
                    tag: 'Step 3',
                    big: 'Copy',
                    title: 'Drop it in your send',
                    body: 'Copy the output HTML and paste it into any email service, SMTP template, or API payload.',
                  },
                ].map((item, i) => (
                  <motion.div
                    key={item.tag}
                    initial={{opacity: 0, y: 16}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1]}}
                    className={'flex flex-col gap-6'}
                  >
                    <span
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'text-label text-neutral-500'}
                    >
                      / {item.tag}
                    </span>
                    <div
                      style={{fontFamily: 'var(--font-display)'}}
                      className={'text-5xl font-extrabold tracking-[-0.035em] text-neutral-900 sm:text-6xl'}
                    >
                      {item.big}
                    </div>
                    <div className={'h-px w-full bg-neutral-300'} />
                    <h3
                      style={{fontFamily: 'var(--font-display)'}}
                      className={'text-xl font-semibold text-neutral-900'}
                    >
                      {item.title}
                    </h3>
                    <p className={'text-base leading-relaxed text-neutral-600'}>{item.body}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ========== CTA ========== */}
          <section className={'relative overflow-hidden border-t border-neutral-900 bg-neutral-900 text-white'}>
            <div className={'mx-auto max-w-[88rem] px-6 py-32 sm:px-10 sm:py-40'}>
              <div className={'flex flex-col items-start gap-12 lg:flex-row lg:items-end lg:justify-between'}>
                <motion.h2
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
                  style={{fontFamily: 'var(--font-display)'}}
                  className={'text-display font-extrabold leading-[0.95] tracking-[-0.035em]'}
                >
                  Ready to send great emails?
                </motion.h2>

                <motion.div
                  initial={{opacity: 0, y: 16}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}}
                  className={'flex max-w-md flex-col gap-6'}
                >
                  <p className={'text-lead text-neutral-300'}>
                    Plunk handles everything: templates, sending, tracking, and deliverability. Start free, no credit card required.
                  </p>
                  <div className={'flex flex-wrap gap-3'}>
                    <motion.a
                      whileHover={{scale: 1.015}}
                      whileTap={{scale: 0.985}}
                      href={`${DASHBOARD_URI}/auth/signup`}
                      className={
                        'inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-ui font-semibold text-neutral-900 transition hover:bg-neutral-100'
                      }
                    >
                      Start with Plunk
                      <ArrowRight className={'h-4 w-4'} />
                    </motion.a>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <Footer />
    </>
  );
}
