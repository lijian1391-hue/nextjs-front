const checkEnvVariables = require("./check-env-variables")
const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare")

// Initialize OpenNext Cloudflare integration for local development
// This is a no-op in production builds
initOpenNextCloudflareForDev()

checkEnvVariables()

console.log(`[build] MEDUSA_BACKEND_URL=${process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"}`)

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Prevent CDN and browser from caching dynamic HTML pages.
  // The Worker handles caching internally via RegionalCache + D1 tag checks.
  // Without this, the Cloudflare CDN edge caches ISR pages for up to 5 minutes
  // (due to s-maxage=300) and serves stale HTML even after on-demand revalidation.
  async headers() {
    return [
      {
        source: "/:countryCode/products/:handle",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, s-maxage=0",
          },
        ],
      },
      {
        source: "/:countryCode/store",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, s-maxage=0",
          },
        ],
      },
      {
        source: "/:countryCode/categories",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, s-maxage=0",
          },
        ],
      },
      {
        source: "/:countryCode/categories/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, s-maxage=0",
          },
        ],
      },
      {
        source: "/:countryCode/collections",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, s-maxage=0",
          },
        ],
      },
      {
        source: "/:countryCode/collections/:handle",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-cache, no-store, max-age=0, s-maxage=0",
          },
        ],
      },
    ]
  },
  images: {
    loader: "custom",
    loaderFile: "./src/lib/util/cf-image-loader.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.afrylo.com",
      },
      {
        protocol: "https",
        hostname: "front.afrylo.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
    ],
  },
}

module.exports = nextConfig
