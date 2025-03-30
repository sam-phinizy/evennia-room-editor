let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: "/app",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: false, // Disable strict mode to reduce hydration issues
  // Configure for static site generation
  output: 'export',
  // Completely disable SSR features - using a more compatible property
  useFileSystemPublicRoutes: true,
  // Disable trailing slash for static export
  trailingSlash: false,
  // Prevent Next.js from doing any server-side rendering
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Base path for GitHub Pages (if needed)
  // basePath: '/room-editor',
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig
