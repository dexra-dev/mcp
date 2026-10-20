#!/usr/bin/env node
// npx @dexra-dev/mcp            run as a local (stdio) MCP server that forwards to Dexra
// npx @dexra-dev/mcp install    add Dexra to the MCP clients found on this machine
// npx @dexra-dev/mcp remove     take it out again
// npx @dexra-dev/mcp list       show which clients were found

import { bridge } from '../src/bridge.js'
import { CLIENTS, DEFAULT_URL } from '../src/clients.js'
import { apply, selectClients } from '../src/install.js'

const HELP = `Dexra MCP: Solana token, wallet, launch, pool and swap checks for AI agents.

Usage:
  npx -y @dexra-dev/mcp                          stdio MCP server (for clients that only run local servers)
  npx -y @dexra-dev/mcp install [clients] [--key dxr_...]
  npx -y @dexra-dev/mcp remove [clients]
  npx -y @dexra-dev/mcp list

Clients: ${CLIENTS.map((client) => client.id).join(', ')}
Without client names, every client found on this machine is used.

Options:
  --key <dxr_...>   API key from https://dexra.dev/app/keys (or set DEXRA_API_KEY).
                    Without one the free tools work and paid tools are paid per call over x402.
  --url <url>       MCP endpoint (default ${DEFAULT_URL}, or DEXRA_MCP_URL)
  --dry-run         show what would change
  -h, --help        this help
`

function parse(argv) {
  const options = { command: null, clients: [], key: process.env.DEXRA_API_KEY, url: process.env.DEXRA_MCP_URL ?? DEFAULT_URL, dryRun: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const value = () => {
      const next = argv[++index]
      if (!next) throw new Error(`${arg} needs a value`)
      return next
    }
    if (arg === '--key') options.key = value()
    else if (arg.startsWith('--key=')) options.key = arg.slice(6)
    else if (arg === '--url') options.url = value()
    else if (arg.startsWith('--url=')) options.url = arg.slice(6)
    else if (arg === '--dry-run') options.dryRun = true
    else if (arg === '-h' || arg === '--help') options.command = 'help'
    else if (arg.startsWith('-')) throw new Error(`Unknown option ${arg}`)
    else if (!options.command) options.command = arg
    else options.clients.push(arg)
  }
  return options
}

async function main() {
  const options = parse(process.argv.slice(2))
  if (options.key && !options.key.startsWith('dxr_')) {
    throw new Error('API keys start with dxr_; create one at https://dexra.dev/app/keys')
  }
  switch (options.command) {
    case null:
      return bridge({ url: options.url, apiKey: options.key })
    case 'help':
      return process.stdout.write(HELP)
    case 'list': {
      for (const client of CLIENTS) {
        const where = client.kind === 'cli' ? 'CLI' : client.file
        process.stdout.write(`${client.detect() ? '✓' : '·'} ${client.id.padEnd(16)} ${client.name} (${where})\n`)
      }
      return
    }
    case 'install':
    case 'remove': {
      const clients = selectClients(options.clients)
      if (!clients.length) {
        process.stdout.write('No MCP clients found. Name one, e.g. `npx -y @dexra-dev/mcp install cursor`; see `list`.\n')
        return
      }
      const remove = options.command === 'remove'
      const results = apply(clients, { url: options.url, key: options.key, remove, dryRun: options.dryRun })
      for (const { client, ok, detail } of results) {
        process.stdout.write(`${ok ? '✓' : '✗'} ${client.name}: ${detail}\n`)
      }
      if (!remove && !options.dryRun) {
        process.stdout.write(
          options.key
            ? '\nRestart the clients to load Dexra.\n'
            : '\nAdded without an API key: free tools work, paid tools are paid per call over x402.\nAdd your key later with: npx -y @dexra-dev/mcp install --key dxr_...\n',
        )
      }
      if (results.some((result) => !result.ok)) process.exitCode = 1
      return
    }
    default:
      throw new Error(`Unknown command ${options.command}. Run with --help.`)
  }
}

main().catch((error) => {
  process.stderr.write(`dexra-mcp: ${error.message}\n`)
  process.exit(1)
})
