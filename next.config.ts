import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Avoid bundling stripe-node into the server graph in ways that run during build analysis.
  serverExternalPackages: ['stripe'],
}

export default nextConfig
