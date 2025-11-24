/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  
  // GitHub Pages configuration - use environment variable for portability
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  
  // Static export settings
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  
  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Output directory for GitHub Pages
  distDir: 'out',
}

module.exports = nextConfig
