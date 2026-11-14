import {FeatureCTA, Footer, MoreTools, Navbar, ToolExplainer, ToolHero, ToolPanel} from '../../components';
import React, {useMemo, useState} from 'react';
import {NextSeo} from 'next-seo';
import {Check, Copy} from 'lucide-react';
import {MarkdownEmailEditor} from '../../components/tools/MarkdownEmailEditor';
import {convertToCompleteEmailHtml} from '../../lib/emailHtmlConverter';
import {Button} from '@plunk/ui';

const explainer = [
  {
    title: 'Format your content',
    body: 'Use the visual editor to format text, add headings, lists, and links, just like a word processor.',
  },
  {
    title: 'Styles get inlined',
    body: 'Every CSS rule is moved inline so email clients like Outlook, Gmail, and Apple Mail render it correctly.',
  },
  {
    title: 'Drop it in your send',
    body: 'Copy the output HTML and paste it into any email service, SMTP template, or API payload.',
  },
];

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

      <div>
        <main className={'text-neutral-800'}>
          <ToolHero
            title={'Markdown to email HTML'}
            subtitle={
              'Format your content in the visual editor and get production-ready HTML, with inlined styles that work in every email client.'
            }
            wide
          >
            <ToolPanel>
              <div className={'grid gap-6 lg:grid-cols-2'}>
                <div className={'min-w-0'}>
                  <div className={'mb-3 flex h-8 items-center'}>
                    <h2 className={'text-ui font-semibold text-neutral-900'}>Editor</h2>
                  </div>
                  <MarkdownEmailEditor value={editorContent} onChange={setEditorContent} />
                </div>

                <div className={'min-w-0'}>
                  <div className={'mb-3 flex h-8 items-center justify-between'}>
                    <h2 className={'text-ui font-semibold text-neutral-900'}>Email-safe HTML</h2>
                    <Button onClick={handleCopy} size="sm" variant="outline" className={'gap-2'}>
                      {copied ? (
                        <>
                          <Check className={'h-4 w-4'} />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className={'h-4 w-4'} />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className={'overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50'}>
                    <pre className={'max-h-[500px] min-h-[500px] overflow-auto p-4 text-xs'}>
                      <code className={'font-code text-neutral-700'}>{emailSafeHtml}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </ToolPanel>
          </ToolHero>

          <ToolExplainer
            title={'Write once, send everywhere'}
            subtitle={
              'Email clients ignore most CSS. This tool inlines every style rule so your formatting survives any inbox.'
            }
            items={explainer}
          />

          <MoreTools current={'markdown-to-email'} />

          <FeatureCTA
            title={'Ready to send great emails?'}
            body={
              'Plunk handles everything: templates, sending, tracking, and deliverability. Start free, no credit card required.'
            }
          />
        </main>
      </div>

      <Footer />
    </>
  );
}
