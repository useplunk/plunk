import Link from 'next/link';
import React from 'react';

import {
  GuideCode,
  GuideCompare,
  GuideFigure,
  GuideLayout,
  GuidePoints,
  GuideSection,
  GuideTable,
  InfoBox,
  RateFragment,
  CampaignStatsFragment,
} from '../../components/guides';
import {Avatar, SnippetRow, SnippetTile, StatusPill, UICard} from '../../components/snippets';

export default function EmailClickThroughRate() {
  return (
    <GuideLayout
      slug={'email-click-through-rate'}
      title="Email Click-Through Rate: Benchmarks & How to Improve"
      heading={'Email click-through rate'}
      description="Learn what affects email click-through rates, industry benchmarks, and proven tactics to optimize CTAs and boost engagement."
      lead={
        'Click-through rate is the share of delivered emails that get at least one click. Most industries average 2-5%, and it shows how well your content and calls to action work.'
      }
      lastUpdated="2025-12-20"
      readTime="7 min"
      canonical="https://www.useplunk.com/guides/email-click-through-rate"
      cta={'Send email people click.'}
      figure={
        <SnippetTile align={'bleed-right'} className={'min-h-[26rem] py-10'}>
          <div className={'flex flex-col gap-3'}>
            <CampaignStatsFragment highlight={'Clicked'} className={'w-full max-w-lg'} />
            <RateFragment
              label={'Click rate'}
              value={'4.2%'}
              fill={42}
              marker={{at: 25, label: 'Industry average 2-3%'}}
              className={'ml-10 w-full max-w-xs'}
            />
          </div>
        </SnippetTile>
      }
    >
      <GuideSection id={'what-is-ctr'} title={'How click-through rate is calculated'}>
        <p>
          Divide unique clicks by the number of emails delivered, then multiply by 100. Where{' '}
          <Link href={'/guides/email-open-rate'}>open rate</Link> shows whether the subject line worked, click-through
          rate (CTR) shows whether the email itself did.
        </p>
        <GuideCode
          title={'Click-through rate'}
          copy={false}
          code={`CTR = (Unique clicks ÷ Emails delivered) × 100

Sent: 10,000   Delivered: 9,800   Unique clicks: 294
CTR = (294 ÷ 9,800) × 100 = 3.0%`}
        />
        <p>Click-to-open rate (CTOR) divides the same clicks by unique opens instead.</p>
        <GuideCode
          title={'Click-to-open rate'}
          copy={false}
          code={`CTOR = (Unique clicks ÷ Unique opens) × 100

Unique opens: 2,450   Unique clicks: 294
CTOR = (294 ÷ 2,450) × 100 = 12.0%`}
        />
        <GuideFigure caption={'Same 524 clicks, two rates. CTOR leaves out everyone who never opened.'}>
          <div className={'grid w-full max-w-xl gap-3 sm:grid-cols-2'}>
            <RateFragment
              label={'Click rate'}
              value={'4.2%'}
              fill={42}
              note={'524 of 12,480 delivered'}
              className={'w-full'}
            />
            <RateFragment
              label={'Click-to-open rate'}
              value={'9.1%'}
              fill={91}
              note={'524 of 5,741 opened'}
              className={'w-full'}
            />
          </div>
        </GuideFigure>
        <GuideCompare
          items={[
            {
              title: 'CTR',
              body: 'Overall campaign performance, including deliverability and opens.',
              points: ['Clicks ÷ delivered', 'Use it to judge the whole campaign'],
            },
            {
              title: 'CTOR',
              body: 'Content quality alone, measured only among people who opened.',
              points: ['Clicks ÷ opens', 'Use it to improve the content'],
            },
          ]}
        />
      </GuideSection>

      <GuideSection id={'benchmarks'} title={'Click-through rate benchmarks by industry'}>
        <GuideTable
          head={['Industry', 'Average CTR', 'Good CTR', 'Average CTOR']}
          rows={[
            ['SaaS / Technology', '2-3%', '4%+', '10-15%'],
            ['E-commerce / Retail', '3-5%', '6%+', '12-18%'],
            ['Media / Publishing', '4-6%', '7%+', '15-20%'],
            ['Financial services', '2-4%', '5%+', '10-14%'],
            ['Non-profit', '2-4%', '5%+', '10-16%'],
            ['Education', '3-5%', '6%+', '12-17%'],
          ]}
        />
        <InfoBox type={'tip'} title={'Compare the same kind of email'}>
          <p>
            CTR depends heavily on the type of email: promotional 2-3%, newsletters 4-6%, transactional 10-15% and
            triggered emails 15-30%. Benchmark each type separately.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'factors'} title={'What affects click-through rate'}>
        <GuidePoints
          columns={2}
          items={[
            {
              title: 'CTA design',
              body: 'Placement, design and copy all matter. Clear, prominent, action-led CTAs beat “Click here”.',
            },
            {
              title: 'Relevance',
              body: 'Targeted, personalized content gets 2-3x the CTR of generic blasts.',
            },
            {
              title: 'Value proposition',
              body: 'Exclusive content, limited offers or a solved problem give people a reason to click.',
            },
            {
              title: 'Mobile',
              body: 'Over 60% of email is read on mobile. Small links and broken layouts see 50% lower CTR there.',
            },
            {
              title: 'Scannability',
              body: 'Most people skim. Headers, bullet points and whitespace help them find the CTA.',
            },
            {
              title: 'Number of CTAs',
              body: 'Emails with one primary CTA convert 371% better than those with several competing ones.',
            },
          ]}
        />
      </GuideSection>

      <GuideSection id={'improve-ctr'} title={'How to increase click-through rate'}>
        <GuidePoints
          tone={'do'}
          items={[
            {
              title: 'Write specific CTA copy',
              body: 'Say what happens on click: “Download your free guide”, “Start your 14-day free trial”, “Get 20% off today only”. Not “Click here” or “Learn more”.',
            },
            {
              title: 'Make the button stand out',
              body: 'Use a contrasting color, at least 44×44px to tap, whitespace around it, and live text rather than an image. Repeat it at the bottom of long emails.',
            },
            {
              title: 'Give each email one goal',
              body: 'Competing CTAs reduce total clicks. Point readers at one action.',
            },
            {
              title: 'Personalize the content',
              body: 'Go beyond “Hi Name” with behavior, purchase history or preferences. Personalized CTAs see 202% higher CTR.',
            },
            {
              title: 'Design for mobile',
              body: 'Responsive, single column, concise copy, large tappable buttons instead of text links, and a CTA above the fold.',
            },
            {
              title: 'Use real urgency',
              body: '“Sale ends tonight” or “Only 5 spots remaining” work when they are true. False urgency costs trust.',
            },
            {
              title: 'Segment your audience',
              body: 'Target by behavior, interests or demographics. Segmented campaigns see 3x the CTR of untargeted ones.',
            },
            {
              title: 'Tease, don’t tell everything',
              body: 'A product image, a stat or an excerpt creates curiosity. “Read the full article” beats a bare headline.',
            },
            {
              title: 'A/B test your CTAs',
              body: 'Test copy (“Get started” or “Start free trial”), color, placement, number of CTAs, and size and shape.',
            },
            {
              title: 'Match the landing page',
              body: 'If the email says 20% off, the page it opens should show 20% off, not the homepage.',
            },
          ]}
        />
        <GuideFigure caption={'One primary button takes most of the clicks. Secondary links split what is left.'}>
          <LinkClicksFragment />
        </GuideFigure>
      </GuideSection>

      <GuideSection id={'cta-placement'} title={'Where to put the CTA'}>
        <p>How many CTAs an email needs, and where, depends on its length.</p>
        <GuideTable
          head={['Email length', 'CTAs', 'Layout']}
          rows={[
            ['Short (under 200 words)', 'One, in the middle or at the end', 'Intro, value, CTA'],
            ['Medium (200-500 words)', 'At the start and the end', 'Intro and CTA, content, final CTA'],
            ['Long (over 500 words)', 'Several throughout', 'CTA, content, CTA, more content, final CTA'],
          ]}
        />
        <GuideFigure caption={'The button sits above the fold, so readers who never scroll can still click.'}>
          <EmailPreviewFragment />
        </GuideFigure>
        <InfoBox title={'Put one CTA above the fold'}>
          <p>
            Many readers never scroll, especially on mobile. Make sure at least one CTA is visible without scrolling.
          </p>
        </InfoBox>
      </GuideSection>

      <GuideSection id={'common-mistakes'} title={'Common mistakes'}>
        <GuidePoints
          tone={'dont'}
          items={[
            {title: 'Too many CTAs', body: 'Competing actions confuse readers and lower total clicks. Pick one.'},
            {
              title: 'Vague CTA copy',
              body: '“Click here” and “Learn more” say nothing. “Start 14-day trial” says exactly what they get.',
            },
            {
              title: 'Image-only buttons',
              body: 'Many clients block images by default, so the CTA disappears. Use HTML buttons with text.',
            },
            {
              title: 'Small links',
              body: 'Tiny text links are hard to tap on a phone. Use buttons of at least 44×44px.',
            },
            {
              title: 'No reason to click',
              body: 'People will not click if they do not know why. State the benefit before asking for the click.',
            },
          ]}
        />
      </GuideSection>
    </GuideLayout>
  );
}

