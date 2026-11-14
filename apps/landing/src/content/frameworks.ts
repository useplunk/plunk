/**
 * The "send email with X" pages. Plunk has no SDKs, so every example uses the
 * language's own HTTP client or the framework's own mailer over SMTP. That is
 * the honest pitch, too: nothing to install, nothing to keep up to date.
 *
 * SMTP is plunk / your secret key on smtp.useplunk.com, ports 587 (STARTTLS)
 * and 465 (TLS), as enforced in apps/smtp.
 */

const ENDPOINT = 'https://next-api.useplunk.com/v1/send';

export interface Example {
  /** Shown as the code block title, e.g. "app/api/welcome/route.ts". */
  title: string;
  code: string;
}

export interface Framework {
  slug: string;
  name: string;
  /** One sentence under the headline. */
  intro: string;
  /** The way most apps in this framework should send. */
  primary: 'api' | 'smtp';
  api: Example & {intro: string};
  smtp: Example & {intro: string};
  faqs: {question: string; answer: string}[];
}

const nodeFetch = (comment: string) => `${comment}
const response = await fetch('${ENDPOINT}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: \`Bearer \${process.env.PLUNK_SECRET_KEY}\`,
  },
  body: JSON.stringify({
    to: 'ana@acme.com',
    subject: 'Welcome to Acme',
    body: '<p>Thanks for signing up.</p>',
  }),
});

if (!response.ok) {
  throw new Error(\`Plunk returned \${response.status}\`);
}`;

const nodemailer = `import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.useplunk.com',
  port: 587,
  auth: {user: 'plunk', pass: process.env.PLUNK_SECRET_KEY},
});

await transporter.sendMail({
  from: 'Acme <hello@acme.com>',
  to: 'ana@acme.com',
  subject: 'Welcome to Acme',
  html: '<p>Thanks for signing up.</p>',
});`;

const pythonRequests = `import os
import requests

response = requests.post(
    "${ENDPOINT}",
    headers={"Authorization": f"Bearer {os.environ['PLUNK_SECRET_KEY']}"},
    json={
        "to": "ana@acme.com",
        "subject": "Welcome to Acme",
        "body": "<p>Thanks for signing up.</p>",
    },
    timeout=10,
)
response.raise_for_status()`;

const sharedFaqs = [
  {
    question: 'Do I need an SDK?',
    answer:
      'No. Plunk is a single HTTPS endpoint and a standard SMTP server, so the HTTP client and mailer your language already has are all you need. There is nothing to install and nothing to keep up to date.',
  },
  {
    question: 'Which address can I send from?',
    answer:
      'Any address on a domain you have verified in Plunk. Adding a domain takes a few DNS records, and Plunk checks them for you.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'The free plan covers 1,000 emails a month. On the paid plan every email is $0.001, whether it is sent through the API or SMTP, with unlimited contacts.',
  },
];

