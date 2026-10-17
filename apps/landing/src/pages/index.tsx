import {
  AgentSnippet,
  CampaignsFragment,
  ClaimTiles,
  ContactSnippet,
  DifferenceSnippets,
  FAQSection,
  FeatureCTA,
  FeatureRow,
  Footer,
  HeroSnippets,
  EditorVariablesFragment,
  InboundFragment,
  ReputationFragment,
  SmtpClientsFragment,
  ValidationFragment,
  MailchimpMark,
  MailgunMark,
  Navbar,
  PriceComparison,
  QuoteWall,
  SectionHeader,
  SegmentSnippets,
  SendGridMark,
  WorkflowSnippets,
} from '../components';
import type {AgentExchangeCopy, Claim, FAQ, PriceRow, Quote} from '../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../lib/constants';
import React from 'react';
import {NextSeo} from 'next-seo';
import Artur from '../../public/assets/artur.png';
import Joe from '../../public/assets/joe.png';
import Noah from '../../public/assets/noah.png';
import Pierre from '../../public/assets/pierre.png';
import Jonni from '../../public/assets/jonni.png';
import Alisson from '../../public/assets/alisson.png';
import Link from 'next/link';
import Image from 'next/image';
import plunkLogo from '../../public/assets/logo.svg';
import {ArrowRight, ArrowUpRight} from 'lucide-react';

/** Plunk's own mark, to sit beside the competitor glyphs in the price chart. */
const PlunkMark = () => (
  <Image src={plunkLogo} alt="" aria-hidden width={20} height={20} className={'h-5 w-5 flex-shrink-0'} />
);

/**
 * The one label for the one action.
 *
 * This CTA was previously called four things — "Get started" in the nav,
 * "Get started free" in the hero, "Start for free" at pricing, "Create free
 * account" in the closing band — all pointing at the same signup URL. PRODUCT.md
 * asks for one way to do a thing; four names for one door is the opposite.
 */
const SIGNUP_LABEL = 'Start for free';
const SIGNUP_HREF = `${DASHBOARD_URI}/auth/signup`;

const lead: Quote = {
  testimonial: 'Transparent and intuitive UI, extremely easy setup & automation and great support.',
  author: 'Artur Czemiel',
  image: Artur,
  role: 'Founder at GraphQL Editor',
};

const quotes: Quote[] = [
  {
    testimonial: 'Lots of care put into Plunk',
    author: 'Jonni Lundy',
    image: Jonni,
    role: 'Founding Operations Manager at Resend',
  },
  {
    testimonial: "I've been using Plunk for building & sending out marketing emails and genuinely love it!",
    author: 'Joe Ashwell',
    image: Joe,
    role: 'Founder at UnwindHR',
  },
  {
    testimonial: 'I loved the ease of use, beautiful UI and great UX. Everything simply works.',
    author: 'Alisson Leal',
    image: Alisson,
    role: 'Founder at Brapi',
  },
  {
    testimonial: 'Simple to use, efficient and no regrets!',
    author: 'Noah Di Gesu',
    image: Noah,
    role: 'Founder at Smoothey',
  },
  {
    testimonial: 'Clean design, easy to understand, fair pricing.',
    author: 'Pierre Jacquel',
    image: Pierre,
    role: 'Founder at Landingly',
  },
];

/**
 * Everything without a feature row of its own, as tiles in one grid: each
 * gets a picture and a line, but not a full-width section. The rows above
 * argue; this shows the rest is there. It replaced a text-only linked index
 * that nobody slowed down for.
 */
const moreFeatures: Claim[] = [
  {
    title: 'Inbound email',
    copy: 'Every address at your domain receives. Replies become contacts and can start workflows.',
    fragment: <InboundFragment />,
    href: '/features/inbound-email',
  },
  {
    title: 'Campaigns and analytics',
    copy: 'Broadcast to any segment, then see delivery, opens and clicks per send.',
    fragment: <CampaignsFragment />,
    href: '/features/campaigns',
  },
  {
    title: 'Email editor',
    copy: 'Visual or HTML, with contact fields and fallbacks built in.',
    fragment: <EditorVariablesFragment />,
    href: '/features/email-editor',
  },
  {
    title: 'SMTP',
    copy: 'Point any existing client or framework at Plunk without changing code.',
    fragment: <SmtpClientsFragment />,
    href: '/features/smtp',
  },
  {
    title: 'Email validation',
    copy: 'Catch typos, disposable domains and missing MX records before you send.',
    fragment: <ValidationFragment />,
    href: '/tools/verify-email',
  },
  {
    title: 'Reputation monitoring',
    copy: 'Bounce and complaint rates tracked for you, with a warning before they become a problem.',
    fragment: <ReputationFragment />,
  },
];

