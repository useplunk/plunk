export const MARKDOWN_PAGES: Record<string, string> = {
  index: `# Plunk — The Open-Source Email Platform

Transactional emails, marketing campaigns, and workflow automation — in one platform.
Self-hostable, $0.001 per email, no contact limits.

[Get started free](https://next-app.useplunk.com/auth/signup) | [Read the docs](https://docs.useplunk.com)

---

## Key facts

| Metric | Value |
|--------|-------|
| Price | $0.001 / email |
| GitHub stars | 5,000+ |
| Contacts | Unlimited, always free |
| Setup time | < 5 minutes |
| License | AGPL-3.0 |

---

## Replace your email stack

One tool in place of Resend, SendGrid, Mailchimp, Customer.io, and Mailgun.

- [Plunk vs Resend](/vs/resend)
- [Plunk vs SendGrid](/vs/sendgrid)
- [Plunk vs Mailchimp](/vs/mailchimp)
- [Plunk vs Customer.io](/vs/customerio)
- [Plunk vs Mailgun](/vs/mailgun)

---

## Why Plunk

### Setup — < 5 min
Most email platforms take days to configure. Plunk is running in under five minutes — domain, DKIM, and first send included.

### Pricing — 0 limits
Other platforms charge more as your list grows. Plunk stores unlimited contacts for free and bills only on send.

### Ownership — AGPL-3.0
Closed-source platforms own your stack. Plunk is fully inspectable, forkable, and self-hostable on your own infra.

---

## Features

### Workflow Automation
Visual builder for complex email sequences with triggers, delays, and conditional logic. No code required.

### Dynamic Segments
Real-time audience segmentation based on contact data and behavior.

### Campaign Management
Broadcast emails with scheduling and performance tracking.

### Analytics
Detailed metrics on opens, clicks, bounces, and conversions across campaigns.

### Inbound Email
Receive and process incoming emails with webhook notifications.

### Custom Domains
Brand consistency with DKIM authentication and custom sending domains.

---

## Data model

Every interaction flows into a single contact record — transactional, campaign, and workflow events unified in one source of truth.

- **Transactional** — Receipts, password resets, event-driven sends
- **Campaigns** — Newsletters, product launches, announcements
- **Workflows** — Onboarding sequences, drip campaigns

---

## Open source

- **License**: AGPL-3.0
- **Hosting**: EU-hosted, GDPR compliant
- **Deployment**: Self-hostable via Docker Compose
- **Community**: 5,000+ GitHub stars

[View on GitHub](https://github.com/useplunk/plunk)

---

## Pricing comparison

**Plunk: $0.001 / email**

| Provider | Price / email |
|----------|--------------|
| Plunk | $0.001 |
| Mailgun | $0.003 |
| SendGrid | $0.002 |
| Mailchimp | $0.004 |

*Based on plans matching Plunk at 10,000 emails per month.*

[Full pricing details](/pricing)

---

## Testimonials

> "Transparent and intuitive UI, extremely easy setup & automation and great support."
> — Artur Czemiel, Founder at GraphQL Editor

> "I've been using Plunk for building & sending out marketing emails and genuinely love it!"
> — Joe Ashwell, Founder at UnwindHR

> "I loved the ease of use, beautiful UI and great UX. Everything simply works."
> — Alisson Leal, Founder at Brapi

> "Clean design, easy to understand, fair pricing."
> — Pierre Jacquel, Founder at Landingly

> "Simple to use, efficient and no regrets!"
> — Noah Di Gesu, Founder at Smoothey

> "Lots of care put into Plunk"
> — Jonni Lundy, Founding Operations Manager at Resend

---

## FAQ

**How is Plunk different from other email automation tools?**
Plunk is built for SaaS businesses, indie hackers, and developers. Create complex automated email flows and trigger them from anywhere through a single API call.

**Can I use Plunk for transactional emails?**
Yes. Plunk handles transactional emails — sign-ups, cancellations, plan changes — alongside marketing emails in the same platform.

**Can I use Plunk for newsletters?**
Yes. Plunk lets you send newsletters and broadcast emails to your full list or any segment.

**What programming languages does Plunk support?**
Any language capable of HTTP requests. Plunk provides a REST API plus SDKs for Node.js, Python, and more.

**How much does Plunk cost?**
Free plan includes 1,000 emails/month. Paid plan is $0.001 per email with no contact limits.

---

Start sending in 5 minutes. Free plan available. No contact limits, no surprises.

[Create free account](https://next-app.useplunk.com/auth/signup) | [Read the docs](https://docs.useplunk.com)
`,

  pricing: `# Plunk Pricing — Simple, Transparent

Free plan: 1,000 emails/month. Paid plan: $0.001/email. Unlimited contacts, no hidden fees.

---

## Plans

### Free forever

**1,000 emails / month** — No credit card required

Includes:
- Transactional emails
- Workflow automation
- Campaign broadcasts
- Custom domains
- Click & open tracking
- Unlimited contacts
- Plunk branding on emails (removed on paid)

[Start for free](https://next-app.useplunk.com/auth/signup)

---

### Pay as you grow

**$0.001 / email** — No base fee

Includes everything in Free, plus:
- No Plunk branding
- Monthly spend cap
- Unlimited emails

[Get started](https://next-app.useplunk.com/auth/signup)

---

## Every feature, every plan

No feature tiers, no add-ons, no surprises.

| Feature | Description |
|---------|-------------|
| Transactional emails | API and SMTP delivery for receipts, password resets, and event-driven email. |
| Workflow automation | Event-triggered sequences with delays, conditions, and branching logic. |
| Campaign broadcasts | Send newsletters and announcements to your full list or a targeted segment. |
| Unlimited contacts | Store as many contacts as you need. Growing your list never costs more. |
| Full API access | REST API with SDKs for Node.js, Python, and more. |
| Custom domains | Send from your own domain with DKIM, SPF, and DMARC set up automatically. |
| Audience segmentation | Dynamic segments built on behavior, attributes, and engagement data. |
| Analytics & tracking | Opens, clicks, bounces, and unsubscribes. Real data, no guessing. |
| Open source | AGPL-3.0 licensed. Inspect the code, self-host it, or contribute. |

---

## Self-host for free

Run Plunk on your own infrastructure — full data ownership, no per-email costs, GDPR compliance by default.
Deploy with Docker Compose in minutes.

[View on GitHub](https://github.com/useplunk/plunk)

---

Start sending in 5 minutes. Free plan, no credit card required.

[Create free account](https://next-app.useplunk.com/auth/signup) | [Self-host for free](https://github.com/useplunk/plunk)
`,

  'features/workflows': `# Workflow Automation — Plunk

Visual builder for complex email sequences with triggers, delays, and conditional logic. No code required.

[Get started free](https://next-app.useplunk.com/auth/signup) | [Documentation](https://docs.useplunk.com)

---

## What are workflows?

Workflows are automated email sequences that trigger based on events in your application. Define who receives emails, when they receive them, and what conditions must be met — all without writing code.

## Key capabilities

- **Event-triggered**: Start workflows from any API event
- **Delays**: Wait minutes, hours, or days between steps
- **Conditional branching**: Branch paths based on contact data or behavior
- **Visual builder**: Drag-and-drop interface, no code required
- **Unlimited steps**: As complex as your use case demands

## Use cases

- **Onboarding sequences**: Welcome new users and guide them to activation
- **Drip campaigns**: Nurture leads over time with educational content
- **Re-engagement**: Win back inactive contacts automatically
- **Lifecycle emails**: Upgrades, renewals, cancellations

[Back to features](/features) | [Pricing](/pricing)
`,

  'features/segments': `# Dynamic Segments — Plunk

Real-time audience segmentation based on contact data and behavior.

[Get started free](https://next-app.useplunk.com/auth/signup)

---

## What are segments?

Segments are dynamic groups of contacts that update automatically as contact data changes. Target campaigns and workflows to exactly the right audience without manual list management.

## Capabilities

- **Attribute-based**: Filter by any contact property
- **Behavior-based**: Segment by email opens, clicks, and engagement
- **Real-time**: Segments update instantly as contact data changes
- **Combinable**: AND/OR logic for complex targeting
- **Unlimited contacts**: No per-segment contact limits

[Back to features](/features) | [Pricing](/pricing)
`,

  'features/inbound-email': `# Inbound Email — Plunk

Receive and process incoming emails with webhook notifications.

[Get started free](https://next-app.useplunk.com/auth/signup)

---

## What is inbound email?

Inbound email lets your application receive emails sent to your Plunk domain. When a message arrives, Plunk parses it and delivers the content to your webhook endpoint in real time.

## Capabilities

- **Webhook delivery**: Parsed email payload posted to your endpoint
- **Attachment handling**: Access attachments programmatically
- **Custom addresses**: Route different addresses to different webhooks
- **Reply detection**: Track email threads automatically

[Back to features](/features) | [Pricing](/pricing)
`,

  'features/email-editor': `# Email Editor — Plunk

Design beautiful emails with a drag-and-drop builder or write in Markdown.

[Get started free](https://next-app.useplunk.com/auth/signup)

---

## What is the email editor?

Plunk's email editor lets you build professional emails without writing HTML. Choose from the visual drag-and-drop builder or write in Markdown — both export to responsive HTML email.

## Capabilities

- **Drag-and-drop builder**: Compose layouts with blocks and columns
- **Markdown mode**: Write in plain text, render as rich email
- **Responsive**: Emails adapt to any screen size automatically
- **Preview**: See how your email looks on desktop and mobile
- **Reusable templates**: Save and reuse your designs

[Back to features](/features) | [Pricing](/pricing)
`,

  'features/smtp': `# SMTP — Plunk

Send emails through Plunk using standard SMTP — no API changes required.

[Get started free](https://next-app.useplunk.com/auth/signup)

---

## SMTP access

Plunk provides SMTP credentials so you can send emails from any application or framework that supports standard SMTP. Drop in your Plunk credentials and start sending immediately — no code changes needed beyond configuration.

## Details

- **Host**: SMTP endpoint provided in your dashboard
- **Port**: 587 (TLS) or 465 (SSL)
- **Authentication**: Username and password from your Plunk project
- **Compatible with**: Any language, framework, or tool that supports SMTP

[Back to features](/features) | [Pricing](/pricing) | [Documentation](https://docs.useplunk.com)
`,

  'features/mcp': `# MCP Server — Plunk

Connect Plunk to Claude, Cursor, and any Model Context Protocol client. Fifteen tools for transactional email, contacts, segments, and campaigns.

[Get started free](https://next-app.useplunk.com/auth/signup) | [Documentation](https://docs.useplunk.com/guides/mcp-server)

---

## Setup

The server is published as \`@plunk/mcp\`. You need a secret key (\`sk_…\`) from Settings → API Keys.

\`\`\`bash
claude mcp add plunk --env PLUNK_API_KEY=sk_your_key -- npx -y @plunk/mcp
\`\`\`

For Claude Desktop, Cursor, or any other client, add it to your MCP config:

\`\`\`json
{
  "mcpServers": {
    "plunk": {
      "command": "npx",
      "args": ["-y", "@plunk/mcp"],
      "env": {
        "PLUNK_API_KEY": "sk_your_key"
      }
    }
  }
}
\`\`\`

Self-hosting? Set \`PLUNK_API_URL\` to your own API domain.

## Tools

**Read-only** — the only tools registered when \`PLUNK_READ_ONLY=true\`: \`plunk_list_contacts\`, \`plunk_get_contact\`, \`plunk_verify_email\`, \`plunk_list_templates\`, \`plunk_list_campaigns\`, \`plunk_list_segments\`

**Writing**: \`plunk_create_contact\`, \`plunk_update_contact\`, \`plunk_delete_contact\`, \`plunk_send_email\`, \`plunk_track_event\`, \`plunk_create_template\`, \`plunk_create_campaign\`, \`plunk_send_campaign\`, \`plunk_create_segment\`

## Safety

- **Sends ask you first.** Sending a campaign, or an email to more than one recipient, prompts you and shows the recipient count. The confirmation comes from you through your MCP client, not from the model.
- **Read-only mode is structural.** With \`PLUNK_READ_ONLY=true\` the mutating tools are never registered, so they cannot be invoked at all.
- **Account actions are out of reach.** Billing, project deletion, and key rotation require a dashboard session, so no tool can touch them.

[Back to features](/features) | [Pricing](/pricing) | [Documentation](https://docs.useplunk.com/guides/mcp-server)
`,
};

export {MARKDOWN_SLUGS, hasMarkdownVariant} from './markdown-slugs';
