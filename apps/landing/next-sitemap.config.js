/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_LANDING_URI || 'https://www.useplunk.com',
  generateRobotsTxt: true,
  exclude: ['/discord', '/api/*', '/404'],
  transform: async (config, path) => {
    // Money pages first, legal last; everything else keeps the default
    const priority =
      path === '/'
        ? 1.0
        : path === '/pricing' || path.startsWith('/features') || path.startsWith('/vs')
          ? 0.9
          : ['/terms', '/privacy', '/dpa'].includes(path)
            ? 0.3
            : config.priority;

    return {loc: path, changefreq: config.changefreq, priority, lastmod: config.autoLastmod ? new Date().toISOString() : undefined};
  },
};
