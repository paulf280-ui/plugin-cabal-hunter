# elizaos-plugin-cabal-hunter

**Solana rug & cabal detection for ElizaOS trading agents.** `CHECK_CABAL_RISK` scans any Solana mint *before your agent buys*: funding-trace cabal detection (one hop, to a shared funding wallet), same-block Jito bundles, same-block coordinated selling, serial-launcher deployer history ("launched 92, 90 dead"), a Solana-native honeypot check (freeze authority + Token-2022 traps) and an exit-liquidity verdict. **Every wallet cluster carries `evidence_txs[]` — the signatures behind it.**

[![Install MCP in VS Code](https://img.shields.io/badge/VS_Code-Install_Cabal--Hunter_MCP-0098FF?style=for-the-badge&logo=githubcopilot&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=cabal-hunter&config=%7B%22type%22%3A%20%22http%22%2C%20%22url%22%3A%20%22https%3A%2F%2Fapi.cabal-hunter.com%2Fmcp%22%7D)
[![Install MCP in Cursor](https://img.shields.io/badge/Cursor-Install_Cabal--Hunter_MCP-111111?style=for-the-badge)](https://cursor.com/install-mcp?name=cabal-hunter&config=eyJ1cmwiOiAiaHR0cHM6Ly9hcGkuY2FiYWwtaHVudGVyLmNvbS9tY3AifQ==)
[![Free tier](https://img.shields.io/badge/5%2Fmo_free-250_with_a_key-10b981?style=for-the-badge)](https://api.cabal-hunter.com/api/info)

> 🌐 **Available in 9 languages:** [English](https://api.cabal-hunter.com/) · [Español](https://api.cabal-hunter.com/es) · [Português](https://api.cabal-hunter.com/pt) · [Français](https://api.cabal-hunter.com/fr) · [Deutsch](https://api.cabal-hunter.com/de) · [Nederlands](https://api.cabal-hunter.com/nl) · [中文](https://api.cabal-hunter.com/zh) · [日本語](https://api.cabal-hunter.com/ja) · [한국어](https://api.cabal-hunter.com/ko)

Powered by [Cabal-Hunter](https://api.cabal-hunter.com) — **5 free scans/month**, or **250 with a free key** (one email). Then **$9/month for Unlimited** (fair use), or pay-as-you-go at $0.001 per scan — priced at cost. Pay by card, in USDC on Solana, or per-call via x402. Card subscriptions renew automatically and can be cancelled anytime at [/billing](https://cabal-hunter.com/billing). Prepaid via `POST /api/buy-key` + `X-API-Key` header. [Full pricing →](https://api.cabal-hunter.com/pricing)

## ElizaOS quick start

![Cabal-Hunter — interactive 3D holder map: crystals sized by supply share, clusters joined by beams, with deployer history and an Exit-Liquidity Risk verdict](demo/screenshot.png)


```bash
npm install elizaos-plugin-cabal-hunter
```

```ts
import { cabalHunterPlugin } from "elizaos-plugin-cabal-hunter";

// character / runtime config
export const character = {
  name: "TraderAgent",
  plugins: [cabalHunterPlugin],
  // ...
};
```

Your agent now answers *"is `<mint>` safe?"* with a full forensic verdict — and your strategy code can gate buys directly:

```ts
import { checkCabalRisk, isRisky } from "elizaos-plugin-cabal-hunter";

if (await isRisky(mint)) return; // AVOID / cabal score >= 65 / honeypot — skip the buy

const report = await checkCabalRisk(mint);
console.log(report.recommendation, report.cabal_score, report.top_reasons);
```

## What a scan returns

```jsonc
{
  "recommendation": "AVOID",        // SAFE | REVIEW | AVOID — deprecated, kept for existing bots
  "risk_level": "HIGH",             // LOW_SIGNAL | ELEVATED | HIGH — prefer this one
  "cabal_score": 93.8,              // 0-100, COORDINATION ONLY — not a whole-token all-clear
  "honeypot_risk": "LOW",           // freeze authority + Token-2022 traps
  "exit_liquidity_risk": true,      // can the pool absorb your exit?
  "deployer": { "verdict": "SERIAL_LAUNCHER", "tokens_launched": 92, "dead": 90, "sampled": 90 },
  "coordinated_clusters": [
    { "type": "coordinated_exit", "wallet_count": 2, "combined_pct": 3.4,
      "evidence_txs": ["sEWHzDWmaBqn…", "3c9GRqHbf2nh…"] }
  ],
  "scan_complete": true,            // how much did we even look at —
  "wallets_checked": 12,            // apply YOUR risk tolerance, not ours
  "computed_at": 1789530296         // unix seconds — when the trace actually ran
}
```

`scan_complete` / `wallets_checked` exist so your bot can apply its own risk tolerance instead of inheriting ours — the score is a starting point you can verify (every cluster carries `evidence_txs[]`), not a verdict you take on faith. Concentration, deployer history and the honeypot checks are read from chain state, so they carry no transaction of their own: a token can be `HIGH` with no clusters at all. `cabal_score` and `risk` describe **coordination only** — read `honeypot_risk` and `risk_level` before calling anything clean, and treat `degraded: true` as "we could not verify everything", never as an all-clear.

**Freshness:** a mint traced in the last 8 hours is answered from that trace in <100ms and `computed_at` says when; anything else runs a live on-chain trace taking 15-20s.

## Not using ElizaOS?

- **MCP (Claude Code / Claude Desktop / Cursor / VS Code):** `{"mcpServers": {"cabal-hunter": {"url": "https://api.cabal-hunter.com/mcp"}}}` — or the one-click buttons above.
- **REST:** `curl "https://api.cabal-hunter.com/api/scan-cabal?mintAddress=<MINT>"` — [OpenAPI spec](https://api.cabal-hunter.com/openapi.json)
- **Telegram:** [@TheCabalHunter_Bot](https://t.me/TheCabalHunter_Bot) — paste a mint, get the scan as a card, and watch a token you hold for a dump alert. Channel: [@CabalHunterAlerts](https://t.me/CabalHunterAlerts).
- **Human?** Free interactive 3D holder map: [api.cabal-hunter.com/map](https://api.cabal-hunter.com/map) — holders as crystals sized by supply share, clusters joined by beams, plus wallet addresses, Solscan receipts, live chart + trade links (Axiom · GMGN · DexScreener) on one screen.

## Cabal-Hunter everywhere

Same detection engine, wherever your stack lives:

- **`npx cabal-hunter-mcp`** — standalone MCP server for Claude · Cursor · VS Code · any MCP client: [cabal-hunter-mcp](https://github.com/paulf280-ui/cabal-hunter-mcp) · [npm](https://www.npmjs.com/package/cabal-hunter-mcp)
- **MCP template / starter:** [solana-safe-sniper-mcp-template](https://github.com/paulf280-ui/solana-safe-sniper-mcp-template)
- **REST API + OpenAPI · free 3D holder map:** [api.cabal-hunter.com](https://api.cabal-hunter.com) · [/map](https://api.cabal-hunter.com/map)

## License

MIT. The plugin is a thin open client; the detection engine runs at [api.cabal-hunter.com](https://api.cabal-hunter.com).
