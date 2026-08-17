import {CodeBlock, Footer, Navbar} from '../../components';
import {motion} from 'framer-motion';
import {DASHBOARD_URI, WIKI_URI} from '../../lib/constants';
import React, {useState} from 'react';
import Link from 'next/link';
import {ArrowRight, Bot, Eye, Megaphone, Send, ShieldCheck, Terminal, Users, Workflow} from 'lucide-react';
import Head from 'next/head';

const capabilities = [
  {
    icon: <Bot className="h-6 w-6" strokeWidth={1.5} />,
    title: 'One command to connect',
    description:
      'Install the official @plunk/mcp server, drop in a secret key, and your agent has your whole Plunk project. No SDK, no glue code, no bespoke tool definitions.',
    featured: true,
  },
  {
    icon: <Send className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Send transactional email',
    description: 'One-off messages to specific people, from any verified sending domain on your project.',
  },
  {
    icon: <Users className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Manage contacts',
    description: 'Create, look up, update, and delete contacts, including custom data and subscription status.',
  },
  {
    icon: <Megaphone className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Draft and send campaigns',
    description: 'Have your agent write a campaign, review it yourself, then send it to a list or segment.',
  },
  {
    icon: <Workflow className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Track events',
    description: 'Fire the events that trigger your workflows, creating the contact on the fly if it does not exist.',
  },
  {
    icon: <Terminal className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Works self-hosted',
    description: 'Point PLUNK_API_URL at your own instance and the same server talks to your infrastructure.',
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
    icon: <ShieldCheck className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Sends ask you first',
    description:
      'Sending a campaign, or an email to more than one recipient, prompts you and tells you how many people will receive it. The confirmation comes from you through your MCP client; the model cannot supply it itself.',
    benefit: 'No surprise sends',
  },
  {
    icon: <Eye className="h-6 w-6" strokeWidth={1.5} />,
    title: 'Read-only mode is structural',
    description:
      'Set PLUNK_READ_ONLY=true and the mutating tools are never registered with the client. They cannot be invoked, even by name. The agent simply has no way to write.',
    benefit: 'Six read tools, nothing else',
  },
  {
    icon: <Terminal className="h-6 w-6" strokeWidth={1.5} />,
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
        {/* Hero */}
        <section className={'relative overflow-hidden'}>
          <div
            aria-hidden
            className={
              'absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#eeeeee_1px,transparent_1px),linear-gradient(to_bottom,#eeeeee_1px,transparent_1px)] bg-[size:6rem_6rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,#000_40%,transparent_95%)]'
            }
          />
          <div className={'mx-auto max-w-[88rem] px-6 pb-20 pt-20 sm:px-10 sm:pb-28 sm:pt-28'}>
            <motion.div
              initial={{opacity: 0, y: 16}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
            >
              <h1
                style={{fontFamily: 'var(--font-display)'}}
                className={
                  'text-display font-extrabold leading-[0.92] tracking-[-0.04em] text-neutral-900'
                }
              >
                Give your agent
                <br />
                an email platform.
              </h1>
              <p className={'mt-6 max-w-2xl text-lead text-neutral-600'}>
                The official Plunk MCP server plugs Claude, Cursor, and any Model Context Protocol client straight into
                your project: 15 tools for transactional email, contacts, segments, and campaigns. Sends still ask you
                first.
              </p>

              <div className={'mt-10 flex flex-wrap gap-3'}>
                <motion.a
                  whileHover={{scale: 1.015}}
                  whileTap={{scale: 0.985}}
                  href={`${DASHBOARD_URI}/auth/signup`}
                  className={
                    'group inline-flex items-center gap-2 rounded-full bg-neutral-900 px-8 py-4 text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(23,23,23,0.35)] transition hover:bg-neutral-800'
                  }
                >
                  Get your API key
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </motion.a>
                <Link
                  href={`${WIKI_URI}/docs/guides/mcp-server`}
                  target={'_blank'}
                  className={
                    'inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-8 py-4 text-base font-semibold text-neutral-900 transition hover:border-neutral-900'
                  }
                >
                  Read the docs
                </Link>
              </div>

              <div className={'mt-14 max-w-3xl'}>
                <CodeBlock
                  title={'Add Plunk to Claude Code'}
                  language={'bash'}
                  code={'claude mcp add plunk --env PLUNK_API_KEY=sk_your_key -- npx -y @plunk/mcp'}
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Capabilities grid */}
        <section className={'border-t border-neutral-200'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mb-16'}
            >
              <h2
                style={{fontFamily: 'var(--font-display)'}}
                className={
                  'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'
                }
              >
                What your agent can do
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>
                The same platform you use in the dashboard, exposed as tools an agent understands
              </p>
            </motion.div>

            <div className={'grid gap-5 sm:grid-cols-2 lg:grid-cols-3'}>
              {capabilities.map((capability, index) => {
                const highlighted = capability.featured;
                return (
                  <motion.div
                    key={capability.title}
                    initial={{opacity: 0, y: 16}}
                    whileInView={{opacity: 1, y: 0}}
                    viewport={{once: true}}
                    transition={{duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1]}}
                    className={
                      highlighted
                        ? 'flex min-h-[16rem] flex-col justify-between rounded-card border border-neutral-900 bg-neutral-900 p-8 text-white'
                        : 'flex min-h-[16rem] flex-col justify-between rounded-card border border-neutral-200 bg-white p-8 transition hover:border-neutral-900'
                    }
                  >
                    <div className={'flex items-start justify-between'}>
                      <div className={highlighted ? 'text-white' : 'text-neutral-900'}>{capability.icon}</div>
                    </div>
                    <div>
                      <h3
                        style={{fontFamily: 'var(--font-display)'}}
                        className={`mt-8 text-h3 font-bold tracking-[-0.02em] ${highlighted ? 'text-white' : 'text-neutral-900'}`}
                      >
                        {capability.title}
                      </h3>
                      <p
                        className={`mt-2 leading-relaxed ${highlighted ? 'text-neutral-300' : 'text-neutral-600'}`}
                      >
                        {capability.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Setup */}
        <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mb-12'}
            >
              <h2
                style={{fontFamily: 'var(--font-display)'}}
                className={
                  'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'
                }
              >
                Connected in a minute
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>
                Grab a secret key from Settings → API Keys, then point your client at{' '}
                <span style={{fontFamily: 'var(--font-mono)'}} className={'text-neutral-900'}>
                  @plunk/mcp
                </span>
              </p>
            </motion.div>

            <div className={'grid gap-10 lg:grid-cols-12'}>
              <div className={'lg:col-span-4'}>
                <div className={'flex flex-wrap gap-2 lg:flex-col'}>
                  {clients.map(client => {
                    const active = client.id === activeClient.id;
                    return (
                      <button
                        key={client.id}
                        onClick={() => setActiveClient(client)}
                        className={
                          active
                            ? 'rounded-full border border-neutral-900 bg-neutral-900 px-6 py-3 text-left text-ui font-semibold text-white transition lg:rounded-[16px]'
                            : 'rounded-full border border-neutral-200 bg-white px-6 py-3 text-left text-ui font-semibold text-neutral-600 transition hover:border-neutral-900 hover:text-neutral-900 lg:rounded-[16px]'
                        }
                      >
                        {client.label}
                      </button>
                    );
                  })}
                </div>
                <p className={'mt-6 leading-relaxed text-neutral-600'}>
                  Any MCP-compatible client works. These are just the ones most people start with. Self-hosting? Set{' '}
                  <span style={{fontFamily: 'var(--font-mono)'}} className={'text-neutral-900'}>
                    PLUNK_API_URL
                  </span>{' '}
                  to your own API domain.
                </p>
              </div>

              <div className={'min-w-0 lg:col-span-8'}>
                <CodeBlock title={activeClient.title} language={activeClient.language} code={activeClient.code} />
              </div>
            </div>
          </div>
        </section>

        {/* Tools */}
        <section className={'border-t border-neutral-200'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mb-16'}
            >
              <h2
                style={{fontFamily: 'var(--font-display)'}}
                className={
                  'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'
                }
              >
                Fifteen tools
              </h2>
              <p className={'mt-4 text-lead text-neutral-600'}>Six of them read. Nine of them write. You choose which.</p>
            </motion.div>

            <div className={'grid gap-5 lg:grid-cols-2'}>
              <motion.div
                initial={{opacity: 0, y: 16}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.5, ease: [0.22, 1, 0.36, 1]}}
                className={'rounded-card border border-neutral-200 bg-white p-8'}
              >
                <div className={'flex items-start justify-between'}>
                  <Eye className="h-6 w-6 text-neutral-900" strokeWidth={1.5} />
                  <span
                    style={{fontFamily: 'var(--font-mono)'}}
                    className={'text-label text-neutral-500'}
                  >
                    Read-only
                  </span>
                </div>
                <h3
                  style={{fontFamily: 'var(--font-display)'}}
                  className={'mt-8 text-h3 font-bold tracking-[-0.02em] text-neutral-900'}
                >
                  Look, don&apos;t touch
                </h3>
                <p className={'mt-2 leading-relaxed text-neutral-600'}>
                  The only tools registered when{' '}
                  <span style={{fontFamily: 'var(--font-mono)'}} className={'text-neutral-900'}>
                    PLUNK_READ_ONLY=true
                  </span>
                  .
                </p>
                <ul className={'mt-6 flex flex-wrap gap-2'}>
                  {readTools.map(tool => (
                    <li
                      key={tool}
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-700'}
                    >
                      {tool}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{opacity: 0, y: 16}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1]}}
                className={'rounded-card border border-neutral-900 bg-neutral-900 p-8 text-white'}
              >
                <div className={'flex items-start justify-between'}>
                  <Send className="h-6 w-6 text-white" strokeWidth={1.5} />
                  <span
                    style={{fontFamily: 'var(--font-mono)'}}
                    className={'text-label text-neutral-500'}
                  >
                    Writing
                  </span>
                </div>
                <h3
                  style={{fontFamily: 'var(--font-display)'}}
                  className={'mt-8 text-h3 font-bold tracking-[-0.02em] text-white'}
                >
                  Do the work
                </h3>
                <p className={'mt-2 leading-relaxed text-neutral-300'}>
                  Everything that changes your project. Sends are confirmed by you before they go out.
                </p>
                <ul className={'mt-6 flex flex-wrap gap-2'}>
                  {writeTools.map(tool => (
                    <li
                      key={tool}
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200'}
                    >
                      {tool}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Safety */}
        <section className={'border-t border-neutral-200 bg-neutral-50/60'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-24 sm:px-10 sm:py-32'}>
            <motion.div
              initial={{opacity: 0, y: 20}}
              whileInView={{opacity: 1, y: 0}}
              viewport={{once: true}}
              transition={{duration: 0.7, ease: [0.22, 1, 0.36, 1]}}
              className={'mb-16'}
            >
              <h2
                style={{fontFamily: 'var(--font-display)'}}
                className={
                  'text-h2 font-extrabold leading-[0.95] tracking-[-0.03em] text-neutral-900'
                }
              >
                An agent with the keys, not the wheel
              </h2>
              <p className={'mt-4 max-w-2xl text-lead text-neutral-600'}>
                Email goes to real people and cannot be unsent. The server is built around that.
              </p>
            </motion.div>

            <ul className={'divide-y divide-neutral-200 border-y border-neutral-200'}>
              {safety.map((item, index) => (
                <motion.li
                  key={item.title}
                  initial={{opacity: 0, y: 12}}
                  whileInView={{opacity: 1, y: 0}}
                  viewport={{once: true}}
                  transition={{duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1]}}
                  className={'grid grid-cols-12 gap-6 py-10 sm:py-12'}
                >
                  <h3
                    style={{fontFamily: 'var(--font-display)'}}
                    className={'col-span-12 text-h3 font-bold tracking-[-0.02em] text-neutral-900 sm:col-span-4'}
                  >
                    {item.title}
                  </h3>
                  <div className={'col-span-12 sm:col-span-8'}>
                    <p className={'leading-relaxed text-neutral-600'}>{item.description}</p>
                    <span
                      style={{fontFamily: 'var(--font-mono)'}}
                      className={'mt-5 inline-block text-label text-neutral-500'}
                    >
                      → {item.benefit}
                    </span>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className={'relative overflow-hidden border-t border-neutral-900 bg-neutral-900 text-white'}>
          <div className={'mx-auto max-w-[88rem] px-6 py-32 sm:px-10 sm:py-40'}>
            <div className={'flex flex-col items-start gap-12 lg:flex-row lg:items-end lg:justify-between'}>
              <motion.h2
                initial={{opacity: 0, y: 16}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.9, ease: [0.22, 1, 0.36, 1]}}
                style={{fontFamily: 'var(--font-display)'}}
                className={'text-display font-extrabold leading-[0.95] tracking-[-0.035em]'}
              >
                Plug Plunk into your agent.
              </motion.h2>
              <motion.div
                initial={{opacity: 0, y: 16}}
                whileInView={{opacity: 1, y: 0}}
                viewport={{once: true}}
                transition={{duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1]}}
                className={'flex max-w-md flex-col gap-6'}
              >
                <p className={'text-lead text-neutral-300'}>
                  Create a project, copy your secret key, and run one command. Free to start, no credit card required.
                </p>
                <div className={'flex flex-wrap gap-3'}>
                  <motion.a
                    whileHover={{scale: 1.015}}
                    whileTap={{scale: 0.985}}
                    href={`${DASHBOARD_URI}/auth/signup`}
                    className={
                      'inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-ui font-semibold text-neutral-900 transition hover:bg-neutral-100'
                    }
                  >
                    Get started for free
                    <ArrowRight className="h-4 w-4" />
                  </motion.a>
                  <Link
                    href={`${WIKI_URI}/docs/guides/mcp-server`}
                    target={'_blank'}
                    className={
                      'inline-flex items-center gap-2 rounded-full border border-neutral-700 px-7 py-3.5 text-ui font-semibold text-white transition hover:border-white'
                    }
                  >
                    Read the docs
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
