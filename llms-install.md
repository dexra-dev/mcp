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

2. For analytical tools, ask the user for their Dexra API key (it starts with `dxr_`; create an
   account and key at https://dexra.dev/app/keys). Add it to the entry:

   ```json
   "headers": { "Authorization": "Bearer dxr_..." }
   ```

   If they don't have a key yet, leave `headers` out and explain that only the public reports
   `service_stats` and `score_performance` can be called without an account. Connecting and
   listing tool schemas also work without a key. `describe_address` costs zero credits but
   requires account authorization, as do the other analytical tools. Registered accounts can
   pay per call over x402 after their included credits while keeping account authorization;
   anonymous payments don't grant access.

3. Check the connection with `initialize` and `tools/list`. The live inventory currently
   includes `lp_position_check` for Orca Whirlpools Position accounts. Don't call a paid tool
   just to test the connection.

Never write the key anywhere except this settings file, and never print it back to the user.
