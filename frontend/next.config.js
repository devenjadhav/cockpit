const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  // Remove standalone for Vercel
  // output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Add logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

const sentryWebpackPluginOptions = {
  silent: true,
  org: "hack-club-x4",
  project: "javascript-nextjs",
};

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
