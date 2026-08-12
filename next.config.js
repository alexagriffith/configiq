/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: [
    "@patternfly/react-core",
    "@patternfly/react-charts",
    "@patternfly/react-icons",
    "@patternfly/react-table",
  ],
  async redirects() {
    return [
      {
        source: '/quick-estimate',
        destination: '/performance',
        permanent: true,
      },
      {
        source: '/performance-estimate',
        destination: '/performance',
        permanent: true,
      },
      {
        source: '/calculator',
        destination: '/recommend',
        permanent: true,
      },
    ]
  },
};

module.exports = nextConfig;
