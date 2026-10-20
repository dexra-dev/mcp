// Where each MCP client keeps its servers and how a Dexra entry looks there. Formats follow each
// client's own documentation (checked October 2026).

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'

const home = homedir()
const appData = process.env.APPDATA ?? join(home, 'AppData', 'Roaming')
const xdgConfig = process.env.XDG_CONFIG_HOME ?? join(home, '.config')
const os = platform()

/** The application-support folder of a desktop app, per OS. */
function appSupport(...parts) {
  if (os === 'darwin') return join(home, 'Library', 'Application Support', ...parts)
  if (os === 'win32') return join(appData, ...parts)
  return join(xdgConfig, ...parts)
}

function hasCommand(name) {
  try {
    execFileSync(os === 'win32' ? 'where' : 'which', [name], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const bearer = (key) => (key ? { Authorization: `Bearer ${key}` } : undefined)

/** `name.jsonc` when the client already keeps one, else `name.json`. */
function jsonOrJsonc(dir, name) {
  const jsonc = join(dir, `${name}.jsonc`)
  return existsSync(jsonc) ? jsonc : join(dir, `${name}.json`)
}

const zedDir = os === 'win32' ? join(appData, 'Zed') : join(xdgConfig, 'zed')
const opencodeDir = process.env.OPENCODE_CONFIG_DIR ?? join(home, '.config', 'opencode')
const copilotDir = process.env.COPILOT_HOME ?? join(home, '.copilot')
const ampDir = join(home, '.config', 'amp')

/**
 * Each client: `id`, `name`, `detect()` (installed on this machine), and either a JSON file
 * (`file`, `path` to the servers object, `entry(url, key)`), a TOML file, or a CLI.
 */
export const CLIENTS = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    kind: 'cli',
    detect: () => hasCommand('claude'),
    add: (url, key) => [
      'claude',
      ['mcp', 'add', '--scope', 'user', '--transport', 'http', 'dexra', url, ...(key ? ['--header', `Authorization: Bearer ${key}`] : [])],
    ],
    remove: () => ['claude', ['mcp', 'remove', '--scope', 'user', 'dexra']],
  },
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    kind: 'json',
    file: appSupport('Claude', 'claude_desktop_config.json'),
    detect: () => existsSync(appSupport('Claude')),
    path: ['mcpServers'],
    // Its config file starts local servers only, so it runs this package as the bridge.
    entry: (url, key) => ({
      command: 'npx',
      args: ['-y', '@dexra-dev/mcp'],
      env: { ...(key ? { DEXRA_API_KEY: key } : {}), ...(url !== DEFAULT_URL ? { DEXRA_MCP_URL: url } : {}) },
    }),
  },
  {
    id: 'cursor',
    name: 'Cursor',
    kind: 'json',
    file: join(home, '.cursor', 'mcp.json'),
    detect: () => existsSync(join(home, '.cursor')),
    path: ['mcpServers'],
    entry: (url, key) => ({ url, ...(key ? { headers: bearer(key) } : {}) }),
  },
  {
    id: 'vscode',
    name: 'VS Code',
    kind: 'json',
    file: appSupport('Code', 'User', 'mcp.json'),
    detect: () => existsSync(appSupport('Code', 'User')),
    path: ['servers'],
    entry: (url, key) => ({ type: 'http', url, ...(key ? { headers: bearer(key) } : {}) }),
  },
  {
    id: 'codex',
    name: 'Codex',
    kind: 'toml',
    file: join(process.env.CODEX_HOME ?? join(home, '.codex'), 'config.toml'),
    detect: () => existsSync(process.env.CODEX_HOME ?? join(home, '.codex')) || hasCommand('codex'),
  },
  {
    id: 'windsurf',
    name: 'Windsurf (Devin Desktop)',
    kind: 'json',
    file: os === 'win32' ? join(appData, 'devin', 'mcp_config.json') : join(xdgConfig, 'devin', 'mcp_config.json'),
    detect: () => existsSync(os === 'win32' ? join(appData, 'devin') : join(xdgConfig, 'devin')),
    path: ['mcpServers'],
    entry: (url, key) => ({ serverUrl: url, ...(key ? { headers: bearer(key) } : {}) }),
  },
  {
    id: 'windsurf-legacy',
    name: 'Windsurf (older versions)',
    kind: 'json',
    file: join(home, '.codeium', 'windsurf', 'mcp_config.json'),
    detect: () => existsSync(join(home, '.codeium', 'windsurf')),
    path: ['mcpServers'],
    entry: (url, key) => ({ serverUrl: url, ...(key ? { headers: bearer(key) } : {}) }),
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    kind: 'json',
    file: join(home, '.gemini', 'settings.json'),
    detect: () => existsSync(join(home, '.gemini', 'settings.json')) || hasCommand('gemini'),
    path: ['mcpServers'],
    entry: (url, key) => ({ httpUrl: url, ...(key ? { headers: bearer(key) } : {}) }),
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    kind: 'json',
    file: join(home, '.gemini', 'config', 'mcp_config.json'),
    detect: () => existsSync(join(home, '.gemini', 'config')) || hasCommand('antigravity'),
    path: ['mcpServers'],
    entry: (url, key) => ({ serverUrl: url, ...(key ? { headers: bearer(key) } : {}) }),
  },
  {
    id: 'cline',
    name: 'Cline',
    kind: 'json',
    file: process.env.CLINE_MCP_SETTINGS_PATH ?? join(home, '.cline', 'data', 'settings', 'cline_mcp_settings.json'),
    detect: () => Boolean(process.env.CLINE_MCP_SETTINGS_PATH) || existsSync(join(home, '.cline')),
    path: ['mcpServers'],
    entry: (url, key) => ({
      type: 'streamableHttp',
      url,
      ...(key ? { headers: bearer(key) } : {}),
      disabled: false,
      autoApprove: [],
    }),
  },
  {
    id: 'zed',
    name: 'Zed',
    kind: 'json',
    file: join(zedDir, 'settings.json'),
    detect: () => existsSync(zedDir) || hasCommand('zed'),
    path: ['context_servers'],
    entry: (url, key) => ({ url, ...(key ? { headers: bearer(key) } : {}) }),
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    kind: 'json',
    file: process.env.OPENCODE_CONFIG ?? jsonOrJsonc(opencodeDir, 'opencode'),
    detect: () => existsSync(opencodeDir) || hasCommand('opencode'),
    path: ['mcp'],
    entry: (url, key) => ({ type: 'remote', url, enabled: true, ...(key ? { headers: bearer(key) } : {}) }),
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot CLI',
    kind: 'json',
    file: join(copilotDir, 'mcp-config.json'),
    detect: () => existsSync(copilotDir) || hasCommand('copilot'),
    path: ['mcpServers'],
    entry: (url, key) => ({ type: 'http', url, ...(key ? { headers: bearer(key) } : {}), tools: ['*'] }),
  },
  {
    id: 'kiro',
    name: 'Kiro',
    kind: 'json',
    file: join(home, '.kiro', 'settings', 'mcp.json'),
    detect: () => existsSync(join(home, '.kiro')) || hasCommand('kiro') || hasCommand('kiro-cli'),
    path: ['mcpServers'],
    entry: (url, key) => ({ url, ...(key ? { headers: bearer(key) } : {}) }),
  },
  {
    id: 'amp',
    name: 'Amp',
    kind: 'json',
    file: jsonOrJsonc(ampDir, 'settings'),
    detect: () => existsSync(ampDir) || hasCommand('amp'),
    // Amp keys its settings by dotted names, so this is one flat key.
    path: ['amp.mcpServers'],
    entry: (url, key) => ({ url, ...(key ? { headers: bearer(key) } : {}) }),
  },
  {
    id: 'qwen',
    name: 'Qwen Code',
    kind: 'json',
    file: join(home, '.qwen', 'settings.json'),
    detect: () => existsSync(join(home, '.qwen')) || hasCommand('qwen'),
    path: ['mcpServers'],
    // `url` means SSE in Qwen Code; streamable HTTP is `httpUrl`.
    entry: (url, key) => ({ httpUrl: url, ...(key ? { headers: bearer(key) } : {}) }),
  },
  {
    id: 'factory',
    name: 'Factory Droid',
    kind: 'json',
    file: join(home, '.factory', 'mcp.json'),
    detect: () => existsSync(join(home, '.factory')) || hasCommand('droid'),
    path: ['mcpServers'],
    entry: (url, key) => ({ type: 'http', url, ...(key ? { headers: bearer(key) } : {}) }),
  },
  {
    id: 'augment',
    name: 'Augment (Auggie CLI)',
    kind: 'json',
    file: join(home, '.augment', 'settings.json'),
    detect: () => existsSync(join(home, '.augment')) || hasCommand('auggie'),
    path: ['mcpServers'],
    entry: (url, key) => ({ type: 'http', url, ...(key ? { headers: bearer(key) } : {}) }),
  },
]

export const DEFAULT_URL = 'https://api.dexra.dev/mcp'

/** The `[mcp_servers.dexra]` table for Codex. */
export function codexTable(url, key) {
  const lines = ['[mcp_servers.dexra]', `url = ${JSON.stringify(url)}`]
  if (key) lines.push(`http_headers = { "Authorization" = ${JSON.stringify(`Bearer ${key}`)} }`)
  return `${lines.join('\n')}\n`
}

/** Replaces or appends the Dexra table in a Codex config, leaving everything else as it was. */
export function withCodexTable(text, table) {
  const without = withoutCodexTable(text).replace(/\s*$/, '')
  return table ? `${without ? `${without}\n\n` : ''}${table}` : `${without}\n`
}

export function withoutCodexTable(text) {
  const lines = text.split('\n')
  const out = []
  let skipping = false
  for (const line of lines) {
    const header = line.trim().match(/^\[([^\]]+)\]$/)
    if (header) skipping = header[1].trim() === 'mcp_servers.dexra' || header[1].trim().startsWith('mcp_servers.dexra.')
    if (!skipping) out.push(line)
  }
  return out.join('\n')
}
