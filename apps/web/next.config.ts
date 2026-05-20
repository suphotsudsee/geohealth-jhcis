import path from 'node:path'
import type { NextConfig } from 'next'

const defaultDevOrigins = ['192.168.1.82', '192.168.1.196']
const allowedDevOrigins =
  process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? defaultDevOrigins

const nextConfig: NextConfig = {
  allowedDevOrigins,
  experimental: {
    serverActions: { bodySizeLimit: '10mb' },
  },
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'minio', port: '9000' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
