"use client";

import { useMemo, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import TokenIcon from "@/components/ui/TokenIcon";

function parseUsd(value?: string) {
  const numeric = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseAmount(value?: string) {
  const numeric = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

export default function SmartPortfolioAssistant({ compact = false }: { compact?: boolean }) {
  const { profile } = useProfile();
  const { balances } = usePortfolioBalances();
  const [expanded, setExpanded] = useState("allocation");

  const analysis = useMemo(() => {
    const totalValue = balances.reduce((sum, item) => sum + parseUsd(item.value), 0);
    const sorted = [...balances].sort((a, b) => parseAmount(b.amount) - parseAmount(a.amount));
    const topHolding = sorted[0];
    const inactive = balances.filter((item) => parseAmount(item.amount) <= 0);
    const contracts = new Set((profile?.activities ?? []).filter((item) => item.txHash).map((item) => item.txHash)).size;
    const approvalActivities = (profile?.activities ?? []).filter((item) => /approve|approval/i.test(`${item.title} ${item.description}`));
    const riskyApproval = approvalActivities.length > 0;

    return {
      totalValue,
      topHolding,
      inactive,
      contracts,
      riskyApproval,
      approvalActivities,
      allocations: balances.map((item) => {
        const value = parseUsd(item.value);
        return {
          ...item,
          percent: totalValue > 0 ? (value / totalValue) * 100 : balances.length ? 100 / balances.length : 0,
        };
      }),
    };
  }, [balances, profile?.activities]);

  const insightText = analysis.topHolding
    ? `${analysis.topHolding.token} is your largest holding. ${analysis.riskyApproval ? "One approval event needs review." : "No high-risk approval pattern is indexed."}`
    : "Connect and sync your wallet to unlock live portfolio intelligence.";

  const sections = [
    {
      id: "allocation",
      label: "Allocation",
      body: (
        <div className="grid gap-3">
          {analysis.allocations.map((item) => (
            <div key={item.token} className="lunexis-allocation-row">
              <div className="flex items-center gap-2">
                <TokenIcon symbol={item.token} size={30} />
                <span>{item.token}</span>
              </div>
              <div className="flex-1 h-2 rounded-full overflow-hidden">
                <i style={{ width: `${Math.min(100, Math.max(0, item.percent))}%`, background: `linear-gradient(90deg, #00dce5, #8b5cf6)` }} />
              </div>
              <strong>{item.percent.toFixed(1)}%</strong>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "risk",
      label: "Risk Scan",
      body: (
        <div className="grid gap-2 text-sm">
          <p>{analysis.riskyApproval ? "Approval activity detected. Review spenders before large swaps." : "No risky indexed approvals detected from app activity."}</p>
          <p>You interacted with {analysis.contracts} recent onchain transaction references.</p>
        </div>
      ),
    },
    {
      id: "rebalance",
      label: "Smart Swaps",
      body: (
        <div className="grid gap-2 text-sm">
          <p>{analysis.topHolding ? `Consider balancing ${analysis.topHolding.token} exposure with USDC/EURC liquidity if one asset dominates.` : "Balance suggestions will appear after live balances sync."}</p>
          <p>{analysis.inactive.length ? `Inactive assets: ${analysis.inactive.map((item) => item.token).join(", ")}.` : "All indexed assets have activity."}</p>
        </div>
      ),
    },
  ];

  if (compact) {
    return (
      <section className="lunexis-wallet-intelligence-mini">
        <div className="lunexis-wallet-intelligence-mini-head">
          <span className="material-symbols-outlined" aria-hidden="true">psychology</span>
          <div>
            <div className="lunexis-kicker">Wallet Intelligence</div>
            <p>{insightText}</p>
          </div>
        </div>
        <div className="lunexis-wallet-intelligence-mini-grid">
          <div><span>Top</span><strong>{analysis.topHolding?.token ?? "Syncing"}</strong></div>
          <div><span>Risk</span><strong>{analysis.riskyApproval ? "Review" : "Low"}</strong></div>
          <div><span>Tx refs</span><strong>{analysis.contracts}</strong></div>
          <div><span>Inactive</span><strong>{analysis.inactive.length}</strong></div>
        </div>
        <div className="lunexis-wallet-intelligence-mini-bars">
          {analysis.allocations.slice(0, 4).map((item) => (
            <div key={item.token}>
              <span>{item.token}</span>
              <i><b style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }} /></i>
              <strong>{item.percent.toFixed(0)}%</strong>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="lunexis-premium-card lunexis-ai-assistant">
      <div className="lunexis-ai-core">
        <span className="material-symbols-outlined">auto_awesome</span>
      </div>
      <div>
        <div className="lunexis-kicker">Smart AI Portfolio Assistant</div>
        <h2>Wallet Intelligence</h2>
        <p className="lunexis-typing">{insightText}</p>
      </div>
      <div className="lunexis-insight-grid">
        <div><span>Top holding</span><strong>{analysis.topHolding?.token ?? "Syncing"}</strong></div>
        <div><span>Estimated P/L</span><strong>{analysis.totalValue > 0 ? "+0.0%" : "N/A"}</strong></div>
        <div><span>Inactive assets</span><strong>{analysis.inactive.length}</strong></div>
        <div><span>Risk level</span><strong>{analysis.riskyApproval ? "Review" : "Low"}</strong></div>
      </div>
      <div className="lunexis-analysis-tabs">
        {sections.map((section) => (
          <button key={section.id} onClick={() => setExpanded(section.id)} className={expanded === section.id ? "is-active" : ""}>{section.label}</button>
        ))}
      </div>
      <div className="lunexis-analysis-body">
        {sections.find((section) => section.id === expanded)?.body}
      </div>
    </section>
  );
}
