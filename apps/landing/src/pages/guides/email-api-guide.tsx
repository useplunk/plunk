import Link from 'next/link';
import React, {useState} from 'react';

import {
  GuideCode,
  GuideCompare,
  GuideFigure,
  GuideLayout,
  GuidePoints,
  GuideSection,
  GuideSteps,
  GuideTable,
  InfoBox,
} from '../../components/guides';
import {DeliveryTimeline, EventList, RequestCard, SnippetTile, UICard} from '../../components/snippets';

const ENDPOINT = 'https://next-api.useplunk.com/v1/send';

/**
 * The same request in every language the page is searched for. All of them are
 * rendered so they stay in the page's HTML; only the selected one is visible.
 */
const EXAMPLES: {language: string; code: string}[] = [
  {
    language: 'cURL',
    code: `curl -X POST ${ENDPOINT} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "ana@acme.com",
    "subject": "Welcome to Acme",
    "body": "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
    "from": "hello@acme.com",
    "name": "Acme"
  }'`,
  },
  {
    language: 'Node.js',
    code: `// Node.js 18+ has fetch built in
const response = await fetch('${ENDPOINT}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: \`Bearer \${process.env.PLUNK_API_KEY}\`,
  },
  body: JSON.stringify({
    to: 'ana@acme.com',
    subject: 'Welcome to Acme',
    body: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
    // Optional
    from: 'hello@acme.com',
    name: 'Acme',
    reply: 'support@acme.com',
  }),
});

const result = await response.json();

if (response.ok) {
  console.log('Sent', result.data.emails[0].email);
} else {
  console.error('Failed to send', response.status, result);
}`,
  },
  {
    language: 'Python',
    code: `import os
import requests

response = requests.post(
    '${ENDPOINT}',
    headers={'Authorization': f"Bearer {os.environ['PLUNK_API_KEY']}"},
    json={
        'to': 'ana@acme.com',
        'subject': 'Welcome to Acme',
        'body': '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
        'from': 'hello@acme.com',
        'name': 'Acme',
    },
    timeout=10,
)

if response.ok:
    print('Sent', response.json()['data']['emails'][0]['email'])
else:
    print('Failed to send', response.status_code, response.text)`,
  },
  {
    language: 'PHP',
    code: `<?php
$ch = curl_init('${ENDPOINT}');

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . getenv('PLUNK_API_KEY'),
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'to' => 'ana@acme.com',
        'subject' => 'Welcome to Acme',
        'body' => '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
        'from' => 'hello@acme.com',
        'name' => 'Acme',
    ]),
]);

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo $status === 200 ? 'Sent' : "Failed to send: $response";`,
  },
  {
    language: 'Ruby',
    code: `require 'net/http'
require 'json'

uri = URI('${ENDPOINT}')

request = Net::HTTP::Post.new(uri)
request['Content-Type'] = 'application/json'
request['Authorization'] = "Bearer #{ENV['PLUNK_API_KEY']}"
request.body = {
  to: 'ana@acme.com',
  subject: 'Welcome to Acme',
  body: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
  from: 'hello@acme.com',
  name: 'Acme'
}.to_json

response = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(request) }

puts response.is_a?(Net::HTTPSuccess) ? 'Sent' : "Failed to send: #{response.body}"`,
  },
  {
    language: 'Go',
    code: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
)

func main() {
    payload, _ := json.Marshal(map[string]string{
        "to":      "ana@acme.com",
        "subject": "Welcome to Acme",
        "body":    "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
        "from":    "hello@acme.com",
        "name":    "Acme",
    })

    req, _ := http.NewRequest("POST", "${ENDPOINT}", bytes.NewBuffer(payload))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+os.Getenv("PLUNK_API_KEY"))

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        fmt.Println("Request failed:", err)
        return
    }
    defer resp.Body.Close()

    fmt.Println("Status:", resp.Status)
}`,
  },
];

export default function EmailAPIGuide() {
  return (
    <GuideLayout
      slug={'email-api-guide'}
      title="What is an Email API? Complete Guide with Code Examples"
      heading={'What is an email API?'}
      description="An email API lets you send and receive email from code. How they work, with examples in Node.js, Python, PHP, Ruby, and Go, and how to pick a provider."
      lead={
        'An email API lets your application send email with one HTTP request instead of running an SMTP connection. The provider handles delivery and retries, then tells you what happened to each message.'
      }
      lastUpdated="2025-12-20"
      readTime="8 min"
      canonical="https://www.useplunk.com/guides/email-api-guide"
      cta={'Send your first email in minutes.'}
      figure={
        <SnippetTile align={'bleed-right'} className={'min-h-[26rem] py-10'}>
          <div className={'flex flex-col gap-3'}>
            <RequestCard className={'w-full max-w-md'} />
            <DeliveryTimeline className={'ml-10 w-full max-w-xs'} />
          </div>
        </SnippetTile>
      }
    >
      <GuideSection id={'what-is-an-email-api'} title={'What an email API is'}>
        <p>
          An email API is an HTTP interface for sending and managing email. You send a POST request with the recipient,
          subject and body; the provider runs the mail servers, delivers the message and reports delivery status back
          through webhooks.
        </p>
        <GuideCompare
          items={[
            {
              title: 'SMTP',
              body: 'The traditional protocol for sending email.',
              points: [
                'You manage connections',
                'Manual error handling',
                'Limited delivery tracking',
                'More code to get right',
                'Ports 25, 587 or 465',
              ],
            },
            {
              title: 'Email API',
              body: 'A REST interface over standard HTTPS.',
              points: [
                'No connections to manage',
                'Structured error responses',
                'Tracking and analytics built in',
                'Simpler to implement',
                'Works anywhere HTTPS does',
              ],
            },
          ]}
        />
        <p>
          APIs suit <Link href={'/guides/transactional-vs-marketing-email'}>transactional email</Link> (order
          confirmations, password resets), automated notifications and programmatic campaigns. If you are building
          software that sends email, an API is almost always the better choice.
        </p>
      </GuideSection>

      <GuideSection id={'how-it-works'} title={'How an email API works'}>
        <GuideSteps
          steps={[
            {
              title: 'Authenticate',
              body: 'Each request carries an API key, usually in the Authorization header, which identifies your account.',
            },
            {
              title: 'Send the request',
              body: 'POST the recipient, subject, body and any options to the send endpoint as JSON.',
            },
            {
              title: 'The API validates and queues',
              body: 'It checks the request, queues the email and responds straight away with an ID.',
            },
            {
              title: 'The provider delivers',
              body: 'It handles the SMTP connection, retries and hand-off to the recipient’s mail server.',
            },
            {
              title: 'You get events back',
              body: 'Webhooks report each status change (delivered, bounced, opened, clicked), and you can query the API for a message’s status.',
            },
          ]}
        />
      </GuideSection>

      <GuideSection id={'code-examples'} title={'Code examples'}>
        <p>
          The same request to Plunk’s send endpoint in six languages. Only <code>to</code>, <code>subject</code> and{' '}
          <code>body</code> are required.
        </p>
        <CodeExamples />
        <p>A successful send returns the email ID for each recipient:</p>
        <GuideCode
          title={'200 OK'}
          code={`{
  "success": true,
  "data": {
    "emails": [
      { "contact": { "id": "…", "email": "ana@acme.com" }, "email": "…" }
    ],
    "timestamp": "2025-12-20T09:41:02.000Z"
  }
}`}
        />
      </GuideSection>

      <GuideSection id={'features'} title={'What email APIs do'}>
        <GuideTable
          head={['Area', 'What to expect']}
          rows={[
            [
              'Sending',
              'Single or batch sends, HTML and plain text, attachments, CC and BCC, custom headers, templates, scheduled sending.',
            ],
            [
              'Tracking',
              'Delivery status, opens, clicks, bounce detection, spam complaints, unsubscribes, real-time analytics.',
            ],
            [
              'Webhooks and events',
              'Notifications for deliveries, bounces, spam complaints, unsubscribes, opens and clicks, plus custom events.',
            ],
            [
              'Management',
              'Suppression lists, contacts, domain verification, templates, API keys, rate limits.',
            ],
          ]}
        />
        <GuideFigure caption={'Every status change arrives as an event, so you never have to poll.'}>
          <EventList />
        </GuideFigure>
      </GuideSection>

      <GuideSection id={'best-practices'} title={'Best practices'}>
        <h3>Handle errors by status code</h3>
        <GuideTable
          mono
          head={['Status', 'Meaning', 'What to do']}
          rows={[
            ['200', 'Success', 'Store the email ID.'],
            ['400–499', 'Client error, such as a bad request or failed validation', 'Fix the request. Do not retry.'],
            ['429', 'Rate limit exceeded', 'Back off and retry later.'],
            ['500–599', 'Server error', 'Retry with exponential backoff.'],
          ]}
        />
        <GuidePoints
          tone={'do'}
          items={[
            {
              title: 'Keep API keys out of code',
              body: 'Store them in environment variables, use separate keys for development, staging and production, and rotate them regularly or immediately if one leaks.',
            },
            {
              title: 'Use webhooks, not polling',
              body: 'Webhooks deliver status changes in real time with far fewer requests.',
            },
            {
              title: 'Respect rate limits',
              body: 'Queue emails, send in batches and back off exponentially on a 429.',
            },
            {
              title: 'Validate addresses first',
              body: (
                <>
                  Check the format and common typos before calling the API, or verify deliverability with a tool like the{' '}
                  <Link href={'/tools/verify-email'}>email verifier</Link>.
                </>
              ),
            },
            {
              title: 'Use templates',
              body: 'Keep templates in your email provider instead of hardcoding HTML, so non-developers can edit content without a deploy.',
            },
            {
              title: 'Monitor deliverability',
              body: (
                <>
                  Track <Link href={'/guides/email-bounce-rate'}>bounce rate</Link>, spam complaints and engagement, and
                  alert on anomalies.
                </>
              ),
            },
            {
              title: 'Test before production',
              body: 'Use a sandbox or test mode to exercise errors, retries and webhook handling.',
            },
            {
              title: 'Log requests and responses',
              body: 'Redact keys and personal data, but keep enough to debug failed sends.',
            },
            {
              title: 'Set timeouts and send asynchronously',
              body: 'Use a 10 to 30 second timeout and queue sends so a user request never waits on the email API.',
            },
          ]}
        />
        <GuideFigure caption={'One key per environment, so a leaked staging key never touches production mail.'}>
          <ApiKeys />
        </GuideFigure>
      </GuideSection>

      <GuideSection id={'choosing-a-provider'} title={'Choosing an email API provider'}>
        <GuidePoints
          columns={2}
          items={[
            {
              title: 'Deliverability',
              body: (
                <>
                  If mail lands in spam, nothing else matters. Look for a strong{' '}
                  <Link href={'/guides/email-deliverability'}>deliverability</Link> record.
                </>
              ),
            },
            {
              title: 'Features',
              body: 'Templates, webhooks, analytics, scheduling, attachments. Some providers focus on transactional email, others on marketing.',
            },
            {
              title: 'Pricing',
              body: 'Per-email charges, monthly tiers and overage fees. Price your expected volume and watch for jumps at higher tiers.',
            },
            {
              title: 'Developer experience',
              body: 'Clear docs, SDKs in your language, useful error messages and responsive support.',
            },
            {
              title: 'Scale and reliability',
              body: 'Can it handle your peak volume? What uptime does the SLA promise, and is there failover?',
            },
            {
              title: 'Compliance and security',
              body: 'GDPR and CAN-SPAM compliance, plus certifications such as SOC 2 and ISO 27001.',
            },
          ]}
        />
        <InfoBox title={'Authenticate your domain first'}>
          <p>
            Whichever provider you pick, set up <Link href={'/guides/what-is-spf'}>SPF</Link>,{' '}
            <Link href={'/guides/what-is-dkim'}>DKIM</Link> and <Link href={'/guides/what-is-dmarc'}>DMARC</Link> on your
            sending domain before you go live, or API-sent mail will struggle to reach the inbox.
          </p>
        </InfoBox>
      </GuideSection>
    </GuideLayout>
  );
}

/** Language switcher over the examples. Every example stays in the markup for search. */
function CodeExamples() {
  const [active, setActive] = useState('cURL');

  return (
    <div className={'!my-8'}>
      <div role={'tablist'} aria-label={'Language'} className={'flex flex-wrap gap-1.5'}>
        {EXAMPLES.map(({language}) => (
          <button
            key={language}
            type={'button'}
            role={'tab'}
            aria-selected={active === language}
            onClick={() => setActive(language)}
            className={`rounded-full px-3 py-1 text-ui font-medium transition ${
              active === language ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            {language}
          </button>
        ))}
      </div>
      {EXAMPLES.map(({language, code}) => (
        <div key={language} role={'tabpanel'} hidden={active !== language} className={'[&>div]:!mt-3 [&>div]:!mb-0'}>
          <GuideCode title={`Send an email with ${language}`} code={code} />
        </div>
      ))}
    </div>
  );
}

/** API keys, one per environment, the way a settings page lists them. */
function ApiKeys() {
  const keys = [
    {name: 'Production', value: 'sk_••••••••3f9a', used: 'Used 2m ago'},
    {name: 'Staging', value: 'sk_••••••••81c2', used: 'Used 1h ago'},
    {name: 'Development', value: 'sk_••••••••0d7e', used: 'Used yesterday'},
  ];

  return (
    <UICard className={'w-full max-w-md divide-y divide-neutral-100'}>
      {keys.map(k => (
        <div key={k.name} className={'flex items-center gap-3 px-4 py-3'}>
          <div className={'min-w-0 flex-1'}>
            <p className={'truncate text-ui font-semibold text-neutral-900'}>{k.name}</p>
            <p className={'truncate text-label text-neutral-500'}>{k.used}</p>
          </div>
          <span className={'flex-shrink-0 rounded-md bg-neutral-50 px-1.5 py-0.5 font-code text-label text-neutral-700'}>
            {k.value}
          </span>
        </div>
      ))}
    </UICard>
  );
}
