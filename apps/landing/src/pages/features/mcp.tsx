import {
  AgentExchange,
  Chip,
  CodeBlock,
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureSection,
  Footer,
  Navbar,
  SpecList,
  Surface,
} from '../../components';
import type {Exchange, FAQ, Spec} from '../../components';
import {WIKI_URI} from '../../lib/constants';
import React, {useState} from 'react';
import Head from 'next/head';

/**
 * Was a six-item icon-card grid, identical to the one on three other feature
 * pages. Six equally sized bordered boxes make six things look equally
 * important and equally forgettable; a divided list lets the eye run the column
 * and gives each title somewhere to sit.
 */
const capabilities: Spec[] = [
  {
    title: 'One command to connect',
    description:
      'Install the official @plunk/mcp server, drop in a secret key, and your agent has your whole Plunk project. No SDK, no glue code, no bespoke tool definitions.',
    machine: 'claude mcp add plunk -- npx -y @plunk/mcp',
  },
  {
    title: 'Send transactional email',
    description: 'One-off messages to specific people, from any verified sending domain on your project.',
    machine: 'plunk_send_email',
  },
  {
    title: 'Manage contacts',
    description: 'Create, look up, update, and delete contacts, including custom data and subscription status.',
    machine: 'plunk_create_contact, plunk_get_contact, plunk_update_contact',
  },
  {
    title: 'Draft and send campaigns',
    description: 'Have your agent write a campaign, review it yourself, then send it to a list or segment.',
    machine: 'plunk_create_campaign, plunk_send_campaign',
  },
  {
    title: 'Track events',
    description: 'Fire the events that trigger your workflows, creating the contact on the fly if it does not exist.',
    machine: 'plunk_track_event',
  },
  {
    title: 'Works self-hosted',
    description: 'Point PLUNK_API_URL at your own instance and the same server talks to your infrastructure.',
    machine: 'PLUNK_API_URL=https://api.your-domain.com',
  },
];

/** The hero demo. Same exchange shape the homepage uses. */
const exchange: Exchange = {
  prompt: 'Draft a win-back email for pro users who have gone quiet.',
  calls: [
    {tool: 'plunk_list_segments', result: '4 segments'},
    {tool: 'plunk_list_contacts', args: 'segment: "pro-inactive"', result: '2,431 contacts'},
    {tool: 'plunk_create_campaign', args: '"Win-back, August"', result: 'draft created'},
  ],
  confirm: {
    question: 'Send this campaign to 2,431 people?',
    accept: '1. Yes, send it',
    reject: '2. No, keep it as a draft',
  },
};

const faqs: FAQ[] = [
  {
    question: 'Which clients does the Plunk MCP server work with?',
    answer:
      'Any client that speaks the Model Context Protocol. Claude Code, Claude Desktop and Cursor are the common ones, and the setup is the same npx command or mcp.json block for all of them.',
  },
  {
    question: 'Can an agent send email without asking me?',
    answer:
      'No. Sending a campaign, or an email to more than one recipient, prompts you through your MCP client and reports how many people it would reach. The model cannot supply that confirmation itself.',
  },
  {
    question: 'How do I stop an agent writing to my project at all?',
    answer:
      'Set PLUNK_READ_ONLY=true. The nine mutating tools are then never registered with the client, so they cannot be invoked even by name. The agent is left with six read tools.',
  },
  {
    question: 'Does it work with a self-hosted Plunk instance?',
    answer:
      'Yes. Set PLUNK_API_URL to your own API and the same server talks to your infrastructure instead of Plunk Cloud.',
  },
];

const clients = [
  {
    id: 'claude-code',
    label: 'Claude Code',
    language: 'bash',
    title: 'Terminal',
    code: 'claude mcp add plunk --env PLUNK_API_KEY=sk_your_key -- npx -y @plunk/mcp',
  },
  {
    id: 'claude-desktop',
    label: 'Claude Desktop / Cursor',
    language: 'json',
    title: 'mcp.json',
    code: `{
  "mcpServers": {
    "plunk": {
      "command": "npx",
      "args": ["-y", "@plunk/mcp"],
      "env": {
        "PLUNK_API_KEY": "sk_your_key"
      }
    }
  }
}`,
  },
  {
    id: 'self-hosted',
    label: 'Self-hosted',
    language: 'json',
    title: 'mcp.json',
    code: `{
  "mcpServers": {
    "plunk": {
      "command": "npx",
      "args": ["-y", "@plunk/mcp"],
      "env": {
        "PLUNK_API_KEY": "sk_your_key",
        "PLUNK_API_URL": "https://api.your-domain.com"
      }
    }
  }
}`,
  },
];

const readTools = [
  'plunk_list_contacts',
  'plunk_get_contact',
  'plunk_verify_email',
  'plunk_list_templates',
  'plunk_list_campaigns',
  'plunk_list_segments',
];

const writeTools = [
  'plunk_create_contact',
  'plunk_update_contact',
  'plunk_delete_contact',
  'plunk_send_email',
  'plunk_track_event',
  'plunk_create_template',
  'plunk_create_campaign',
  'plunk_send_campaign',
  'plunk_create_segment',
];

