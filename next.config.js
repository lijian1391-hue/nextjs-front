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