/** Clicks per link in one campaign, most clicked first. */
function LinkClicksFragment() {
  const links = [
    {label: 'Start your 14-day free trial', kind: 'Button', clicks: 377},
    {label: 'Read the full changelog', kind: 'Link', clicks: 91},
    {label: 'See pricing', kind: 'Link', clicks: 44},
    {label: 'Follow us on X', kind: 'Footer', clicks: 12},
  ];
  const total = links.reduce((sum, l) => sum + l.clicks, 0);

  return (
    <UICard className={'w-full max-w-md divide-y divide-neutral-100'}>
      <div className={'flex items-center justify-between gap-3 px-4 py-3'}>
        <p className={'text-ui font-semibold text-neutral-900'}>Clicks by link</p>
        <span className={'text-label tabular-nums text-neutral-500'}>{total} clicks</span>
      </div>
      {links.map((l, i) => (
        <div key={l.label} className={'px-4 py-3'}>
          <div className={'flex items-center gap-3'}>
            <p
              className={`min-w-0 flex-1 truncate text-ui ${i === 0 ? 'font-semibold text-neutral-900' : 'text-neutral-700'}`}
            >
              {l.label}
            </p>
            <StatusPill>{l.kind}</StatusPill>
            <span className={'w-10 flex-shrink-0 text-right text-ui font-semibold tabular-nums text-neutral-900'}>
              {l.clicks}
            </span>
          </div>
          <div className={'mt-2 h-1.5 rounded-full bg-neutral-100'}>
            <div
              className={`h-full rounded-full ${i === 0 ? 'bg-neutral-900' : 'bg-neutral-300'}`}
              style={{width: `${Math.round((l.clicks / total) * 100)}%`}}
            />
          </div>
        </div>
      ))}
    </UICard>
  );
}