const competitors = [
  {name: 'Resend', slug: 'resend'},
  {name: 'SendGrid', slug: 'sendgrid'},
  {name: 'Mailchimp', slug: 'mailchimp'},
  {name: 'Customer.io', slug: 'customerio'},
  {name: 'Mailgun', slug: 'mailgun'},
];

const customers: {name: string; url: string; logo: string; imgClassName?: string}[] = [
  {name: 'Krumzi', url: 'https://krumzi.com', logo: '/assets/krumzi.svg'},
  {name: 'Waidwissen', url: 'https://waidwissen.com', logo: '/assets/waidwissen.svg'},
  {name: 'Dodo Payments', url: 'https://dodopayments.com', logo: '/assets/dodo.svg'},
  {name: 'SnowSEO', url: 'https://snowseo.com', logo: '/assets/snowseo.svg', imgClassName: 'h-8'},
  {name: 'Viral', url: 'https://viral.app', logo: '/assets/viral.svg', imgClassName: 'h-8'},
];

/** The homepage agent: a campaign drafted, then held for approval. */
const agentExchange: AgentExchangeCopy = {
  prompt: 'Win back the Pro customers who have gone quiet.',
  result: 'Drafted “We miss you” for 2,431 contacts.',
  question: 'Send this campaign to 2,431 people?',
  accept: 'Send',
  reject: 'Keep as draft',
};

const prices: PriceRow[] = [
  {name: 'Plunk', price: 0.001, logo: <PlunkMark />},
  {name: 'SendGrid', price: 0.002, logo: <SendGridMark />},
  {name: 'Mailgun', price: 0.003, logo: <MailgunMark />},
  {name: 'Mailchimp', price: 0.004, logo: <MailchimpMark />},
];

/**
 * These were previously emitted as `FAQPage` structured data with no visible
 * counterpart anywhere on the page. Google's structured-data policy requires
 * the content to be present for the reader, and these five questions are the
 * ones a first-time visitor actually arrives with, so they are now rendered.
 * `FAQSection` emits the schema itself, so the hand-rolled blob is gone.
 */
const faqs: FAQ[] = [
  {
    question: 'How is Plunk different from other email tools?',
    answer:
      'Most platforms do one of transactional sending, marketing campaigns, or automation, so teams end up running two side by side. Plunk does all three against one contact list, triggered from a single API call.',
  },
  {
    question: 'Can I use Plunk for transactional email?',
    answer:
      'Yes. Signup confirmations, password resets, receipts and any other one-off message go out through the same API and the same verified domains as your campaigns.',
  },
  {
    question: 'Can I send newsletters and broadcasts?',
    answer:
      'Yes. Build a campaign against your whole list or any segment, schedule it, and track opens, clicks and bounces per send.',
  },
  {
    question: 'Which languages and frameworks does Plunk support?',
    answer:
      'Anything that can make an HTTP request. There is a REST API that works with any HTTP client, and SMTP for clients and frameworks that already speak it, so no runtime is excluded.',
  },
  {
    question: 'What does Plunk cost?',
    answer:
      'There are two plans. The free one covers 1,000 emails a month and carries Plunk branding. The paid one is $0.001 per email with no branding and no feature tiers. Contacts are unlimited on both, so storing a million you never mail costs nothing.',
  },
];

