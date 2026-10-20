// `install`, `remove` and `list`: write or remove the Dexra entry in each MCP client's config.

import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { CLIENTS, codexTable, withCodexTable, withoutCodexTable } from './clients.js'
import { parseJsonc, setJsonc } from './jsonc.js'

function backup(file) {
  if (existsSync(file)) copyFileSync(file, `${file}.dexra-backup`)
}

function writeText(file, text) {
  mkdirSync(dirname(file), { recursive: true })
  backup(file)
  writeFileSync(file, text)
}

// Comments, trailing commas and the rest of the file are kept; only the dexra entry is rewritten.
function applyJson(client, url, key, remove) {
  const text = existsSync(client.file) ? readFileSync(client.file, 'utf8') : ''
  const path = [...client.path, 'dexra']
  if (remove) {
    const servers = client.path.reduce((node, part) => node?.[part], parseJsonc(text))
    if (!servers || !('dexra' in servers)) return 'not configured'
  }
  writeText(client.file, setJsonc(text, path, remove ? undefined : client.entry(url, key)))
  return client.file
}

function applyToml(client, url, key, remove) {
  const text = existsSync(client.file) ? readFileSync(client.file, 'utf8') : ''
  if (remove && withoutCodexTable(text) === text) return 'not configured'
  writeText(client.file, remove ? withCodexTable(text, null) : withCodexTable(text, codexTable(url, key)))
  return client.file
}

function applyCli(client, url, key, remove) {
  const [command, args] = remove ? client.remove() : client.add(url, key)
  if (!remove) {
    // Re-adding replaces an older entry instead of failing on the existing name.
    try {
      execFileSync(...client.remove(), { stdio: 'ignore' })
    } catch {}
  }
  execFileSync(command, args, { stdio: 'ignore' })
  return `${command} ${args.filter((arg) => !arg.startsWith('Authorization:')).join(' ')}`
}

export function selectClients(ids) {
  if (!ids.length) return CLIENTS.filter((client) => client.detect())
  const unknown = ids.filter((id) => !CLIENTS.some((client) => client.id === id))
  if (unknown.length) {
    throw new Error(`Unknown client ${unknown.join(', ')}. Known: ${CLIENTS.map((client) => client.id).join(', ')}`)
  }
  return CLIENTS.filter((client) => ids.includes(client.id))
}

/** Configures (or with `remove`, unconfigures) each client; returns one result line per client. */
export function apply(clients, { url, key, remove = false, dryRun = false }) {
  return clients.map((client) => {
    if (dryRun) {
      const where = client.kind === 'cli' ? client.add(url, key)[0] : client.file
      return { client, ok: true, detail: `would ${remove ? 'remove from' : 'write'} ${where}` }
    }
    try {
      const apply = { json: applyJson, toml: applyToml, cli: applyCli }[client.kind]
      return { client, ok: true, detail: apply(client, url, key, remove) }
    } catch (error) {
      const detail = error instanceof SyntaxError ? `${client.file} could not be read (${error.message}), edit it by hand` : error.message
      return { client, ok: false, detail }
    }
  })
}
