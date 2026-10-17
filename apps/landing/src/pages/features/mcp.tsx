import {
  AgentSnippet,
  CodeBlock,
  FAQSection,
  FeatureCTA,
  FeatureHero,
  FeatureHighlights,
  FeatureSection,
  Footer,
  McpCheckFragment,
  McpConfirmFragment,
  McpTestFragment,
  MoreFeatures,
  Navbar,
  ToolGroups,
} from '../../components';
import type {AgentExchangeCopy, ChecklistItem, Claim, FAQ, ToolGroup} from '../../components';
import {WIKI_URI} from '../../lib/constants';
import React, {useState} from 'react';
import {NextSeo} from 'next-seo';

/**
 * Every tool @plunk/mcp registers, grouped the way the dashboard is. Names drop
 * the plunk_ prefix; the intro says so once rather than the chips repeating it
 * forty-two times. Read and write are kept apart because read-only mode
 * registers the read tools and nothing else.
 */
const toolGroups: ToolGroup[] = [
  {
    title: 'Email',
    description:
      'Send one-off messages from any verified domain, and fire the events that start workflows. The contact is created if it does not exist.',
    read: ['verify_email'],
    write: ['send_email', 'track_event'],
  },
  {
    title: 'Contacts and segments',
    description:
      'Look up, create, update and delete contacts. Subscribe and unsubscribe take an email address, so there is no ID lookup first.',
    read: ['list_contacts', 'get_contact', 'list_segments'],
    write: [
      'create_contact',
      'update_contact',
      'subscribe_contact',
      'unsubscribe_contact',
      'delete_contact',
      'create_segment',
    ],
  },
  {
    title: 'Campaigns and templates',
    description:
      'Write a campaign, send yourself a test copy, release it to a segment and read the stats. Cancelling stops whatever has not gone out.',
    read: ['list_templates', 'list_campaigns', 'get_campaign', 'get_campaign_stats'],
    write: ['create_template', 'create_campaign', 'test_campaign', 'send_campaign', 'cancel_campaign'],
  },
  {
    title: 'Workflows',
    description:
      'Describe a flow and the agent builds it: trigger, emails, delays, yes/no and multi-branch conditions. It checks for errors before you can switch it on, then shows where each contact is.',
    read: [
      'list_workflows',
      'get_workflow',
      'check_workflow',
      'list_workflow_fields',
      'list_workflow_executions',
      'get_workflow_execution',
    ],
    write: [
      'create_workflow',
      'update_workflow',
      'duplicate_workflow',
      'delete_workflow',
      'add_workflow_step',
      'add_workflow_steps',
      'update_workflow_step',
      'delete_workflow_step',
      'connect_workflow_steps',
      'disconnect_workflow_steps',
      'set_workflow_enabled',
      'start_workflow_execution',
      'cancel_workflow_executions',
    ],
  },
  {
    title: 'Domains',
    description:
      'See which sending domains are verified, and re-run the DNS check after you add records.',
    read: ['list_domains', 'check_domain'],
    write: [],
    writeElsewhere: 'Adding and removing domains stays in the dashboard.',
  },
];

/**
 * The hero: a workflow built by an agent, then held until you enable it. The
 * homepage shows a campaign send; this shows the other half of the server, and
 * the same approval gate.
 */
const exchange: AgentExchangeCopy = {
  prompt: 'Welcome new signups, then send tips three days later.',
  result: 'Built “Onboarding”: email, wait 3 days, email. No errors.',
  question: 'Enable “Onboarding”? It emails everyone who signs up.',
  accept: 'Enable',
  reject: 'Keep disabled',
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
      'No. Sending a campaign, or an email to more than one recipient, prompts you through your MCP client and reports how many people it would reach. Enabling a workflow that sends email, or starting one for a contact, asks too. The model cannot supply that confirmation itself.',
  },
  {
    question: 'How do I stop an agent writing to my project at all?',
    answer:
      'Set PLUNK_READ_ONLY=true. The twenty-six mutating tools are then never registered with the client, so they cannot be invoked even by name. The agent is left with sixteen read tools.',
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

/**
 * Only limits the server actually enforces, each shown as the moment it bites.
 */
const guardrails: Claim[] = [
  {
    title: 'Sends ask you first',
    copy: 'Campaigns, multi-recipient emails and workflows that send all prompt you with the number of people affected. The model cannot answer for you.',
    fragment: <McpConfirmFragment />,
  },
  {
    title: 'Broken workflows stay off',
    copy: 'Steps are checked before they are saved, and a workflow that would fail cannot be switched on.',
    fragment: <McpCheckFragment />,
  },
  {
    title: 'Test copies go to your team',
    copy: 'A campaign test can only be sent to members of the project. Any other address is refused.',
    fragment: <McpTestFragment />,
  },
];

const guardrailExtras: ChecklistItem[] = [
  {title: 'Read-only mode', description: 'PLUNK_READ_ONLY=true registers only the sixteen read tools.'},
  {title: 'The account stays put', description: 'Billing, keys and domains need a dashboard session.'},
  {title: 'Self-hosted too', description: 'Point PLUNK_API_URL at your own instance.'},
];

export default function MCPFeature() {
  const [activeClient, setActiveClient] = useState(clients[0]!);

  return (
    <>
      <NextSeo
        title="MCP Server - Connect Plunk to Claude, Cursor & AI Agents | Plunk"
        description="The official Plunk MCP server lets Claude, Cursor, and any MCP client send email, manage contacts, run campaigns, and build workflows in your project."
        canonical="https://www.useplunk.com/features/mcp"
        openGraph={{
          title: 'MCP Server - Plunk for AI Agents | Plunk',
          description:
            'Connect Plunk to Claude, Cursor, and any MCP client. 42 tools for email, contacts, campaigns, segments, and workflows, with read-only mode and send confirmations built in.',
          url: 'https://www.useplunk.com/features/mcp',
          images: [
            {
              url: 'https://www.useplunk.com/api/og?title=MCP+Server&tag=Feature',
              alt: 'Plunk MCP Server',
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
              Give your agent
              <br />
              an email platform.
            </>
          }
          subtitle={'Forty-two tools for email, contacts, segments, campaigns and workflows. Sends still ask you first.'}
          docsHref={`${WIKI_URI}/guides/mcp-server`}
          docsLabel={'MCP docs'}
          artifact={<AgentSnippet copy={exchange} />}
        />

        {/* Capabilities and the read/write split, as one table. These were two
            sections that listed the same tools twice. */}
        <FeatureSection
          title={'What your agent can do'}
          intro={
            'Forty-two tools, grouped the way the dashboard is. Each is prefixed plunk_ in your client. Read-only mode registers the read column and nothing else.'
          }
        >
          <ToolGroups groups={toolGroups} writeNote={'off in read-only mode'} />
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

        <FeatureHighlights
          title={'Guardrails'}
          intro={'A secret key opens the whole project, so the server adds its own limits on top.'}
          claims={guardrails}
          extras={guardrailExtras}
        />

        <FAQSection faqs={faqs} schemaId={'faq-mcp'} />

        <FeatureCTA
          title={'Let your agent run your email.'}
          secondary={{href: `${WIKI_URI}/guides/mcp-server`, label: 'Read the docs', external: true}}
        />

        <MoreFeatures current={'/features/mcp'} />
      </main>

      <Footer />
    </>
  );
}
