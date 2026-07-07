/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ['@plunk/ui', 'react-tweet'],
  output: 'standalone', // Optimized for Docker
};
