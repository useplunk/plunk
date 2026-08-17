import {
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureSection,
  Footer,
  Navbar,
  SpecList,
  StepSequence,
} from '../../components';
import type {FAQ, Spec, Step} from '../../components';
import {WIKI_URI} from '../../lib/constants';
import React from 'react';
import Head from 'next/head';

/**
 * Was a six-item icon-card grid, byte-identical to the ones on the inbound,
 * SMTP and MCP pages. Four pages running the same grid made four pages look
 * like one template with the nouns swapped, which is the single loudest
 * "generated" tell a feature page can have.
 */
const capabilities: Spec[] = [
  {
    title: 'Visual and HTML, both ways',
    description:
      'Format with a toolbar, or open the HTML and write it yourself. The editor detects markup it cannot represent visually and switches to code mode rather than flattening your work.',
  },
  {
    title: 'Variables with autocomplete',
    description:
      'Type two braces and pick a field. Fallbacks, nested properties and custom contact fields all resolve at send time.',
    machine: '{{contact.firstName | there}}',
  },
  {
    title: 'Preview with real contacts',
    description: 'Select any contact and see what they will actually receive, at desktop, tablet and mobile widths.',
  },
  {
    title: 'Email-safe output',
    description: 'CSS is inlined automatically and the markup is written for real mail clients, Outlook included.',
  },
];

const audiences: Spec[] = [
  {
    title: 'For developers',
    description:
      'Full HTML control when you need it, and a variable system with fallbacks. The same template works in an API call, a workflow and a campaign.',
    machine: 'Password resets, API-triggered alerts, webhook notifications',
  },
  {
    title: 'For marketers',
    description:
      'The visual editor for quick changes, and live preview against real customer data. No waiting on a developer to fix a paragraph.',
    machine: 'Product announcements, newsletters, onboarding',
  },
  {
    title: 'For teams',
    description:
      'One tool both halves of the team can open. Developers write the markup, marketers edit the copy, and templates are reused rather than rebuilt.',
    machine: 'Launch announcements, feature updates, lifecycle email',
  },
];

const steps: Step[] = [
  {
    title: 'Create your template',
    body: 'Use the visual editor for quick formatting or write custom HTML. Add variables with autocomplete.',
  },
  {
    title: 'Preview with real data',
    body: 'Select any contact and see exactly what they will receive. Test on desktop, tablet, and mobile.',
  },
  {
    title: 'Use everywhere',
    body: 'Use your template in campaigns, workflows, and API calls. One template, unlimited uses.',
  },
];

const faqs: FAQ[] = [
  {
    question: 'Can I write raw HTML instead of using the visual editor?',
    answer:
      'Yes. Every template can be opened as HTML and edited directly. If the markup is too complex for the visual editor to represent, it stays in code mode rather than rewriting what you wrote.',
  },
  {
    question: 'Will my emails render correctly in Outlook?',
    answer:
      'CSS is inlined automatically and the output is written for real mail clients, including Outlook. Preview any template against a real contact before you send it.',
  },
  {
    question: 'How do variables work?',
    answer:
      'Type two braces to get autocomplete over your contact fields. Variables support fallbacks and nested properties, so a missing first name can render as something sensible instead of a blank.',
  },
  {
    question: 'Can one template be used in more than one place?',
    answer:
      'Yes. A template can back a campaign, a workflow step and a transactional API call at the same time. Edit it once and every use picks up the change.',
  },
];

export default function EmailEditorFeature() {
  return (
    <>
      <Head>
        <title>Email Editor - Create Beautiful Emails Without Fighting Your Tools | Plunk</title>
        <meta
          name="description"
          content="The email editor that speaks both languages. Switch between visual and code editing, preview with real data, and create templates that work everywhere."
        />
        <meta
          property="og:title"
          content="Email Editor - Create Beautiful Emails Without Fighting Your Tools | Plunk"
        />
        <meta
          property="og:description"
          content="The email editor that speaks both languages. Switch between visual and code editing, preview with real data, and create templates that work everywhere."
        />
        <meta property="og:image" content="https://www.useplunk.com/api/og?title=Email+Editor&tag=Feature" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:image" content="https://www.useplunk.com/api/og?title=Email+Editor&tag=Feature" />
      </Head>

      <Navbar />

      <main className={'text-neutral-800'}>
        <FeatureHero
          title={
            <>
              The editor that
              <br />
              speaks both languages.
            </>
          }
          subtitle={'Switch between visual and code editing, and preview against a real contact before you send.'}
          docsHref={`${WIKI_URI}/docs/guides/template-language`}
          docsLabel={'Template docs'}
        />

        <FeatureSection
          tone={'muted'}
          title={'What the editor does'}
          intro={'One template that survives being edited by two different kinds of person.'}
        >
          <SpecList specs={capabilities} />
        </FeatureSection>

        <FeatureSection title={'How it works'}>
          <StepSequence steps={steps} />
        </FeatureSection>

        <FeatureSection tone={'muted'} title={'Who it is for'}>
          <SpecList specs={audiences} />
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-email-editor'} />

        <FeatureCTA title={'Write your first template.'} />
      </main>

      <Footer />
    </>
  );
}
