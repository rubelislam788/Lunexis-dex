// src/components/QuestDetailPage.tsx
"use client";

import type { Page, Quest } from "@/types";

const QUEST_ACTIONS: Record<string, { label: string; page: Page; accent: string }> = {
  q1: { label: "Open Swap", page: "swap", accent: "#00dce5" },
  q2: { label: "Open Bridge", page: "bridge", accent: "#ebb2ff" },
  q3: { label: "View Swap Tools", page: "swap", accent: "#00dce5" },
  q4: { label: "Start With Swap", page: "swap", accent: "#00dce5" },
  q5: { label: "View Missions", page: "missions", accent: "#b600f8" },
  q6: { label: "Open Bridge", page: "bridge", accent: "#ebb2ff" },
};

const QUEST_STEPS: Record<string, string[]> = {
  q1: [
    "Connect a wallet on ARC Chain.",
    "Open the swap tool and select USDC to EURO.",
    "Enter an amount and confirm the transaction.",
  ],
  q2: [
    "Connect your wallet.",
    "Open the bridge tool.",
    "Set From Chain to Ethereum Sepolia and To Chain to ARC Chain.",
    "Bridge 1 USDC using Circle CCTP v2.",
  ],
  q3: [
    "Prepare testnet liquidity assets.",
    "Add liquidity to an ARC Chain pool.",
    "Hold the position for 24 hours.",
  ],
  q4: [
    "Complete a swap on ARC Chain.",
    "Bridge USDC across supported testnets.",
    "Finish both actions in the same session.",
  ],
  q5: [
    "Prepare testnet ETH.",
    "Stake ETH to support Arc validators.",
    "Keep the stake active for 7 days.",
  ],
  q6: [
    "Bridge or receive USDC on ARC Chain.",
    "Keep at least 10 USDC in the connected wallet.",
    "Hold the balance for 3 days.",
  ],
};

interface QuestDetailPageProps {
  quest?: Quest;
  onNavigate: (page: Page) => void;
}

export default function QuestDetailPage({ quest, onNavigate }: QuestDetailPageProps) {
  if (!quest) {
    return (
      <div className="arc-with-sidebar-page flex items-center justify-center arc-page-shell">
        <div className="text-center">
          <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 36, fontWeight: 900, color: "#e9feff", marginBottom: 12 }}>
            Quest Not Found
          </h1>
          <button onClick={() => onNavigate("missions")} className="btn-outline-cyan px-6 py-3 rounded-lg text-sm">
            Back to Missions
          </button>
        </div>
      </div>
    );
  }

  const action = QUEST_ACTIONS[quest.id] ?? { label: "Back to Missions", page: "missions" as Page, accent: "#00dce5" };
  const steps = QUEST_STEPS[quest.id] ?? ["Connect wallet.", "Complete the mission action.", "Return to claim rewards."];
  const progressPct = quest.totalSteps > 0 ? Math.min(100, (quest.progress / quest.totalSteps) * 100) : 0;

  return (
    <div className="arc-with-sidebar-page arc-page-shell">
      <div className="relative z-10 max-w-6xl mx-auto px-8 py-10">
        <button
          onClick={() => onNavigate("missions")}
          className="mb-6 px-4 py-2 rounded-lg"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#849495",
            fontFamily: "'Space Grotesk'",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Back to Missions
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section className="lg:col-span-3 rounded-2xl p-6 arc-card" style={{ background: "#0e0e0f", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex flex-wrap gap-2 mb-5">
              {quest.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 rounded-md" style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, color: "#849495", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {tag}
                </span>
              ))}
            </div>

            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 36, fontWeight: 900, color: "#e9feff", marginBottom: 12 }}>
              {quest.title}
            </h1>
            <p style={{ color: "#b9caca", fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>
              {quest.description}
            </p>

            <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(0,220,229,0.04)", border: "1px solid rgba(0,220,229,0.16)" }}>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#00dce5", textTransform: "uppercase", marginBottom: 10 }}>
                Mission Steps
              </div>
              <div className="flex flex-col gap-3">
                {steps.map((step, index) => (
                  <div key={step} className="flex gap-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,220,229,0.1)", border: "1px solid rgba(0,220,229,0.3)", color: "#00dce5", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700 }}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span style={{ color: "#c8d6d6", fontSize: 13, lineHeight: 1.8 }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onNavigate(action.page)}
              className="w-full py-4 rounded-xl transition-all"
              style={{
                background: `linear-gradient(135deg, ${action.accent}, #00dce5)`,
                color: "white",
                fontFamily: "'Space Grotesk'",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {action.label}
            </button>
          </section>

          <aside className="lg:col-span-2 flex flex-col gap-4">
            <div className="rounded-2xl p-5 arc-card" style={{ background: "#0e0e0f", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 700, color: "#849495", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
                Reward
              </div>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 900, color: "#00dce5", marginBottom: 8 }}>
                {quest.reward}
              </div>
              <div style={{ color: "#849495", fontSize: 13 }}>
                +{quest.xp} XP / {quest.difficulty} / {quest.category}
              </div>
            </div>

            <div className="rounded-2xl p-5 arc-card" style={{ background: "#0e0e0f", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex justify-between mb-2">
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: "#849495" }}>Progress</span>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: "#00dce5" }}>{quest.progress}/{quest.totalSteps}</span>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
                <div style={{ width: `${progressPct}%`, height: "100%", background: "#00dce5", borderRadius: 99 }} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
