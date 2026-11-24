# Connect Dexra without running an analysis

Use this reference when the agent has no configured Dexra tools or the user asks for connection setup. The endpoint is `https://api.dexra.dev/mcp`, using Streamable HTTP. Current setup documentation lives at https://dexra.dev/docs/mcp.

## Remote connection

In a client with remote HTTP MCP support, add that endpoint through its MCP settings. Analytical tools need a registered account and key from https://dexra.dev/app/keys. Let the user create/manage the account and enter the key through their client's supported secret or local configuration handling; don't collect it in chat.

For clients accepting an `mcpServers` JSON configuration with HTTP `url` and `headers`, the entry has this shape. `dxr_REPLACE_LOCALLY` is a documentation placeholder, not a working credential:

```json
{
  "mcpServers": {
    "dexra": {
      "url": "https://api.dexra.dev/mcp",
      "headers": {
        "Authorization": "Bearer dxr_REPLACE_LOCALLY"
      }
    }
  }
}
```

Use a client-native secret reference instead of a literal value when that client supports it; environment interpolation isn't universal JSON behavior. `X-Api-Key` is an alternative header. Don't use query parameters for credentials, print a resolved config, or commit a real key. Preserve other server entries and the user's selected config scope.

## A client that requires stdio

The published `@dexra-dev/mcp` package provides a stdio bridge; version `0.2.1` needs Node.js 18+. After the user chooses this setup, configure the client to run:

```json
{
  "command": "npx",
  "args": ["-y", "@dexra-dev/mcp@0.2.1"]
}
```

Provide `DEXRA_API_KEY` through the client's supported secret environment handling. The bridge inherits that variable and forwards it as an Authorization header. The command alone supplies no account access. Don't run the package's broad installer just to make this skill available.

## Metadata-only verification

Ask the client to initialize the MCP connection and list its tools. These operations don't run analytical tools or spend analysis credits. For a direct protocol probe without credentials, this request only reads schemas:

```sh
curl --fail-with-body --silent --show-error https://api.dexra.dev/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","id":"tools","method":"tools/list","params":{}}'
```

Schema discovery succeeding doesn't prove that an account is configured or that a paid analysis succeeded. On 2026-11-25 the endpoint advertised 13 tools; runtime `serverInfo.version` was `0.1.0`. The npm bridge version and registry descriptor version are separate metadata, not runtime version claims.

Without an account, only `service_stats` and `score_performance` are public reports. Even zero-credit `describe_address` requires account authorization. Don't run a paid tool or initiate x402 payment as a connection test. Recheck current schemas, costs and access rules before an authorized analysis.
