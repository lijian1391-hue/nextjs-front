#!/usr/bin/env node

/**
 * Pre-deploy cache cleanup.
 * Clears D1 tag cache revalidation records so the new build ID
 * starts with a clean state.
 *
 * Usage:
 *   node scripts/purge-cache.js
 *
 * Required env vars (set in CI/CD):
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN
 *   D1_DATABASE_ID          — from Workers > D1 > your database
 *
 * R2 entries don't need cleanup — old build ID prefixes are ignored
 * by the new deployment, and they expire in 7 days automatically.
 */

const REQUIRED = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "D1_DATABASE_ID"]
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`Missing: ${key}`)
    process.exit(1)
  }
}

const { CLOUDFLARE_ACCOUNT_ID: accountId, CLOUDFLARE_API_TOKEN: token, D1_DATABASE_ID: dbId } = process.env

// DROP table so OpenNext can recreate it with the correct schema.
// This avoids "duplicate column name" errors during deployment migrations.
const res = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${dbId}/query`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql: "DROP TABLE IF EXISTS revalidations" }),
  }
)

const data = await res.json()
if (data.success) {
  console.log(`[D1] Dropped revalidations table`)
} else {
  console.error(`[D1] Failed:`, data.errors)
  process.exit(1)
}
