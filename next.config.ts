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
        hostname: 'static.yancey.app',
        pathname: '/**'
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
        pathname: '/**'
      }
    ],
    unoptimized: true
  }
}

export default nextConfig
