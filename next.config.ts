import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  agentRules: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'private, no-cache' },
        ],
      },
    ]
  },
}

export default nextConfig
