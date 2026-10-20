# Dexra MCP server

Solana DeFi checks for AI agents: token launches, real holders, wallets, pools, perp markets and swap preflight. Every check returns a verdict (`ok`, `caution`, `avoid` or `unknown`), the reasons behind it, a summary and the evidence.

The server is hosted at **`https://api.dexra.dev/mcp`** (Streamable HTTP). This repository holds the client configs and the source of [`@dexra-dev/mcp`](https://www.npmjs.com/package/@dexra-dev/mcp): the one-command installer and a local stdio server that forwards every message to the hosted one, for clients that only start local servers.

## Quick start

One command finds the MCP clients on your machine and adds Dexra to each (Claude Code, Claude Desktop, Cursor, VS Code, Codex, Windsurf, Gemini CLI, Antigravity, Cline, Zed, OpenCode, GitHub Copilot CLI, Kiro, Amp, Qwen Code, Factory Droid, Augment):

```sh
npx -y @dexra-dev/mcp install --key dxr_...
```

The key is optional. Without it the free tools work and paid tools are paid per call in USDC over [x402](https://x402.org). Name clients to limit it (`install cursor codex`), preview with `--dry-run`, see what was found with `list`, undo with `remove`. To set a client up by hand, use the configs below.

## Client configs

| Client | Config | Where it goes |
|---|---|---|
| Cursor (editor and CLI) | [`configs/cursor.json`](configs/cursor.json) | `~/.cursor/mcp.json` |
| VS Code | [`configs/vscode.json`](configs/vscode.json) | `mcp.json` in the user settings folder |
| Claude Desktop | [`configs/claude-desktop.json`](configs/claude-desktop.json) | `claude_desktop_config.json` (runs a local stdio bridge, Node 18+) |
| Codex | [`configs/codex.toml`](configs/codex.toml) | `~/.codex/config.toml` |
| Windsurf | [`configs/windsurf.json`](configs/windsurf.json) | `mcp_config.json` |
| Gemini CLI | [`configs/gemini-cli.json`](configs/gemini-cli.json) | `~/.gemini/settings.json` |
| Antigravity | [`configs/antigravity.json`](configs/antigravity.json) | `~/.gemini/config/mcp_config.json` |
| Cline | [`configs/cline.json`](configs/cline.json) | `cline_mcp_settings.json` |
| Zed | [`configs/zed.json`](configs/zed.json) | `~/.config/zed/settings.json` |
| OpenCode | [`configs/opencode.json`](configs/opencode.json) | `~/.config/opencode/opencode.json` |
| GitHub Copilot CLI | [`configs/copilot-cli.json`](configs/copilot-cli.json) | `~/.copilot/mcp-config.json` |
| Kiro | [`configs/kiro.json`](configs/kiro.json) | `~/.kiro/settings/mcp.json` |
| Amp | [`configs/amp.json`](configs/amp.json) | `~/.config/amp/settings.json` |
| Qwen Code | [`configs/qwen-code.json`](configs/qwen-code.json) | `~/.qwen/settings.json` |
| Factory Droid | [`configs/factory-droid.json`](configs/factory-droid.json) | `~/.factory/mcp.json` |
| Augment (Auggie CLI) | [`configs/augment.json`](configs/augment.json) | `~/.augment/settings.json` |

Replace `dxr_...` with your key, or delete the `headers` (or `env`) entry to use the free tools and pay per call.

## Tools

| Tool | Price (USDC) | What it answers |
|---|---|---|
| `describe_address` | free | What an address is (wallet, pool, token, program), its age and activity, and which tool to call next |
| `service_stats` | free | Calls, unique payers, volume, uptime and latency of the service |
| `score_performance` | free | How often launches with each verdict collapsed within 24h against the base rate ([dexra.dev/accuracy](https://dexra.dev/accuracy?utm_source=github&utm_medium=referral&utm_campaign=catalog&utm_content=mcp)) |
| `new_launches` | 0.005, 0.01 over 60 min | Fresh launches on pump.fun, LetsBonk, LaunchLab, Meteora DBC, PumpSwap, Raydium AMM and CPMM with creator history and first-buyer funding |
| `new_launches_batch` | 0.015 | The same checks for a list of known mints |
| `token_deep_check` | 0.03 | Holder graph, concentration after merging linked wallets, holder and liquidity history, mint authorities and Token-2022 extensions |
| `token_holders_delta` | 0.03 | Who entered and left the top holders over 1h and 24h |
| `wallet_check` | 0.03 | Known exchange, age, bot or human, launch PnL, sanctions links within two hops |
| `pool_health` | 0.03 | Depth, slippage, 24h liquidity flow, LP return after impermanent loss, bot and sandwich share |
| `clmm_range_stats` | 0.02 | Time in range, fee yield, impermanent loss and rebalances on Raydium CLMM, Orca and Meteora DLMM |
| `market_snapshot` | 0.01 | Funding, open interest, liquidations and execution cost across Binance, Bybit, OKX, Hyperliquid, Drift and Jupiter |
| `swap_preflight` | 0.005 | Price impact, sandwich history and Token-2022 traps before a swap |

The live list with input schemas is in the [server card](https://api.dexra.dev/.well-known/mcp/server-card.json); prices and networks are in the [x402 catalog](https://api.dexra.dev/.well-known/x402).

## Paying

- **Per call, no account**: a paid tool answers with `isError: true` and the x402 `PaymentRequired` object in `structuredContent`. Pay one of the `accepts` and repeat the call with the payment in `params._meta["x402/payment"]` or the `Payment-Signature` header.
- **Free account**: 100 credits a day once the email is confirmed. One credit is the cheapest call; a deep analysis uses up to six.
- **Subscription**: Pro, Scale and Business plans with daily credits, monthly or yearly, paid in USDC. Pro has a 3-day trial. See [dexra.dev](https://dexra.dev?utm_source=github&utm_medium=referral&utm_campaign=catalog&utm_content=mcp) and create a key at [dexra.dev/app/keys](https://dexra.dev/app/keys?utm_source=github&utm_medium=referral&utm_campaign=catalog&utm_content=mcp).

Send the key as `Authorization: Bearer dxr_...` (or `X-Api-Key`) on the MCP connection.

## Source

| Path | What |
|---|---|
| `bin/dexra-mcp.js` | the CLI: `install`, `list`, `remove`, and with no command the stdio server |
| `src/bridge.js` | stdio ↔ Streamable HTTP bridge to `https://api.dexra.dev/mcp` (`DEXRA_MCP_URL` overrides it) |
| `src/clients.js`, `src/install.js`, `src/jsonc.js` | where each client keeps its config and how the `dexra` entry is written without touching the rest of the file |

```sh
node bin/dexra-mcp.js list      # clients found on this machine
npm test                        # node --test, no dependencies
```

Node 18 or newer, no dependencies.

## Directories

- Official MCP Registry: `dev.dexra/dexra` ([`server.json`](server.json))
- Glama: [glama.ai/mcp/connectors/dev.dexra/dexra](https://glama.ai/mcp/connectors/dev.dexra/dexra)
- Smithery-style session config: [`configs/smithery-config.json`](configs/smithery-config.json)

## Links

- Website: https://dexra.dev?utm_source=github&utm_medium=referral&utm_campaign=catalog&utm_content=mcp
- API docs: https://dexra.dev/docs?utm_source=github&utm_medium=referral&utm_campaign=catalog&utm_content=mcp
- Support: support@dexra.dev
