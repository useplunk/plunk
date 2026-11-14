import type { NextApiRequest, NextApiResponse } from 'next';

import { MARKDOWN_PAGES } from '../../content/pages';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const pathname = req.headers['x-md-path'];
  if (typeof pathname !== 'string') {
    res.status(406).end();
    return;
  }

  const slug = pathname.replace(/^\/+|\/+$/g, '') || 'index';

  res.setHeader('Vary', 'Accept');

  const content = MARKDOWN_PAGES[slug];
  if (!content) {
    res.status(404).end();
    return;
  }

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.status(200).send(content);
}
