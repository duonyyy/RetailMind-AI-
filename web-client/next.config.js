/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [{ source: '/500', destination: '/service-error' }];
  },
};

module.exports = nextConfig;
