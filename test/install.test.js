import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { codexTable, withCodexTable } from '../src/clients.js'
import { apply } from '../src/install.js'
import { parseJsonc } from '../src/jsonc.js'

const MCP = 'https://api.dexra.dev/mcp'
const BIN = fileURLToPath(new URL('../bin/dexra-mcp.js', import.meta.url))

test('replaces only the dexra table in a Codex config', () => {
  const before = 'model = "o5"\n\n[mcp_servers.other]\nurl = "x"\n\n[mcp_servers.dexra]\nurl = "old"\n\n[profiles.a]\nmodel = "b"\n'
  const after = withCodexTable(before, codexTable(MCP, 'dxr_k'))
  assert.match(after, /\[mcp_servers\.other\]\nurl = "x"/)
  assert.match(after, /\[profiles\.a\]\nmodel = "b"/)
  assert.equal(after.match(/\[mcp_servers\.dexra\]/g).length, 1)
  assert.match(after, /http_headers = \{ "Authorization" = "Bearer dxr_k" \}/)
  assert.doesNotMatch(withCodexTable(after, null), /dexra/)
})

test('adds and removes the entry in a JSON config, keeping other servers', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dexra-mcp-'))
  const file = join(dir, 'mcp.json')
  writeFileSync(file, JSON.stringify({ mcpServers: { other: { url: 'x' } }, theme: 'dark' }))
  const client = { id: 't', name: 'Test', kind: 'json', file, path: ['mcpServers'], entry: (url, key) => ({ url, headers: { Authorization: `Bearer ${key}` } }) }
  const [added] = apply([client], { url: MCP, key: 'dxr_k' })
  assert.ok(added.ok, added.detail)
  const config = JSON.parse(readFileSync(file, 'utf8'))
  assert.deepEqual(config.mcpServers.dexra, { url: MCP, headers: { Authorization: 'Bearer dxr_k' } })
  assert.equal(config.mcpServers.other.url, 'x')
  assert.equal(config.theme, 'dark')
  apply([client], { url: MCP, remove: true })
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).mcpServers.dexra, undefined)
})

test('keeps comments and trailing commas in a JSON settings file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dexra-mcp-'))
  const file = join(dir, 'settings.json')
  const before = '// Zed settings\n{\n    "theme": "dark", // mine\n    /* block */\n    "context_servers": {\n        "other": { "url": "x" },\n    },\n}\n'
  writeFileSync(file, before)
  const client = { id: 't', name: 'Test', kind: 'json', file, path: ['context_servers'], entry: (url) => ({ url }) }
  const [added] = apply([client], { url: MCP })
  assert.ok(added.ok, added.detail)
  const text = readFileSync(file, 'utf8')
  assert.match(text, /^\/\/ Zed settings\n/)
  assert.match(text, /"theme": "dark", \/\/ mine\n/)
  assert.match(text, /\/\* block \*\//)
  assert.deepEqual(parseJsonc(text).context_servers, { other: { url: 'x' }, dexra: { url: MCP } })
  const [again] = apply([client], { url: MCP })
  assert.ok(again.ok)
  assert.equal(readFileSync(file, 'utf8'), text)
  apply([client], { url: MCP, remove: true })
  const removed = readFileSync(file, 'utf8')
  assert.deepEqual(parseJsonc(removed).context_servers, { other: { url: 'x' } })
  assert.match(removed, /\/\/ mine/)
  const [missing] = apply([client], { url: MCP, remove: true })
  assert.equal(missing.detail, 'not configured')
})

test('reports a file it cannot read and leaves it as it was', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dexra-mcp-'))
  const file = join(dir, 'settings.json')
  writeFileSync(file, '{ "a": ')
  const client = { id: 't', name: 'Test', kind: 'json', file, path: ['mcpServers'], entry: (url) => ({ url }) }
  const [result] = apply([client], { url: MCP })
  assert.equal(result.ok, false)
  assert.equal(readFileSync(file, 'utf8'), '{ "a": ')
})

