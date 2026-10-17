import {
  EditorClientsFragment,
  EditorReuseFragment,
  EditorSnippets,
  EditorVariablesFragment,
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureHighlights,
  Footer,
  MoreFeatures,
  Navbar,
} from '../../components';
import type {ChecklistItem, Claim, FAQ} from '../../components';
import {WIKI_URI} from '../../lib/constants';
import React from 'react';
import {NextSeo} from 'next-seo';

/**
 * Was a six-item icon-card grid, byte-identical to the ones on the inbound,
 * SMTP and MCP pages. Four pages running the same grid made four pages look
 * like one template with the nouns swapped, which is the single loudest
 * "generated" tell a feature page can have.
 */
/**
 * The hero shows the two modes and the preview. These are the three things
 * that happen to a template after you write it.
 */
const claims: Claim[] = [
  {
    title: 'Personal without the risk',
    copy: 'Pick a contact field from the list. If it is empty, a fallback fills in, so nobody gets “Hi ,”.',
    fragment: <EditorVariablesFragment />,
  },
  {
    title: 'Looks right in every inbox',
    copy: 'CSS is inlined and the markup is written for real mail clients, Outlook included.',
    fragment: <EditorClientsFragment />,
  },
  {
    title: 'Write once, use everywhere',
    copy: 'The same template backs an API call, a workflow step and a campaign. Edit it once.',
    fragment: <EditorReuseFragment />,
  },
];

const extras: ChecklistItem[] = [
  {title: 'Visual and HTML, both ways', description: 'Switch any time without losing your markup.'},
  {title: 'Keeps your code intact', description: 'Markup it cannot show visually stays in code mode.'},
  {title: 'Preview as any contact', description: 'See exactly what one person will receive.'},
  {title: 'Three screen widths', description: 'Check desktop, tablet and mobile before sending.'},
  {title: 'Custom and nested fields', description: 'Use any data you store on a contact.'},
  {title: 'Built for both halves', description: 'Developers write markup, marketers edit copy.'},
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
      <NextSeo
        title="Email Editor - Visual and HTML Email Builder | Plunk"
        description="The email editor that speaks both languages. Switch between visual and code editing, preview with real data, and create templates that work everywhere."
        canonical="https://www.useplunk.com/features/email-editor"
        openGraph={{
          title: 'Email Editor - Visual and HTML Email Builder | Plunk',
          description:
            'The email editor that speaks both languages. Switch between visual and code editing, preview with real data, and create templates that work everywhere.',
          url: 'https://www.useplunk.com/features/email-editor',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=Email+Editor&tag=Feature',
              alt: 'Plunk Email Editor',
              width: 1200,
              height: 630,
            },
          ],
        }}
      />

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
          docsHref={`${WIKI_URI}/guides/template-language`}
          docsLabel={'Template docs'}
          artifact={<EditorSnippets />}
        />

        <FeatureHighlights title={'What the editor does'} claims={claims} extras={extras} />

        <FAQSection faqs={faqs} schemaId={'faq-email-editor'} />

        <FeatureCTA title={'Write your first template.'} />

        <MoreFeatures current={'/features/email-editor'} />
      </main>

      <Footer />
    </>
  );
}