const safety = [
  {
    title: 'Sends ask you first',
    description:
      'Sending a campaign, or an email to more than one recipient, prompts you and tells you how many people will receive it. The confirmation comes from you through your MCP client; the model cannot supply it itself.',
    benefit: 'No surprise sends',
  },
  {
    title: 'Read-only mode is structural',
    description:
      'Set PLUNK_READ_ONLY=true and the mutating tools are never registered with the client. They cannot be invoked, even by name. The agent simply has no way to write.',
    benefit: 'Six read tools, nothing else',
  },
  {
    title: 'Account actions stay out of reach',
    description:
      'Billing, project deletion, and key rotation all require a dashboard session rather than an API key, so no tool can touch them. Use a separate project for anything an agent should never change.',
    benefit: 'Blast radius is one project',
  },
];

export default function MCPFeature() {
  const [activeClient, setActiveClient] = useState(clients[0]!);

  return (
    <>
      <Head>
        <title>MCP Server - Connect Plunk to Claude, Cursor & AI Agents | Plunk</title>
        <meta
          name="description"
          content="The official Plunk MCP server lets Claude, Cursor, and any Model Context Protocol client send email, manage contacts, and run campaigns in your Plunk project. Read-only mode and send confirmations built in."
        />
        <meta property="og:title" content="MCP Server - Plunk for AI Agents | Plunk" />
        <meta
          property="og:description"
          content="Connect Plunk to Claude, Cursor, and any MCP client. 15 tools for email, contacts, campaigns, and segments, with read-only mode and send confirmations built in."
        />
        <meta property="og:image" content="https://www.useplunk.com/api/og?title=MCP+Server&tag=Feature" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:image" content="https://www.useplunk.com/api/og?title=MCP+Server&tag=Feature" />
      </Head>

      <Navbar />

      <main className={'text-neutral-800'}>
        <FeatureHero
          title={
            <>
              Give your agent
              <br />
              an email platform.
            </>
          }
          subtitle={'Fifteen tools for email, contacts, segments and campaigns. Sends still ask you first.'}
          docsHref={`${WIKI_URI}/docs/guides/mcp-server`}
          docsLabel={'MCP docs'}
          artifact={<AgentExchange exchange={exchange} />}
        />

        {/* Capabilities. Was a six-item icon-card grid identical to three other
            feature pages; now the same divided list the segments and workflows
            pages already use. */}
        <FeatureSection
          tone={'muted'}
          title={'What your agent can do'}
          intro={'The same ground the dashboard covers, exposed as tools an MCP client can call.'}
        >
          <SpecList specs={capabilities} />
        </FeatureSection>

        <FeatureSection
          title={'Connected in a minute'}
          intro={'Grab a secret key from Settings, API Keys, then point your client at @plunk/mcp.'}
        >
          <div className={'flex flex-wrap gap-2'}>
            {clients.map(client => {
              const on = client.id === activeClient.id;
              return (
                <button
                  key={client.id}
                  type={'button'}
                  onClick={() => setActiveClient(client)}
                  aria-pressed={on}
                  className={`rounded-full px-4 py-2 text-ui font-semibold transition ${
                    on
                      ? 'bg-neutral-900 text-white'
                      : 'border border-neutral-300 bg-white text-neutral-600 hover:border-neutral-900 hover:text-neutral-900'
                  }`}
                >
                  {client.label}
                </button>
              );
            })}
          </div>

          <div className={'mt-6'}>
            <CodeBlock language={activeClient.language} title={activeClient.title} code={activeClient.code} />
          </div>
        </FeatureSection>

        {/* The permission split. Two columns rather than the six-card grid,
            because the whole point is that the tools fall into exactly two
            groups and one of them can be switched off. */}
        <FeatureSection
          tone={'muted'}
          title={'Fifteen tools, two halves'}
          intro={'Read-only mode registers the first six and nothing else, so an agent can look without touching.'}
        >
          <div className={'grid gap-5 lg:grid-cols-2'}>
            <Surface label={'read'} meta={<Chip>always on</Chip>} bodyClassName={'flex flex-wrap gap-2 p-5'}>
              {readTools.map(tool => (
                <span
                  key={tool}
                  className={
                    'rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 font-code text-[0.6875rem] text-neutral-700'
                  }
                >
                  {tool}
                </span>
              ))}
            </Surface>

            <Surface
              label={'write'}
              meta={<Chip>off in read-only mode</Chip>}
              bodyClassName={'flex flex-wrap gap-2 p-5'}
            >
              {writeTools.map(tool => (
                <span
                  key={tool}
                  className={
                    'rounded-full border border-neutral-200 bg-white px-3 py-1.5 font-code text-[0.6875rem] text-neutral-700'
                  }
                >
                  {tool}
                </span>
              ))}
            </Surface>
          </div>
        </FeatureSection>

        {/* Safety. Was a hand-rolled divided list duplicating SpecList. */}
        <FeatureSection title={'What an agent cannot do'}>
          <SpecList
            specs={safety.map(item => ({
              title: item.title,
              description: item.description,
              machine: item.benefit,
            }))}
          />
        </FeatureSection>

        <FAQSection faqs={faqs} schemaId={'faq-mcp'} />

        <FeatureCTA
          title={'Let your agent run your email.'}
          secondary={{href: `${WIKI_URI}/docs/guides/mcp-server`, label: 'Read the docs', external: true}}
        />
      </main>

      <Footer />
    </>
  );
}
