#!/usr/bin/env node

/**
 * Clears the R2 ISR cache bucket and D1 tag cache before deployment.
 * Reads bucket/database names from wrangler.jsonc automatically.
 *
 * Usage:
 *   CLOUDFLARE_ACCOUNT_ID=xxx CLOUDFLARE_API_TOKEN=xxx node scripts/clear-cache.mjs
 *
 * Then deploy:
 *   npx opennextjs-cloudflare && npx wrangler deploy
 */

import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse wrangler.jsonc (strip comments, then JSON.parse)
function readWranglerConfig() {
  const configPath = resolve(__dirname, "../wrangler.jsonc")
  const raw = readFileSync(configPath, "utf8")
  const cleaned = raw
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,\s*([}\]])/g, "$1")
  return JSON.parse(cleaned)
}

const config = readWranglerConfig()

const r2Binding = config.r2_buckets?.[0]
const R2_BUCKET = r2Binding?.bucket_name

const d1Binding = config.d1_databases?.[0]
const D1_DATABASE_ID = d1Binding?.database_id
const D1_DATABASE_NAME = d1Binding?.database_name

if (!R2_BUCKET || !D1_DATABASE_ID) {
  console.error("[clear-cache] Missing R2 bucket or D1 database in wrangler.jsonc")
  process.exit(1)
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN

if (!ACCOUNT_ID || !API_TOKEN) {
  console.error("[clear-cache] Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN")
  process.exit(1)
}

const BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}`
const headers = {
  Authorization: `Bearer ${API_TOKEN}`,
  "Content-Type": "application/json",
}

async function clearR2() {
  console.log(`[clear-cache] Clearing R2 bucket: ${R2_BUCKET}`)

  let deleted = 0
  let cursor = null

  do {
    const url = new URL(`${BASE}/r2/buckets/${R2_BUCKET}/objects`)
    url.searchParams.set("limit", "500")
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

    cursor = data.truncated ? data.cursor : null
  } while (cursor)

  console.log(`[clear-cache] R2: deleted ${deleted} objects`)
}

async function clearD1() {
  console.log(`[clear-cache] Clearing D1 database: ${D1_DATABASE_NAME}`)

  // Get all table names
  const res = await fetch(`${BASE}/d1/database/${D1_DATABASE_ID}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_d1_%'",
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`[clear-cache] D1 query failed: ${res.status} — ${text}`)
    return
  }

  const data = await res.json()
  const tables = data.result?.[0]?.results?.map((r) => r.name) || []

  if (tables.length === 0) {
    console.log("[clear-cache] D1 database is already empty")
    return
  }

  // Drop all cache tables so migrations recreate them fresh
  const statements = tables.map((t) => `DROP TABLE IF EXISTS "${t}"`)
  const dropRes = await fetch(`${BASE}/d1/database/${D1_DATABASE_ID}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ sql: statements.join(";") }),
  })

  if (dropRes.ok) {
    console.log(`[clear-cache] D1: dropped ${tables.length} tables (${tables.join(", ")})`)
  } else {
    const text = await dropRes.text()
    console.error(`[clear-cache] D1 drop failed: ${dropRes.status} — ${text}`)
  }
}

async function main() {
  console.log("[clear-cache] Starting cache cleanup...")
  await clearR2()
  await clearD1()
  console.log("[clear-cache] Done!")
}

main().catch((err) => {
  console.error("[clear-cache] Error:", err)
  process.exit(1)
})
