import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // @blocknote/server-util pulls in @blocknote/react (which calls
  // React.createContext at module load) and jsdom. In the App Router server
  // runtime React resolves to the RSC-vendored build with no createContext,
  // so it must be loaded as an external Node module (real React) instead of
  // bundled. Used by BlogService.{create,update}Blog to derive HTML on save.
  serverExternalPackages: ['@blocknote/server-util'],
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