export default function Index() {
  return (
    <>
      <NextSeo
        canonical="https://www.useplunk.com"
        title="Plunk — Open-Source Transactional Email Platform"
        description="Send transactional emails, run marketing campaigns, and automate workflows. Open-source and self-hostable, $0.001 per email, no contact limits."
        openGraph={{
          url: 'https://www.useplunk.com',
          title: 'Plunk — Open-Source Transactional Email Platform',
          description:
            'Send transactional emails, run marketing campaigns, and automate workflows. Open-source and self-hostable, $0.001 per email, no contact limits.',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=The+Open-Source+Email+Platform',
              width: 1200,
              height: 630,
              alt: 'Plunk — The Open-Source Email Platform',
            },
          ],
        }}
      />
      {/* Plain `<script>` tags, not `next/script`. See the note in
          `FAQSection`: the default `afterInteractive` strategy injects these
          after hydration, so none of this page's structured data was present in
          the server-rendered HTML. */}
      <script
        id={`corp-schema-index`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            'name': 'Plunk',
            'alternateName': 'UsePlunk',
            'url': 'https://www.useplunk.com',
            'logo': 'https://www.useplunk.com/assets/logo.png',
            'sameAs': ['https://x.com/useplunk', 'https://github.com/useplunk/plunk'],
          }),
        }}
      />
      <script
        id={`website-schema-index`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            'name': 'Plunk',
            'url': 'https://www.useplunk.com',
          }),
        }}
      />
      <script
        id={`software-schema-index`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            'name': 'Plunk',
            'url': 'https://www.useplunk.com',
            'description':
              'Open-source email platform for transactional email, marketing campaigns, and workflow automation, on one contact list.',
            'image': 'https://www.useplunk.com/api/og?title=The+Open-Source+Email+Platform',
            'applicationCategory': 'BusinessApplication',
            'applicationSubCategory': 'Email Marketing Software',
            'operatingSystem': 'Web, Docker',
            'offers': {
              '@type': 'Offer',
              'price': '0',
              'priceCurrency': 'USD',
              'priceSpecification': {
                '@type': 'UnitPriceSpecification',
                'price': '0.001',
                'priceCurrency': 'USD',
                'unitText': 'email',
              },
            },
            'featureList':
              'Workflow Automation, Dynamic Segmentation, Campaign Management, Analytics, Developer API, Custom Domains, Self-Hosting, Open Source',
          }),
        }}
      />

      <Navbar />

      <div>
        <main className={'text-neutral-800'}>
          {/* ========== HERO ========== */}
          <section className={'relative overflow-hidden'}>
            <div className={'mx-auto max-w-[88rem] px-6 pb-20 pt-20 sm:px-10 sm:pt-28 lg:pb-28'}>
              <div className={'hero-enter mx-auto max-w-5xl text-center'}>
                <h1
                  className={
                    'font-display text-display font-extrabold leading-none tracking-[-0.04em] text-neutral-900'
                  }
                >
                  The open-source
                  <br />
                  email platform
                </h1>
                {/* The stat strip directly below already says $0.001 and
                    "no contact limits", and the h1 already says "platform".
                    The one thing neither says is that all three kinds of email
                    run against a single contact list, so that is all this says
                    now. */}
                <p className={'mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl'}>
                  Transactional email, marketing campaigns, and automated workflows, all against one contact list.
                </p>

                <div className={'mt-10 flex flex-wrap justify-center gap-3'}>
                  <motion.a
                    whileHover={{scale: 1.015}}
                    whileTap={{scale: 0.985}}
                    href={SIGNUP_HREF}
                    className={
                      'group inline-flex items-center gap-2 rounded-full bg-neutral-900 px-8 py-4 text-base font-semibold text-white transition hover:bg-neutral-800'
                    }
                  >
                    {SIGNUP_LABEL}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </motion.a>
                  <Link
                    href={WIKI_URI}
                    target={'_blank'}
                    rel={'noopener noreferrer'}
                    className={
                      'inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-8 py-4 text-base font-semibold text-neutral-900 transition hover:border-neutral-900'
                    }
                  >
                    Read the docs
                  </Link>
                </div>
              </div>

              <div className={'mt-16 sm:mt-20'} data-nosnippet>
                <HeroSnippets />
              </div>
            </div>
          </section>

          {/* ========== CUSTOMER LOGO STRIP ==========
              Resting opacity was 40%, which read as a placeholder row rather
              than as customers. The logos are also normalised on cap-height
              now: `h-7` on a wordmark and `h-9` on a lockup made the same
              brand look twice the size of its neighbour. */}
          <section aria-label="Customers">
            <div className={'mx-auto max-w-[88rem] px-6 pb-16 pt-4 sm:px-10 sm:pb-20'}>
              <motion.div
                initial={{opacity: 0, y: 8}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.6, ease: [0.22, 1, 0.36, 1]}}
                className={'flex flex-col items-center gap-6'}
              >
                <p className={'text-ui text-neutral-500'}>Built into products at</p>
                <div className={'flex flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-16'}>
                  {customers.map(c => (
                    <a
                      key={c.name}
                      href={c.url}
                      target={'_blank'}
                      rel={'noopener noreferrer'}
                      className={'group'}
                      aria-label={c.name}
                    >
                      <img
                        src={c.logo}
                        alt={c.name}
                        className={`${c.imgClassName ?? 'h-7'} w-auto max-w-none opacity-60 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0`}
                      />
                    </a>
                  ))}
                </div>
              </motion.div>
            </div>
          </section>

          {/* ========== HOW PLUNK IS DIFFERENT ==========
              Straight after the logos, so it frames everything below it. Each
              claim is a tile that shows it, with the claim written underneath.
              The old version was three columns of big numbers that repeated
              the hero's stat strip; both are gone, and the open-source section
              that repeated the third column is folded into it. */}
          <section className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <SectionHeader title={'Simple to start.'} titleAccent={'Serious at scale.'} />
            <div className={'mt-14'}>
              <DifferenceSnippets />
            </div>
            <a
              href={'https://github.com/useplunk/plunk'}
              target={'_blank'}
              rel={'noopener noreferrer'}
              className={
                'group mt-10 inline-flex items-center gap-2 text-ui font-semibold text-neutral-900 underline-offset-4 hover:underline'
              }
            >
              Read the source on GitHub
              <ArrowUpRight
                className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                strokeWidth={2}
              />
            </a>
          </section>

          {/* ========== CAPABILITIES ==========
              Three rows that show the product working, then a linked index for
              the rest. This replaces a six-card bento in which five cards held
              an icon, two lines, and roughly 120px of nothing, and none of the
              six linked to the feature page it described. */}
          <section className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <SectionHeader
              title={'Everything you need.'}
              titleAccent={'Nothing you don’t.'}
              /* Was "ships with the full platform — no upsell pages, no locked
                 modules", which restated the heading and added two more
                 negations to a page that already had thirteen. */
              subtitle={'Every plan includes all of it.'}
            />

            <div className={'mt-16 flex flex-col gap-20 sm:gap-28'}>
              <FeatureRow
                eyebrow={'Workflows'}
                title={'Automation you can see end to end'}
                body={'Start a sequence from anything a contact does in your product. The emails, the waiting and the branching run from there.'}
                href={'/features/workflows'}
                linkLabel={'How workflows work'}
                artifact={<WorkflowSnippets />}
              />

              <FeatureRow
                eyebrow={'Segments'}
                title={'Audiences that stay current'}
                body={'A segment is a query, re-run every time you use it. The same campaign sent tomorrow reaches tomorrow’s audience.'}
                href={'/features/segments'}
                linkLabel={'How segments work'}
                reversed
                artifact={<SegmentSnippets />}
              />
            </div>

            <div className={'mt-24 sm:mt-32'}>
              <h3 className={'mb-10 font-display text-h3 font-bold tracking-[-0.025em] text-neutral-900'}>
                Also in every plan
              </h3>
              <ClaimTiles items={moreFeatures} />
            </div>
          </section>

          {/* ========== UNIFIED CONTACTS ==========
              Header and diagram now share one axis. The header sat at the
              container's left edge while the diagram was centred inside a
              narrower column, which put two competing alignments in one
              section. */}
          <section>
            <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
              {/* No subtitle. The heading, this subtitle, the two paragraphs
                  below and the artifact were four and a half statements of one
                  idea, and "one source of truth" was the emptiest of them. */}
              <SectionHeader title={'One contact,'} titleAccent={'complete history.'} />

              {/* The record, given the width.

                  The left column used to list the four sources as a glossary,
                  which put the section's whole idea in its least designed half
                  and then repeated it as tags in the feed three inches away.
                  The sources now live inside the record as its filter row, so
                  this column carries the argument in prose and the artifact
                  carries the evidence. */}
              <div className={'mt-14 grid gap-10 lg:grid-cols-12 lg:gap-16'}>
                <div className={'lg:col-span-4 lg:pt-2'}>
                  {/* One paragraph. The competitor contrast is the only thing
                      here that neither the heading nor the feed supplies. */}
                  <p className={'text-lead text-neutral-600'}>
                    At most vendors a receipt, a newsletter and a reply live in three products, on three lists. Here
                    they are one feed you can segment and trigger from.
                  </p>
                </div>

                <div className={'min-w-0 lg:col-span-8'} data-nosnippet>
                  <ContactSnippet />
                </div>
              </div>
            </div>
          </section>

          {/* ========== MCP SERVER ========== */}
          <section>
            <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
              <SectionHeader
                title={'Your agent can'}
                titleAccent={'run your email.'}
                subtitle={'Connect Claude, Cursor, or any Model Context Protocol client to your project.'}
              />

              {/* `items-center`, and no `lg:pt-6` nudging the text down.
                  The artifact is roughly 450px tall and the prose beside it
                  about 300px; top-aligning them and then hand-offsetting one by
                  24px left the two columns agreeing on neither edge, so the
                  section read as two unrelated blocks. Centring the shorter
                  column against the taller one is the same relationship the
                  feature rows above already use. */}
              <div className={'mt-14 grid items-center gap-12 lg:grid-cols-12 lg:gap-16'}>
                <div className={'min-w-0 lg:col-span-7'} data-nosnippet>
                  <AgentSnippet copy={agentExchange} />
                </div>

                <div className={'lg:col-span-5'}>
                  {/* Was a tool count and a read-only-mode caveat. The graphic
                      now carries the one thing a scanner needs, that the agent
                      drafts and you approve, so the copy says the same. */}
                  <p className={'text-lead text-neutral-600'}>
                    Your agent works across contacts, segments, campaigns and workflows, the same ground the dashboard
                    covers.
                  </p>
                  <p className={'mt-5 text-neutral-600'}>Anything that sends email waits for your approval first.</p>

                  <Link
                    href={'/features/mcp'}
                    className={
                      'group mt-8 inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-3 text-ui font-semibold text-neutral-900 transition hover:border-neutral-900'
                    }
                  >
                    Explore the MCP server
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ========== COMPETITORS — EDITORIAL LIST ==========
              Names run at `text-4xl` rather than `text-5xl`. At 48px these were
              the largest words on the page after the h1, which meant a visitor
              skimming read five competitor brands in display type before they
              read anything Plunk does. */}
          <section className={'mx-auto max-w-[88rem] px-6 py-20 sm:px-10 sm:py-28'}>
            <SectionHeader
              title={'Replace your email stack'}
              /* The subtitle listed the same five names that appear directly
                 below at 36px. This says the thing the list cannot. */
              subtitle={'Most teams pay for two of these at once.'}
            />

            <ul className={'mt-12 divide-y divide-neutral-200 border-y border-neutral-200'}>
              {competitors.map((c, i) => (
                <motion.li
                  key={c.slug}
                  initial={{opacity: 0, y: 10}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true, margin: '-8%'}}
                  transition={{duration: 0.45, delay: i * 0.05, ease: [0.22, 1, 0.36, 1]}}
                >
                  <Link
                    href={`/vs/${c.slug}`}
                    className={
                      'group flex items-center justify-between gap-6 py-5 transition-colors hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 sm:py-6'
                    }
                  >
                    <span
                      className={
                        'font-display text-3xl font-semibold tracking-[-0.025em] text-neutral-900 transition-transform duration-300 group-hover:translate-x-1 sm:text-4xl'
                      }
                    >
                      {c.name}
                    </span>
                    <div className={'flex items-center gap-5'}>
                      <span
                        className={
                          'hidden text-ui text-neutral-500 transition group-hover:text-neutral-900 sm:inline'
                        }
                      >
                        vs Plunk
                      </span>
                      <ArrowUpRight
                        className={
                          'h-5 w-5 text-neutral-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-900 sm:h-6 sm:w-6'
                        }
                        strokeWidth={1.75}
                      />
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>

            {/* There are sixteen comparison pages and this list shows five.
                Without this the other eleven were reachable only from the
                footer. */}
            <div className={'mt-8'}>
              <Link
                href={'/vs'}
                className={
                  'group inline-flex items-center gap-2 text-ui font-semibold text-neutral-900 underline-offset-4 hover:underline'
                }
              >
                All comparisons
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
              </Link>
            </div>
          </section>

          {/* ========== PRICING ==========
              Padding was `sm:py-56` against `sm:py-36` everywhere else, plus
              `mt-24` on the price block, which produced a full empty viewport
              between the heading and the number. */}
          <section>
            {/* The one deliberately centred section on the page, and the page's
                single loudest number.

                Splitting this into a left/right column layout balanced it and
                flattened it at the same time: the price stopped being a moment
                and became a figure in a column. Centre-aligning the whole
                section — heading, price, comparison and buttons on one axis —
                brings the moment back without reintroducing the mismatch it was
                fixing, which was a left-rail heading over centred content. It
                also rhymes with the hero, the only other centred fold. */}
            <div className={'mx-auto max-w-[88rem] px-6 py-24 text-center sm:px-10 sm:py-32'}>
              <motion.div
                initial={{opacity: 0, y: 16}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true, margin: '-10%'}}
                transition={{duration: 0.6, ease: [0.22, 1, 0.36, 1]}}
              >
                <h2
                  className={
                    'font-display text-h2 font-extrabold leading-[1.05] tracking-[-0.03em] text-neutral-900'
                  }
                >
                  Simple. Transparent.
                </h2>
                {/* Three negations in one line, on a page that had thirteen.
                    The contact-limit fact is the one competitors do not match,
                    so it is the one that stayed. */}
                <p className={'mx-auto mt-6 max-w-[46ch] text-lead text-neutral-600'}>
                  Pay per email sent. Contacts are free, however many you store.
                </p>

                <div className={'mt-14 flex items-baseline justify-center gap-3 text-neutral-900'}>
                  <span
                    className={'font-display text-7xl font-extrabold tracking-[-0.035em] sm:text-8xl'}
                  >
                    $0.001
                  </span>
                  <span className={'text-xl text-neutral-500 sm:text-2xl'}>/email</span>
                </div>
                {/* Not "the first 1,000 are free". These are two separate
                    plans: the free plan covers 1,000 a month with Plunk
                    branding, and the paid plan bills every email from the
                    first one. Writing it as an allowance on the paid plan
                    would be a pricing claim that is simply untrue. */}
                <p className={'mx-auto mt-6 max-w-[44ch] text-neutral-600'}>
                  Or stay on the free plan: 1,000 emails a month, unlimited contacts.
                </p>
              </motion.div>

              {/* Four prices that all read "nought point nought nought
                  something" made the reader count decimal places to find the
                  multiple. Drawn to scale, the multiple is the first thing they
                  see — and each row carries the competitor's own mark, so it
                  reads as evidence rather than as an assertion. */}
              <div className={'mx-auto mt-20 max-w-3xl text-left'}>
                <p className={'mb-6 text-center text-ui text-neutral-500'}>For the same plan, others charge</p>
                <PriceComparison rows={prices} note={'Based on plans matching Plunk at 10,000 emails per month.'} />
              </div>

              <div className={'mt-16 flex flex-wrap justify-center gap-3'}>
                <motion.a
                  whileHover={{scale: 1.015}}
                  whileTap={{scale: 0.985}}
                  href={SIGNUP_HREF}
                  className={
                    'inline-flex items-center gap-2 rounded-full bg-neutral-900 px-7 py-3.5 text-ui font-semibold text-white transition hover:bg-neutral-800'
                  }
                >
                  {SIGNUP_LABEL}
                  <ArrowRight className="h-4 w-4" />
                </motion.a>
                <Link
                  href={'/pricing'}
                  className={
                    'rounded-full border border-neutral-300 bg-white px-7 py-3.5 text-ui font-semibold text-neutral-900 transition hover:border-neutral-900'
                  }
                >
                  Pricing details
                </Link>
              </div>
            </div>
          </section>

          {/* ========== TESTIMONIALS ========== */}
          <section className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <SectionHeader title={'What customers say'} />
            <div className={'mt-14'}>
              <QuoteWall quotes={[lead, ...quotes]} />
            </div>
          </section>

          <FAQSection faqs={faqs} schemaId={'faq-schema-index'} />

          {/* ========== CTA ========== */}
          <FeatureCTA title={'Start sending in 5 minutes.'} secondary={{href: WIKI_URI, label: 'Read the docs', external: true}} />
        </main>
      </div>

      <Footer />
    </>
  );
}