/** The top of an email on a phone: one clear button before the fold. */
function EmailPreviewFragment() {
  return (
    <UICard className={'w-full max-w-sm overflow-hidden'}>
      <div className={'border-b border-neutral-100 p-4'}>
        <SnippetRow
          leading={<Avatar name={'Ana Ruiz'} />}
          label={'Ana from Acme'}
          title={'Your trial ends in 3 days'}
        />
      </div>
      <div className={'p-5'}>
        <p className={'font-display text-lg font-bold tracking-[-0.01em] text-neutral-900'}>
          Keep your projects running
        </p>
        <p className={'mt-2 text-ui text-neutral-600'}>
          Your Acme trial ends on Friday. Upgrade now and everything you set up stays exactly where it is.
        </p>
        <span className={'mt-4 inline-flex rounded-lg bg-neutral-900 px-4 py-2.5 text-ui font-semibold text-white'}>
          Upgrade to keep your projects
        </span>
      </div>
      <div className={'flex items-center gap-3 px-5'}>
        <span aria-hidden className={'h-px flex-1 border-t border-dashed border-neutral-300'} />
        <span className={'text-label text-neutral-500'}>Fold on most phones</span>
        <span aria-hidden className={'h-px flex-1 border-t border-dashed border-neutral-300'} />
      </div>
      <div aria-hidden className={'flex flex-col gap-2 p-5 opacity-50'}>
        <span className={'h-2 w-full rounded-full bg-neutral-200'} />
        <span className={'h-2 w-5/6 rounded-full bg-neutral-200'} />
        <span className={'h-2 w-2/3 rounded-full bg-neutral-200'} />
      </div>
    </UICard>
  );
}