test('install configures the clients found in a home folder', () => {
  const home = mkdtempSync(join(tmpdir(), 'dexra-home-'))
  mkdirSync(join(home, '.cursor'))
  mkdirSync(join(home, '.codex'))
  mkdirSync(join(home, '.gemini'))
  writeFileSync(join(home, '.gemini', 'settings.json'), '{"theme":"x"}')
  const env = { HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: join(home, '.config'), APPDATA: join(home, 'AppData'), PATH: '/nonexistent' }
  const run = spawnSync(process.execPath, [BIN, 'install', '--key', 'dxr_test'], { env, encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr + run.stdout)
  assert.deepEqual(JSON.parse(readFileSync(join(home, '.cursor', 'mcp.json'), 'utf8')).mcpServers.dexra, {
    url: MCP,
    headers: { Authorization: 'Bearer dxr_test' },
  })
  const gemini = JSON.parse(readFileSync(join(home, '.gemini', 'settings.json'), 'utf8'))
  assert.equal(gemini.theme, 'x')
  assert.equal(gemini.mcpServers.dexra.httpUrl, MCP)
  assert.match(readFileSync(join(home, '.codex', 'config.toml'), 'utf8'), /\[mcp_servers\.dexra\]\nurl = "https:\/\/api\.dexra\.dev\/mcp"/)
  const bad = spawnSync(process.execPath, [BIN, 'install', '--key', 'nope'], { env, encoding: 'utf8' })
  assert.equal(bad.status, 1)
})

test('install writes each newer client in its own format', () => {
  const home = mkdtempSync(join(tmpdir(), 'dexra-home-'))
  const config = join(home, '.config')
  mkdirSync(join(config, 'zed'), { recursive: true })
  writeFileSync(join(config, 'zed', 'settings.json'), '// Zed settings\n{\n  "theme": "x", // mine\n}\n')
  mkdirSync(join(config, 'opencode'), { recursive: true })
  writeFileSync(join(config, 'opencode', 'opencode.jsonc'), '{\n  // servers\n  "mcp": {}\n}\n')
  for (const dir of ['.copilot', '.kiro', '.qwen', '.factory', '.augment', join('.config', 'amp')]) mkdirSync(join(home, dir), { recursive: true })
  const env = { HOME: home, USERPROFILE: home, XDG_CONFIG_HOME: config, APPDATA: join(home, 'AppData'), PATH: '/nonexistent' }
  const run = spawnSync(process.execPath, [BIN, 'install', '--key', 'dxr_test'], { env, encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr + run.stdout)
  const read = (...parts) => parseJsonc(readFileSync(join(home, ...parts), 'utf8'))
  const headers = { Authorization: 'Bearer dxr_test' }
  const zed = readFileSync(join(config, 'zed', 'settings.json'), 'utf8')
  assert.match(zed, /"theme": "x", \/\/ mine/)
  assert.deepEqual(parseJsonc(zed).context_servers.dexra, { url: MCP, headers })
  assert.match(readFileSync(join(config, 'opencode', 'opencode.jsonc'), 'utf8'), /\/\/ servers/)
  assert.deepEqual(read('.config', 'opencode', 'opencode.jsonc').mcp.dexra, { type: 'remote', url: MCP, enabled: true, headers })
  assert.deepEqual(read('.copilot', 'mcp-config.json').mcpServers.dexra, { type: 'http', url: MCP, headers, tools: ['*'] })
  assert.deepEqual(read('.kiro', 'settings', 'mcp.json').mcpServers.dexra, { url: MCP, headers })
  assert.deepEqual(read('.config', 'amp', 'settings.json')['amp.mcpServers'].dexra, { url: MCP, headers })
  assert.deepEqual(read('.qwen', 'settings.json').mcpServers.dexra, { httpUrl: MCP, headers })
  assert.deepEqual(read('.factory', 'mcp.json').mcpServers.dexra, { type: 'http', url: MCP, headers })
  assert.deepEqual(read('.augment', 'settings.json').mcpServers.dexra, { type: 'http', url: MCP, headers })
})
