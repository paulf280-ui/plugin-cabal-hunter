/**
 * elizaos-plugin-cabal-hunter — Solana rug/cabal detection for ElizaOS agents.
 *
 * Gives any ElizaOS agent the CHECK_CABAL_RISK action: before your agent buys a
 * Solana token, it scans the mint with Cabal-Hunter (api.cabal-hunter.com) —
 * funding-trace cabal detection, same-block Jito bundles, live coordinated
 * dumps, serial-rug deployer history, Solana-native honeypot check (freeze
 * authority + Token-2022 traps) and an exit-liquidity verdict. Every flag links
 * to its on-chain evidence transaction.
 *
 * 100 free queries/month per IP (no signup, no key). Then $0.01 USDC per query
 * via x402 on Solana — priced at cost.
 */

const API_BASE = process.env.CABAL_HUNTER_API ?? "https://api.cabal-hunter.com";
const MINT_RE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/;

export interface CabalScanResult {
  mint: string;
  recommendation?: "SAFE" | "REVIEW" | "AVOID";
  cabal_score?: number;
  risk?: string;
  top_reasons?: string[];
  honeypot_risk?: "LOW" | "HIGH";
  freeze_authority_revoked?: boolean;
  exit_liquidity_risk?: boolean;
  liquidity_usd?: number;
  deployer?: { verdict?: string; tokens_launched?: number; dead?: number };
  scan_complete?: boolean;
  wallets_checked?: number;
  [k: string]: unknown;
}

/** Direct programmatic scan — use this from your own strategy code. */
export async function checkCabalRisk(mint: string): Promise<CabalScanResult> {
  const res = await fetch(
    `${API_BASE}/api/scan-cabal?mintAddress=${encodeURIComponent(mint)}`,
    { signal: AbortSignal.timeout(30_000) },
  );
  if (!res.ok) throw new Error(`cabal-hunter scan failed: HTTP ${res.status}`);
  return (await res.json()) as CabalScanResult;
}

/** Simple boolean gate for trading loops: true = do not buy. */
export async function isRisky(mint: string, maxScore = 65): Promise<boolean> {
  try {
    const r = await checkCabalRisk(mint);
    return r.recommendation === "AVOID" || (r.cabal_score ?? 0) >= maxScore
      || r.honeypot_risk === "HIGH";
  } catch {
    return false; // fail open — availability of the scanner never blocks you
  }
}

function summarize(r: CabalScanResult): string {
  const lines = [
    `Cabal-Hunter scan for ${r.mint ?? "token"}:`,
    `verdict: ${r.recommendation ?? "?"} (cabal score ${r.cabal_score ?? "?"}/100, risk ${r.risk ?? "?"})`,
  ];
  if (r.honeypot_risk) lines.push(`honeypot risk: ${r.honeypot_risk}`);
  if (r.exit_liquidity_risk) lines.push(`exit-liquidity risk: YES — thin book vs mcap`);
  const dep = r.deployer;
  if (dep?.verdict) lines.push(`deployer: ${dep.verdict}${dep.tokens_launched ? ` (${dep.dead}/${dep.tokens_launched} past launches dead)` : ""}`);
  for (const reason of r.top_reasons ?? []) lines.push(`- ${reason}`);
  lines.push(`evidence + bubble map: ${API_BASE}/map?mint=${r.mint ?? ""}`);
  return lines.join("\n");
}

export const checkCabalRiskAction = {
  name: "CHECK_CABAL_RISK",
  similes: ["SCAN_TOKEN", "RUG_CHECK", "CABAL_SCAN", "TOKEN_SAFETY_CHECK"],
  description:
    "Scan a Solana token mint for coordinated cabals, same-block bundles, live coordinated dumps, " +
    "serial-rug deployers, honeypot mechanics (freeze authority / Token-2022 traps) and exit-liquidity " +
    "risk BEFORE buying. Use when a message contains a Solana mint address and the user (or the agent's " +
    "own trading logic) wants to know if the token is safe.",
  validate: async (_runtime: unknown, message: any): Promise<boolean> => {
    const text: string = message?.content?.text ?? "";
    return MINT_RE.test(text);
  },
  handler: async (
    _runtime: unknown,
    message: any,
    _state: unknown,
    _options: unknown,
    callback?: (content: { text: string; [k: string]: unknown }) => unknown,
  ): Promise<boolean> => {
    const text: string = message?.content?.text ?? "";
    const mint = text.match(MINT_RE)?.[0];
    if (!mint) return false;
    try {
      const report = await checkCabalRisk(mint);
      report.mint = report.mint ?? mint;
      await callback?.({ text: summarize(report), cabalReport: report });
      return true;
    } catch (err) {
      await callback?.({ text: `Cabal-Hunter scan failed for ${mint}: ${(err as Error).message}` });
      return false;
    }
  },
  examples: [
    [
      { name: "{{user1}}", content: { text: "Is 6Af1QWCvgJVxfg5GxKPfzn7BWR1ubi2p4w8hz355pump safe to buy?" } },
      { name: "{{agent}}", content: { text: "Cabal-Hunter scan: AVOID — one wallet holds 84.2% of supply. Cabal score 100/100.", actions: ["CHECK_CABAL_RISK"] } },
    ],
  ],
};

export const cabalHunterPlugin = {
  name: "cabal-hunter",
  description:
    "Solana token cabal/rug detection for trading agents — funding traces, bundle detection, deployer " +
    "history, honeypot + exit-liquidity checks via api.cabal-hunter.com. 100 free scans/month, no key.",
  actions: [checkCabalRiskAction],
};

export default cabalHunterPlugin;
