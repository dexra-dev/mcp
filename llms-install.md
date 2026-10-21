# Installing the Dexra MCP server

Dexra is a hosted server. There is nothing to clone, build or run locally.

1. Add this entry to `cline_mcp_settings.json` under `mcpServers`:

   ```json
   "dexra": {
     "type": "streamableHttp",
     "url": "https://api.dexra.dev/mcp",
     "disabled": false,
     "autoApprove": []
   }
   ```

2. Ask the user whether they have a Dexra API key (it starts with `dxr_`; keys are created at
   https://dexra.dev/app/keys). If they do, add it to the entry:

   ```json
   "headers": { "Authorization": "Bearer dxr_..." }
   ```

   If they don't, leave `headers` out. The free tools (`describe_address`, `service_stats`,
   `score_performance`) work without a key; paid tools then answer with an x402 payment request
   instead of a result.

3. Check the connection by calling `describe_address` with
   `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263` (the BONK mint). It is free and should describe
   a token.

Never write the key anywhere except this settings file, and never print it back to the user.
