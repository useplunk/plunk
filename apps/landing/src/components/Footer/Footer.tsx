import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {WIKI_URI} from '../../lib/constants';
import logo from '../../../public/assets/logo.svg';

/**
 *
 */
export default function Footer() {
  const router = useRouter();
  const path = (router.asPath || '/').split(/[?#]/)[0] ?? '/';
  const trimmed = path === '/' ? '/' : path.replace(/\/$/, '');
  const mdHref = `${trimmed}.md`;
  return (
    <>
      <footer className={'border-t border-neutral-200 bg-white'}>
        <div className="mx-auto max-w-[88rem] px-6 py-20 sm:px-10">
          <div className="grid gap-12 lg:grid-cols-12">
            {/* Logo and description */}
            <div className="space-y-6 lg:col-span-3">
              <div className={'relative h-8 w-8'}>
                <Image src={logo} alt={'Plunk logo'} fill className={'object-contain'} />
              </div>
              <p className="text-ui leading-relaxed text-neutral-600">
                Open-source email platform for transactional, marketing, and automation. EU-hosted, GDPR compliant.
              </p>
              <div className="flex items-center gap-4">
                <Link
                  href="https://twitter.com/useplunk"
                  target={'_blank'}
                  className="text-neutral-500 transition hover:text-neutral-900"
                >
                  <span className="sr-only">Twitter</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </Link>

                <Link
                  href="https://github.com/useplunk"
                  target={'_blank'}
                  className="text-neutral-500 transition hover:text-neutral-900"
                >
                  <span className="sr-only">GitHub</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>

                <Link href="/discord" target={'_blank'} className="text-neutral-500 transition hover:text-neutral-900">
                  <span className="sr-only">Discord</span>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 gap-8 lg:col-span-9 lg:grid-cols-5">
              <div>
                <h3 style={{fontFamily: 'var(--font-mono)'}} className="text-label font-semibold text-neutral-500">Product</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href={'/pricing'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link href={WIKI_URI} target={'_blank'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Documentation
                    </Link>
                  </li>
                  <li>
                    <Link href={'/guides'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Guides
                    </Link>
                  </li>
                  <li>
                    <Link href={'/tools'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Tools
                    </Link>
                  </li>
                  <li>
                    <Link href={'/made-by-humans'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Made by humans
                    </Link>
                  </li>
                </ul>

                <h3 style={{fontFamily: 'var(--font-mono)'}} className="mt-8 text-label font-semibold text-neutral-500">Checkers</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href={'/tools/spf-checker'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      SPF checker
                    </Link>
                  </li>
                  <li>
                    <Link href={'/tools/dmarc-checker'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      DMARC checker
                    </Link>
                  </li>
                  <li>
                    <Link href={'/tools/dkim-checker'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      DKIM checker
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 style={{fontFamily: 'var(--font-mono)'}} className="text-label font-semibold text-neutral-500">Features</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href={'/features/email-editor'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Email editor
                    </Link>
                  </li>
                  <li>
                    <Link href={'/features/workflows'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Workflows
                    </Link>
                  </li>
                  <li>
                    <Link href={'/features/segments'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Segments
                    </Link>
                  </li>
                  <li>
                    <Link href={'/features/smtp'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      SMTP
                    </Link>
                  </li>
                  <li>
                    <Link href={'/features/inbound-email'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Inbound email
                    </Link>
                  </li>
                  <li>
                    <Link href={'/features/mcp'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      MCP server
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 style={{fontFamily: 'var(--font-mono)'}} className="text-label font-semibold text-neutral-500">Compare</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href={'/vs'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      All comparisons
                    </Link>
                  </li>
                  <li>
                    <Link href={'/vs/mailchimp'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      vs Mailchimp
                    </Link>
                  </li>
                  <li>
                    <Link href={'/vs/sendgrid'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      vs SendGrid
                    </Link>
                  </li>
                  <li>
                    <Link href={'/vs/resend'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      vs Resend
                    </Link>
                  </li>
                  <li>
                    <Link href={'/vs/brevo'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      vs Brevo
                    </Link>
                  </li>
                  <li>
                    <Link href={'/vs/mailgun'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      vs Mailgun
                    </Link>
                  </li>
                  <li>
                    <Link href={'/vs/convertkit'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      vs ConvertKit
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 style={{fontFamily: 'var(--font-mono)'}} className="text-label font-semibold text-neutral-500">Community</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href={'/discord'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Discord
                    </Link>
                  </li>
                  <li>
                    <Link href={'https://github.com/useplunk'} target={'_blank'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      GitHub
                    </Link>
                  </li>
                  <li>
                    <Link href={'https://status.useplunk.com'} target={'_blank'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Status
                    </Link>
                  </li>
                </ul>

                <h3 style={{fontFamily: 'var(--font-mono)'}} className="mt-8 text-label font-semibold text-neutral-500">Legal</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href={'/privacy'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link href={'/terms'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Terms
                    </Link>
                  </li>
                  <li>
                    <Link href={'/dpa'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      DPA
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 style={{fontFamily: 'var(--font-mono)'}} className="text-label font-semibold text-neutral-500">Guides</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li>
                    <Link href={'/guides/email-deliverability'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Email deliverability
                    </Link>
                  </li>
                  <li>
                    <Link href={'/guides/transactional-vs-marketing-email'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Transactional vs marketing
                    </Link>
                  </li>
                  <li>
                    <Link href={'/guides/what-is-dkim'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      What is DKIM?
                    </Link>
                  </li>
                  <li>
                    <Link href={'/guides/what-is-spf'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      What is SPF?
                    </Link>
                  </li>
                  <li>
                    <Link href={'/guides/what-is-dmarc'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      What is DMARC?
                    </Link>
                  </li>
                  <li>
                    <Link href={'/guides/email-open-rate'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Email open rates
                    </Link>
                  </li>
                  <li>
                    <Link href={'/guides/email-bounce-rate'} className="text-ui text-neutral-600 transition hover:text-neutral-900">
                      Email bounce rates
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col gap-2 border-t border-neutral-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-ui text-neutral-500">&copy; {new Date().getFullYear()} Plunk. All rights reserved.</p>
            <p style={{fontFamily: 'var(--font-mono)'}} className="text-[11px] text-neutral-500">
              Reading this with electronic eyes? Append{' '}
              <a href={mdHref} className="text-neutral-500 underline decoration-dotted underline-offset-2 transition hover:text-neutral-900">
                <code>.md</code>
              </a>{' '}
              to any URL for the Markdown cut.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