export const FRAMEWORKS: Framework[] = [
  {
    slug: 'nextjs',
    name: 'Next.js',
    intro: 'Send from a route handler or server action with fetch. No package to install, and it runs on the Node.js and Edge runtimes.',
    primary: 'api',
    api: {
      intro: 'Call the send endpoint from a route handler. Keep the secret key on the server: never in a client component.',
      title: 'app/api/welcome/route.ts',
      code: `export async function POST(request: Request) {
  const {email} = await request.json();

  const response = await fetch('${ENDPOINT}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${process.env.PLUNK_SECRET_KEY}\`,
    },
    body: JSON.stringify({
      to: email,
      subject: 'Welcome to Acme',
      body: '<p>Thanks for signing up.</p>',
    }),
  });

  if (!response.ok) {
    return Response.json({error: 'Could not send email'}, {status: 502});
  }

  return Response.json({sent: true});
}`,
    },
    smtp: {
      intro: 'Already sending with Nodemailer, or using an auth library that takes SMTP settings? Point it at Plunk.',
      title: 'lib/mail.ts',
      code: nodemailer,
    },
    faqs: [
      {
        question: 'Can I send email from a Next.js server action?',
        answer:
          'Yes. The same fetch call works inside a server action, since it runs on the server. Read the secret key from process.env and never pass it to client components.',
      },
      {
        question: 'Does it work with NextAuth or Auth.js magic links?',
        answer:
          'Yes. Their email provider takes SMTP settings: use smtp.useplunk.com on port 587, the username plunk and your secret key as the password.',
      },
      ...sharedFaqs,
    ],
  },
  {
    slug: 'nodejs',
    name: 'Node.js',
    intro: 'Send with the fetch built into Node.js 18 and later, or with Nodemailer over SMTP. Works in Express, Fastify, NestJS and plain scripts.',
    primary: 'api',
    api: {
      intro: 'One request with the built-in fetch. Use a template ID and data instead of subject and body to keep email copy out of your code.',
      title: 'send.mjs',
      code: nodeFetch('// Node.js 18+ has fetch built in'),
    },
    smtp: {
      intro: 'If your app already uses Nodemailer, swap the transport settings and keep everything else.',
      title: 'mail.mjs',
      code: nodemailer,
    },
    faqs: [
      {
        question: 'Which Node.js version do I need?',
        answer: 'Node.js 18 or later has fetch built in. On older versions, use any HTTP client, or Nodemailer over SMTP.',
      },
      ...sharedFaqs,
    ],
  },
  {
    slug: 'python',
    name: 'Python',
    intro: 'Send with requests, httpx or the standard library’s smtplib. Works in Flask, FastAPI, scripts and background workers.',
    primary: 'api',
    api: {
      intro: 'One POST request. Any HTTP client works the same way; this uses requests.',
      title: 'send.py',
      code: pythonRequests,
    },
    smtp: {
      intro: 'No dependencies at all: the standard library can send over SMTP.',
      title: 'send_smtp.py',
      code: `import os
import smtplib
from email.message import EmailMessage

message = EmailMessage()
message["From"] = "Acme <hello@acme.com>"
message["To"] = "ana@acme.com"
message["Subject"] = "Welcome to Acme"
message.set_content("Thanks for signing up.")
message.add_alternative("<p>Thanks for signing up.</p>", subtype="html")

with smtplib.SMTP("smtp.useplunk.com", 587) as smtp:
    smtp.starttls()
    smtp.login("plunk", os.environ["PLUNK_SECRET_KEY"])
    smtp.send_message(message)`,
    },
    faqs: [
      {
        question: 'Does it work with FastAPI and async code?',
        answer: 'Yes. Use httpx.AsyncClient with the same URL, headers and JSON body, and await the post call.',
      },
      ...sharedFaqs,
    ],
  },
  {
    slug: 'django',
    name: 'Django',
    intro: 'Point Django’s email backend at Plunk and send_mail, password resets and every other built-in email go through it.',
    primary: 'smtp',
    smtp: {
      intro: 'Set the SMTP backend in settings. Django’s own emails, like password resets, use it with no other changes.',
      title: 'settings.py',
      code: `import os

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.useplunk.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "plunk"
EMAIL_HOST_PASSWORD = os.environ["PLUNK_SECRET_KEY"]
DEFAULT_FROM_EMAIL = "Acme <hello@acme.com>"

# Anywhere in your app:
# from django.core.mail import send_mail
# send_mail("Welcome to Acme", "Thanks for signing up.", None, ["ana@acme.com"])`,
    },
    api: {
      intro: 'Use the API when you want Plunk templates or want the send to start a workflow.',
      title: 'emails.py',
      code: pythonRequests,
    },
    faqs: [
      {
        question: 'Will Django password reset emails use Plunk?',
        answer: 'Yes. Once EMAIL_BACKEND points at Plunk’s SMTP server, every email Django sends goes through Plunk, including password resets.',
      },
      ...sharedFaqs,
    ],
  },
  {
    slug: 'laravel',
    name: 'Laravel',
    intro: 'Set Laravel’s SMTP mailer to Plunk in .env and your Mailables, notifications and password resets send through it.',
    primary: 'smtp',
    smtp: {
      intro: 'Laravel’s SMTP mailer needs only these values. Port 587 negotiates TLS automatically.',
      title: '.env',
      code: `MAIL_MAILER=smtp
MAIL_HOST=smtp.useplunk.com
MAIL_PORT=587
MAIL_USERNAME=plunk
MAIL_PASSWORD=your_plunk_secret_key
MAIL_FROM_ADDRESS=hello@acme.com
MAIL_FROM_NAME="Acme"`,
    },
    api: {
      intro: 'Use the API with Laravel’s HTTP client when you want Plunk templates or workflows.',
      title: 'app/Services/Plunk.php',
      code: `use Illuminate\\Support\\Facades\\Http;

Http::withToken(config('services.plunk.secret'))
    ->post('${ENDPOINT}', [
        'to' => 'ana@acme.com',
        'subject' => 'Welcome to Acme',
        'body' => '<p>Thanks for signing up.</p>',
    ])
    ->throw();`,
    },
    faqs: [
      {
        question: 'Do Laravel notifications work with Plunk?',
        answer: 'Yes. Mail notifications use the default mailer, so once it points at Plunk they send through Plunk with no code changes.',
      },
      ...sharedFaqs,
    ],
  },
  {
    slug: 'rails',
    name: 'Ruby on Rails',
    intro: 'Configure Action Mailer for SMTP and every mailer in your app sends through Plunk.',
    primary: 'smtp',
    smtp: {
      intro: 'Add the SMTP settings to your production environment. Your mailers stay exactly as they are.',
      title: 'config/environments/production.rb',
      code: `config.action_mailer.delivery_method = :smtp
config.action_mailer.smtp_settings = {
  address: "smtp.useplunk.com",
  port: 587,
  user_name: "plunk",
  password: ENV["PLUNK_SECRET_KEY"],
  authentication: :plain,
  enable_starttls_auto: true
}`,
    },
    api: {
      intro: 'Use the API from Ruby’s standard library when you want Plunk templates or workflows.',
      title: 'app/services/plunk.rb',
      code: `require "net/http"
require "json"

uri = URI("${ENDPOINT}")
request = Net::HTTP::Post.new(
  uri,
  "Content-Type" => "application/json",
  "Authorization" => "Bearer #{ENV["PLUNK_SECRET_KEY"]}"
)
request.body = {
  to: "ana@acme.com",
  subject: "Welcome to Acme",
  body: "<p>Thanks for signing up.</p>"
}.to_json

response = Net::HTTP.start(uri.host, uri.port, use_ssl: true) { |http| http.request(request) }
raise "Plunk returned #{response.code}" unless response.is_a?(Net::HTTPSuccess)`,
    },
    faqs: [
      {
        question: 'Does Devise use Plunk once Action Mailer is configured?',
        answer: 'Yes. Devise sends through Action Mailer, so confirmation and password reset emails go through Plunk too.',
      },
      ...sharedFaqs,
    ],
  },
  {
    slug: 'go',
    name: 'Go',
    intro: 'Send with net/http, or with net/smtp from the standard library. No modules to add.',
    primary: 'api',
    api: {
      intro: 'One POST request with the standard library.',
      title: 'send.go',
      code: `payload, err := json.Marshal(map[string]string{
	"to":      "ana@acme.com",
	"subject": "Welcome to Acme",
	"body":    "<p>Thanks for signing up.</p>",
})
if err != nil {
	return err
}

req, err := http.NewRequest("POST", "${ENDPOINT}", bytes.NewReader(payload))
if err != nil {
	return err
}
req.Header.Set("Content-Type", "application/json")
req.Header.Set("Authorization", "Bearer "+os.Getenv("PLUNK_SECRET_KEY"))

resp, err := http.DefaultClient.Do(req)
if err != nil {
	return err
}
defer resp.Body.Close()

if resp.StatusCode >= 300 {
	return fmt.Errorf("plunk returned %d", resp.StatusCode)
}`,
    },
    smtp: {
      intro: 'net/smtp upgrades to TLS on port 587 automatically.',
      title: 'send_smtp.go',
      code: `auth := smtp.PlainAuth("", "plunk", os.Getenv("PLUNK_SECRET_KEY"), "smtp.useplunk.com")

message := []byte("From: Acme <hello@acme.com>\\r\\n" +
	"To: ana@acme.com\\r\\n" +
	"Subject: Welcome to Acme\\r\\n" +
	"Content-Type: text/html; charset=UTF-8\\r\\n\\r\\n" +
	"<p>Thanks for signing up.</p>")

err := smtp.SendMail("smtp.useplunk.com:587", auth, "hello@acme.com", []string{"ana@acme.com"}, message)`,
    },
    faqs: sharedFaqs,
  },
  {
    slug: 'supabase',
    name: 'Supabase',
    intro: 'Use Plunk as Supabase Auth’s SMTP server for sign-up and magic link emails, and call the API from Edge Functions for everything else.',
    primary: 'smtp',
    smtp: {
      intro: 'In the Supabase dashboard, open Authentication, then the SMTP settings, enable custom SMTP and enter these values.',
      title: 'Supabase Auth SMTP settings',
      code: `Host:          smtp.useplunk.com
Port:          587
Username:      plunk
Password:      your Plunk secret key
Sender email:  hello@acme.com
Sender name:   Acme`,
    },
    api: {
      intro: 'Send from an Edge Function with fetch. Store the key with supabase secrets set PLUNK_SECRET_KEY=...',
      title: 'supabase/functions/welcome/index.ts',
      code: `Deno.serve(async request => {
  const {email} = await request.json();

  const response = await fetch('${ENDPOINT}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${Deno.env.get('PLUNK_SECRET_KEY')}\`,
    },
    body: JSON.stringify({
      to: email,
      subject: 'Welcome to Acme',
      body: '<p>Thanks for signing up.</p>',
    }),
  });

  return new Response(null, {status: response.ok ? 204 : 502});
});`,
    },
    faqs: [
      {
        question: 'Why use custom SMTP for Supabase Auth?',
        answer:
          'Supabase’s built-in email service is meant for development and has low rate limits. A custom SMTP server like Plunk sends your sign-up, magic link and password reset emails from your own domain, without those limits.',
      },
      ...sharedFaqs,
    ],
  },
];

export function getFramework(slug: string): Framework | undefined {
  return FRAMEWORKS.find(framework => framework.slug === slug);
}
