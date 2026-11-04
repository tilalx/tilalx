import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  agentRules: false,
  devIndicators: false,
  outputFileTracingIncludes: {
    '/': [
      './app/**/*', './public/**/*', './.github/**/*',
      './.dockerignore', './.gitignore', './.yarnrc.yml', './Dockerfile', './Jenkinsfile',
      './next.config.ts', './package.json', './ReadMe.md', './tsconfig.json',
    ],
  },
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
