/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ensure server runs on all interfaces
  experimental: {
    serverActions: {
      allowedOrigins: ['*']
    }
  },
  // Add logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

module.exports = nextConfig
