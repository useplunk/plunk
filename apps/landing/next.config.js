/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ['@plunk/ui'],
  output: 'standalone', // Optimized for Docker
  async redirects() {
    return [{source: '/discord', destination: 'https://discord.gg/sAPURyakc4', permanent: false}];
  },
};
