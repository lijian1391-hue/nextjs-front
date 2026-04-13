#!/usr/bin/env node

/**
 * Clears the R2 ISR cache bucket and D1 tag cache before deployment.
 * Reads bucket/database names from wrangler.jsonc automatically.
 *
 * Required env vars:
 *   CLOUDFLARE_ACCOUNT_ID  — your Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN   — API token with R2 + D1 edit permissions
 */

import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse wrangler.jsonc (strip comments, then JSON.parse)
function readWranglerConfig() {
  const configPath = resolve(__dirname, "../wrangler.jsonc")
  const raw = readFileSync(configPath, "utf8")
  // Remove single-line and multi-line comments, then trailing commas
  const cleaned = raw
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,\s*([}\]])/g, "$1")
  return JSON.parse(cleaned)
}

const config = readWranglerConfig()

// Read R2 bucket name from r2_buckets binding
const r2Binding = config.r2_buckets?.[0]
const R2_BUCKET = r2Binding?.bucket_name

// Read D1 database id from d1_databases binding
const d1Binding = config.d1_databases?.[0]
const D1_DATABASE_ID = d1Binding?.database_id
const D1_DATABASE_NAME = d1Binding?.database_name

if (!R2_BUCKET) {
  console.error("[clear-cache] No R2 bucket found in wrangler.jsonc")
  process.exit(1)
}

if (!D1_DATABASE_ID) {
  console.error("[clear-cache] No D1 database found in wrangler.jsonc")
  process.exit(1)
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error(
    "[clear-cache] Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN"
  )
  process.exit(1)
}

const BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}`

const headers = {
  Authorization: `Bearer ${API_TOKEN}`,
  "Content-Type": "application/json",
}

async function clearR2() {
  console.log(`[clear-cache] Clearing R2 bucket: ${R2_BUCKET}`)

  let cursor = null
  let deleted = 0

  do {
    const url = new URL(`${BASE}/r2/buckets/${R2_BUCKET}/objects`)
    url.searchParams.set("limit", "500")
    url.searchParams.set("per_page", "500")
    if (cursor) url.searchParams.set("cursor", cursor)

    const res = await fetch(url.toString(), { headers })
    if (!res.ok) {
      const text = await res.text()
      console.error(`[clear-cache] R2 list failed: ${res.status} — ${text}`)
      return
    }

    const data = await res.json()
    const objects = data.result || []

    if (objects.length === 0) {
      console.log("[clear-cache] R2 bucket is already empty")
      return
    }

    for (const obj of objects) {
      const delRes = await fetch(
        `${BASE}/r2/buckets/${R2_BUCKET}/objects/${encodeURIComponent(obj.key)}`,
        { method: "DELETE", headers }
      )
      if (delRes.ok) {
        deleted++
      } else {
        console.error(`[clear-cache] Failed to delete: ${obj.key}`)
      }
    }

    cursor = data.cursor || data.truncated ? data.cursor : null
  } while (cursor)

  console.log(`[clear-cache] R2: deleted ${deleted} objects`)
}

async function clearD1() {
  console.log(`[clear-cache] Clearing D1 database: ${D1_DATABASE_NAME} (${D1_DATABASE_ID})`)

  const res = await fetch(`${BASE}/d1/database/${D1_DATABASE_ID}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ sql: "DELETE FROM cache_tags" }),
  })

  if (res.ok) {
    console.log("[clear-cache] D1 tag cache cleared")
  } else {
    const text = await res.text()
    console.error(`[clear-cache] D1 clear failed: ${res.status} — ${text}`)
  }
}

async function main() {
  console.log("[clear-cache] Starting cache cleanup...")
  console.log(`[clear-cache]   R2 bucket: ${R2_BUCKET}`)
  console.log(`[clear-cache]   D1 database: ${D1_DATABASE_NAME}`)
  await clearR2()
  await clearD1()
  console.log("[clear-cache] Done!")
}

main().catch((err) => {
  console.error("[clear-cache] Error:", err)
  process.exit(1)
})
