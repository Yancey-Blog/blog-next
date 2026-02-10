import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'beg-bucket.s3.us-east-1.amazonaws.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: 'edge.yancey.app',
        pathname: '/**'
      }
    ],
    unoptimized: true
  }
}

export default nextConfig
