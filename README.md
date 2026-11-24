# Dexra MCP and Solana risk skill

Dexra provides read-only Solana checks for liquidity pools, Orca LP positions, tokens, wallets, launches and proposed swaps. Analytical responses include reasons and coverage; missing data and `unknown` results matter. A risk verdict doesn't guarantee safety or returns. Dexra doesn't sign or send transactions.

Connect to **`https://api.dexra.dev/mcp`** using Streamable HTTP. This repository contains client configs, the source of [`@dexra-dev/mcp`](https://www.npmjs.com/package/@dexra-dev/mcp), and an optional Agent Skill for pool, position and swap questions. See the [canonical MCP docs](https://dexra.dev/docs/mcp) for current setup and account details.

## Connect the MCP server

Add the endpoint in your client's remote HTTP MCP settings. Create an account and API key at [dexra.dev/app/keys](https://dexra.dev/app/keys) for analytical tools, then provide `Authorization: Bearer …` or `X-Api-Key` through your client's supported secret/config handling. Don't paste keys into an agent conversation, command history, public config or URL.

Connecting and listing schemas work without a key. Only `service_stats` and `score_performance` are public reports without an account; even zero-credit `describe_address` requires account authorization. Credits and account plans govern analytical use. Check the current tool metadata and account cost before a metered call; anonymous x402 payment doesn't grant analytical access.

For a client that requires stdio, configure `npx -y @dexra-dev/mcp@0.2.1` and supply `DEXRA_API_KEY` through its supported secret environment handling. The bridge forwards requests to the hosted service and needs Node.js 18+.

The package can also install a connection for a named client. For example, after supplying `DEXRA_API_KEY` securely in the local environment:

```sh
npx -y @dexra-dev/mcp@0.2.1 install cursor
```

Without client names, `install` targets every detected client. Choose the intended client and config scope. The installer writes account configuration locally; keep it private. Its existing CLI help contains older access wording, so use the current access rules above and the live server metadata. No package/runtime release accompanies this documentation.

## Optional Agent Skill

[`dexra-solana-risk`](skills/dexra-solana-risk/SKILL.md) helps compatible coding agents select `pool_health`, `clmm_range_stats`, `lp_position_check` or `swap_preflight`, check inputs, and connect MCP when tools are unavailable. It explicitly uses Dexra and preserves a service you already selected. Installing it adds instructions; MCP access, an account and permission to consume credits remain separate.

Review the skill and its [connection reference](skills/dexra-solana-risk/references/connect.md), then preview discovery without installing:

```sh
npx skills@1.9.0 add dexra-dev/mcp --list
```

To install it for a selected compatible agent in the current project, for example Claude Code:

```sh
npx skills@1.9.0 add dexra-dev/mcp --skill dexra-solana-risk --agent claude-code
```

The reviewed Skills CLI version needs Node.js 22.20+. Choose your agent using its [supported agent names](https://github.com/vercel-labs/skills/blob/main/docs/agents.md). This example uses project scope; `-g` would select a global installation. The CLI collects install telemetry by default; set `DISABLE_TELEMETRY=1` to opt out. See the [official CLI documentation](https://skills.sh/docs/cli).

Example requests after setup:

- “Check this Solana pool's depth and liquidity risks before I supply liquidity.”
- “Inspect this actual Orca Position account and explain its current range and fees.”
- “Assess a buy of 0.5 SOL of this mint before I consider a swap.”

The skill asks for missing inputs and account/budget authorization. It doesn't install itself into other agents, execute swaps or promise recommendation rankings. Public GitHub availability and discovery on external skill directories are separate states.

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

`dxr_...` is a placeholder. Use the client's supported secret handling, keep resolved configs private, and preserve other server entries. Without the `headers` (or `env`) entry, you can connect, inspect the tool schemas and read the public service reports; analytical tools require account authorization, including the zero-credit `describe_address` tool.

## Tools

The endpoint advertised 13 tools on 2026-11-25. Use the current `tools/list` schemas before calling them.

| Task | Tool | Required input or boundary |
| --- | --- | --- |
| Pool liquidity, slippage and pool-level LP performance | `pool_health` | Supported pool account |
| Concentrated-liquidity range analysis | `clmm_range_stats` | Pool; optional full `width_pct`, greater than 0 and at most 100 |
| Current Orca position range, principal and unclaimed fees | `lp_position_check` | Actual Whirlpools Position account, including bundled Position accounts; no NFT mint/bundle root, lifetime PnL, IL or rewards analysis |
| Risk before a buy or sell | `swap_preflight` | Mint, positive amount, side; buy uses quote units, sell uses token units |
| Identify an address | `describe_address` | Address; account required, zero credits |
| Token and holder analysis | `token_deep_check`, `token_holders_delta` | Inspect each live schema |
| Wallet, launch and market questions | `wallet_check`, `new_launches`, `new_launches_batch`, `market_snapshot` | Inspect each live schema and supported scope |
| Public service reference reports | `service_stats`, `score_performance` | No account required; these don't analyze your pool |

Read the [public server card](https://api.dexra.dev/.well-known/mcp.json) for discovery metadata. Prices and access rules can change; don't treat this table as a billing quote. Only run a metered analysis within your authorized budget, and don't automatically pay or retry a `PaymentRequired` result.

The npm package version (`0.2.1`), live runtime `serverInfo.version` (`0.1.0` at verification), and repository `server.json` descriptor version (`0.1.1`) describe different artifacts. Editing the descriptor doesn't publish a new Official Registry version.

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

- Website: https://dexra.dev/
- MCP docs: https://dexra.dev/docs/mcp
- Support: support@dexra.dev
