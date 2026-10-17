import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { hasMarkdownVariant } from './content/markdown-slugs';
import { LANDING_URI } from './lib/constants';

// Self-hosted installs serve this same site under their own domain. Only the official
// deployment may be indexed, otherwise every install competes with useplunk.com in search.
// Compared by hostname on purpose: the full-URL placeholder is rewritten at container startup.
const OFFICIAL_HOSTNAMES = new Set(['www.useplunk.com', 'useplunk.com']);
const INDEXABLE = OFFICIAL_HOSTNAMES.has(new URL(LANDING_URI).hostname);

function withRobots(response: NextResponse, noindex = false): NextResponse {
  if (noindex || !INDEXABLE) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

type Negotiated = 'markdown' | 'html' | 'none';

function parseAccept(accept: string): Array<{ type: string; q: number }> {
  return accept.split(',').map(part => {
    const segments = part.trim().split(';');
    const type = segments[0]?.trim().toLowerCase() ?? '';
    const qParam = segments.slice(1).find(s => s.trim().startsWith('q='));
    const q = qParam ? parseFloat(qParam.split('=')[1] ?? '1') : 1;
    return { type, q: isNaN(q) ? 1 : q };
  });
}

function getQ(types: Array<{ type: string; q: number }>, target: string): number {
  const exact = types.find(t => t.type === target);
  if (exact) return exact.q;
  const [main] = target.split('/');
  const sub = types.find(t => t.type === `${main}/*`);
  if (sub) return sub.q;
  const wildcard = types.find(t => t.type === '*/*');
  return wildcard ? wildcard.q : -1;
}

function negotiate(accept: string): Negotiated {
  if (!accept) return 'html';
  const types = parseAccept(accept);
  const mdQ = types.find(t => t.type === 'text/markdown')?.q ?? -1;
  const htmlQ = getQ(types, 'text/html');
  if (mdQ <= 0 && htmlQ <= 0) return 'none';
  if (mdQ > 0 && mdQ >= htmlQ) return 'markdown';
  return 'html';
}

export function middleware(request: NextRequest) {
  const accept = request.headers.get('accept') ?? '';
  const { pathname } = request.nextUrl;

  if (pathname.endsWith('.md')) {
    const headers = new Headers(request.headers);
    headers.set('x-md-path', pathname.slice(0, -3));
    // Markdown mirrors are for agents; keep them out of the index so they don't duplicate the HTML page
    return withRobots(NextResponse.rewrite(new URL('/api/md', request.url), { request: { headers } }), true);
  }

  const result = negotiate(accept);

  if (result === 'none') {
    return withRobots(new NextResponse(null, { status: 406, headers: { 'Vary': 'Accept' } }));
  }

  if (result === 'markdown') {
    const headers = new Headers(request.headers);
    headers.set('x-md-path', pathname);
    const response = NextResponse.rewrite(new URL('/api/md', request.url), { request: { headers } });
    response.headers.set('Vary', 'Accept');
    return withRobots(response, true);
  }

  const response = NextResponse.next();
  response.headers.set('Vary', 'Accept');
  if (hasMarkdownVariant(pathname)) {
    response.headers.append('Link', `<${pathname}.md>; rel="alternate"; type="text/markdown"`);
  }
  return withRobots(response);
}

export const config = {
  matcher: ['/((?!api|_next|favicon\\.ico|assets|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|css|js|xml|txt|webmanifest)).*)',],
};
