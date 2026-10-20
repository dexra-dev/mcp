// Stdio ↔ Streamable HTTP bridge: MCP clients that only start local servers (stdio) talk to the
// remote Dexra server through it. Reads newline-delimited JSON-RPC from stdin, POSTs each
// message to the server and writes every answer to stdout as one line.

import { createInterface } from 'node:readline'

const PROTOCOL_VERSION = '2025-06-18'
// Sent in X-Dexra-Client; keep in step with package.json.
const VERSION = '0.2.1'

export async function bridge({ url, apiKey, stdin = process.stdin, stdout = process.stdout, stderr = process.stderr }) {
  let sessionId = null
  let protocolVersion = PROTOCOL_VERSION
  const write = (message) => stdout.write(`${JSON.stringify(message)}\n`)
  const log = (text) => stderr.write(`dexra-mcp: ${text}\n`)

  const failure = (message, error) => {
    const ids = (Array.isArray(message) ? message : [message])
      .filter((item) => item && typeof item === 'object' && 'id' in item && 'method' in item)
      .map((item) => item.id)
    for (const id of ids) {
      write({ jsonrpc: '2.0', id, error: { code: -32603, message: `Dexra is unreachable: ${error}` } })
    }
  }

  const send = async (message) => {
    const headers = {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': protocolVersion,
      'x-dexra-client': `dexra-mcp/${VERSION}`,
    }
    if (apiKey) headers.authorization = `Bearer ${apiKey}`
    if (sessionId) headers['mcp-session-id'] = sessionId
    let response
    try {
      response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(message) })
    } catch (error) {
      log(String(error))
      return failure(message, error.message ?? String(error))
    }
    sessionId = response.headers.get('mcp-session-id') ?? sessionId
    if (response.status === 202 || response.status === 204) return
    const type = response.headers.get('content-type') ?? ''
    const text = await response.text()
    if (type.includes('text/event-stream')) {
      for (const line of text.split('\n')) {
        if (line.startsWith('data:')) relay(line.slice(5).trim())
      }
      return
    }
    if (!response.ok && !text.trim().startsWith('{') && !text.trim().startsWith('[')) {
      return failure(message, `HTTP ${response.status}`)
    }
    relay(text)
  }

  const relay = (text) => {
    if (!text) return
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return log(`unreadable answer: ${text.slice(0, 200)}`)
    }
    for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
      const version = item?.result?.protocolVersion
      if (typeof version === 'string') protocolVersion = version
      write(item)
    }
  }

  const pending = new Set()
  const lines = createInterface({ input: stdin, crlfDelay: Infinity })
  for await (const line of lines) {
    if (!line.trim()) continue
    let message
    try {
      message = JSON.parse(line)
    } catch {
      write({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })
      continue
    }
    // `initialize` must finish first so the session id reaches the messages after it.
    const task = send(message)
    if (message?.method === 'initialize') {
      await task
      continue
    }
    pending.add(task)
    task.finally(() => pending.delete(task))
  }
  await Promise.all(pending)
}
