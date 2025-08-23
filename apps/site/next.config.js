/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  i18n: {
    locales: ['ja', 'en'],
    defaultLocale: 'ja',
  },
}

module.exports = nextConfig