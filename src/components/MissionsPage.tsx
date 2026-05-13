// src/components/MissionsPage.tsx
"use client";

import type { Page, Quest } from "@/types";
import { useProfile } from "@/hooks/useProfile";
import { SOCIAL_LINKS } from "@/lib/constants";

export const QUESTS: Quest[] = [
  { id: "q1", title: "First Swap on Arc", description: "Complete your first token swap using Circle Arc App Kit on Arc Testnet.", reward: "500 ARCQ", rewardAmt: 500, xp: 250, difficulty: "Easy", category: "DeFi", progress: 0, totalSteps: 1, tags: ["Swap", "Arc Kit"], featured: true },
  { id: "q2", title: "Bridge to Arc", description: "Bridge 1 USDC from Ethereum Sepolia to Arc Testnet via CCTP v2.", reward: "800 ARCQ + NFT", rewardAmt: 800, xp: 400, difficulty: "Medium", category: "Bridge", progress: 0, totalSteps: 4, tags: ["Bridge", "CCTP", "USDC"], featured: true },
  { id: "q3", title: "Liquidity Provider", description: "Add liquidity to an Arc Testnet pool and hold for 24 hours.", reward: "1,200 ARCQ", rewardAmt: 1200, xp: 600, difficulty: "Medium", category: "DeFi", progress: 1, totalSteps: 3, tags: ["LP", "DeFi"] },
  { id: "q4", title: "Cross-Chain Arbitrageur", description: "Execute a swap + bridge in a single session to profit from price differences.", reward: "2,500 ARCQ", rewardAmt: 2500, xp: 1000, difficulty: "Hard", category: "Advanced", progress: 0, totalSteps: 5, tags: ["Swap", "Bridge", "Advanced"] },
  { id: "q5", title: "ARC Validator Supporter", description: "Stake ETH to support ARC network validators for 7 days.", reward: "3,000 ARCQ + ELITE", rewardAmt: 3000, xp: 1500, difficulty: "Elite", category: "Staking", progress: 0, totalSteps: 2, tags: ["Staking", "Elite"] },
  { id: "q6", title: "USDC OG", description: "Hold at least 10 USDC on Arc Testnet for 3 days.", reward: "200 ARCQ", rewardAmt: 200, xp: 100, difficulty: "Easy", category: "Holding", progress: 0, totalSteps: 1, tags: ["USDC", "Hold"] },
  { id: "social-follow", title: "Follow ARC Signals", description: "Follow Rubel and Arc on X to activate your social signal layer.", reward: "250 ARCQ", rewardAmt: 250, xp: 150, difficulty: "Easy", category: "Social", progress: 0, totalSteps: 2, tags: ["X", "Social"], featured: true },
  { id: "social-rubel-post", title: "Engage Rubel Dispatch", description: "Like and comment on Rubel's selected X post.", reward: "200 ARCQ", rewardAmt: 200, xp: 125, difficulty: "Easy", category: "Social", progress: 0, totalSteps: 1, tags: ["Like", "Comment"] },
  { id: "social-arc-post", title: "Engage Arc Dispatch", description: "Like and comment on Arc's selected X post.", reward: "200 ARCQ", rewardAmt: 200, xp: 125, difficulty: "Easy", category: "Social", progress: 0, totalSteps: 1, tags: ["Like", "Comment"] },
];

const DIFF_COLORS: Record<string, string> = {
  Easy: "#22c55e",
  Medium: "#f59e0b",
  Hard: "#ef4444",
  Elite: "#b600f8",
};

interface MissionsPageProps {
  onNavigate: (page: Page) => void;
  onSelectQuest: (questId: string) => void;
}

export default function MissionsPage({ onNavigate, onSelectQuest }: MissionsPageProps) {
  const { profile, isConnected, markMissionComplete, claim } = useProfile();
  return (
    <div className="min-h-screen pt-16 pl-64 arc-page-shell">
      <div className="relative z-10 max-w-6xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 arc-fade-up">
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 32, fontWeight: 900, color: "#e9feff", marginBottom: 4 }}>
              ARC Mission Grid
            </h1>
            <p style={{ color: "#849495", fontSize: 14 }}>
              {QUESTS.length} missions available · Earn ARCQ & climb the ranks
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onNavigate("swap")}
              className="btn-outline-cyan px-4 py-2 rounded-lg text-xs"
            >
              ⇄ Swap
            </button>
            <button
              onClick={() => onNavigate("bridge")}
              className="px-4 py-2 rounded-lg text-xs"
              style={{
                background: "rgba(182,0,248,0.08)",
                border: "1px solid rgba(182,0,248,0.3)",
                color: "#ebb2ff",
                fontFamily: "'Space Grotesk'",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Bridge
            </button>
          </div>
        </div>

        {/* Featured */}
        <div className="mb-8">
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#00dce5", marginBottom: 12, textTransform: "uppercase" }}>
            ★ Featured Missions
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUESTS.filter((q) => q.featured).map((quest) => (
              <QuestCard key={quest.id} quest={quest} onSelectQuest={onSelectQuest} completed={profile?.completedMissionIds.includes(quest.id)} claimed={profile?.claimedRewardIds.includes(quest.id)} onComplete={() => markMissionComplete(quest.id, quest.xp)} onClaim={() => claim(quest.id, quest.rewardAmt)} isConnected={isConnected} featured />
            ))}
          </div>
        </div>

        {/* All */}
        <div>
          <div style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#849495", marginBottom: 12, textTransform: "uppercase" }}>
            All Missions
          </div>
          <div className="flex flex-col gap-3">
            {QUESTS.filter((q) => !q.featured).map((quest) => (
              <QuestCard key={quest.id} quest={quest} onSelectQuest={onSelectQuest} completed={profile?.completedMissionIds.includes(quest.id)} claimed={profile?.claimedRewardIds.includes(quest.id)} onComplete={() => markMissionComplete(quest.id, quest.xp)} onClaim={() => claim(quest.id, quest.rewardAmt)} isConnected={isConnected} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestCard({ quest, onSelectQuest, completed, claimed, onComplete, onClaim, isConnected, featured }: { quest: Quest; onSelectQuest: (questId: string) => void; completed?: boolean; claimed?: boolean; onComplete: () => void; onClaim: () => void; isConnected: boolean; featured?: boolean }) {
  const progressPct = completed ? 100 : quest.totalSteps > 0 ? (quest.progress / quest.totalSteps) * 100 : 0;
  const isSocial = quest.category === "Social";
  const socialHref = quest.id === "social-rubel-post" ? SOCIAL_LINKS.rubelPost : quest.id === "social-arc-post" ? SOCIAL_LINKS.arcPost : SOCIAL_LINKS.rubel;
  return (
    <div
      className="rounded-xl p-5 cursor-pointer transition-all arc-card"
      style={{
        background: "#0e0e0f",
        border: `1px solid ${featured ? "rgba(0,220,229,0.2)" : "rgba(255,255,255,0.06)"}`,
        boxShadow: featured ? "0 0 20px rgba(0,220,229,0.06)" : "none",
      }}
      onClick={() => onSelectQuest(quest.id)}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "rgba(0,220,229,0.35)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = featured ? "rgba(0,220,229,0.2)" : "rgba(255,255,255,0.06)")}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 15, fontWeight: 700, color: "#e5e2e3", marginBottom: 4 }}>
            {quest.title}
          </h3>
          <p style={{ fontSize: 12, color: "#849495", lineHeight: 1.5 }}>{quest.description}</p>
        </div>
        <span
          className="ml-4 px-2 py-1 rounded-md flex-shrink-0"
          style={{
            fontFamily: "'Space Grotesk'",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: DIFF_COLORS[quest.difficulty],
            background: `${DIFF_COLORS[quest.difficulty]}18`,
            border: `1px solid ${DIFF_COLORS[quest.difficulty]}44`,
          }}
        >
          {completed ? "COMPLETED" : quest.difficulty.toUpperCase()}
        </span>
      </div>

      {/* Progress bar */}
      {quest.progress > 0 && (
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span style={{ fontSize: 10, color: "#555", fontFamily: "'Space Grotesk'" }}>Progress</span>
            <span style={{ fontSize: 10, color: "#00dce5", fontFamily: "'Space Grotesk'" }}>{quest.progress}/{quest.totalSteps}</span>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99 }}>
            <div className="stat-bar" style={{ width: `${progressPct}%`, height: "100%", background: "#00dce5", borderRadius: 99 }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-2 flex-wrap">
          {quest.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded-md" style={{ fontFamily: "'Space Grotesk'", fontSize: 9, fontWeight: 700, color: "#849495", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 700, color: "#00dce5" }}>{quest.reward}</span>
          <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, color: "#555" }}>+{quest.xp} XP</span>
        </div>
      </div>
      <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
        {isSocial && quest.id === "social-follow" && (
          <a href={SOCIAL_LINKS.arc} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 rounded-lg" style={{ fontSize: 10 }}>
            Open Arc
          </a>
        )}
        {isSocial && (
          <a href={socialHref} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 rounded-lg" style={{ fontSize: 10 }}>
            {quest.id === "social-follow" ? "Open Rubel" : "Open X"}
          </a>
        )}
        <button disabled={!isConnected || completed} onClick={onComplete} className="btn-outline-cyan px-3 py-2 rounded-lg" style={{ fontSize: 10 }}>
          {completed ? "Completed" : "Mark Complete"}
        </button>
        <button disabled={!completed || claimed} onClick={onClaim} className="btn-primary px-3 py-2 rounded-lg" style={{ fontSize: 10 }}>
          {claimed ? "Claimed" : "Claim"}
        </button>
      </div>
    </div>
  );
}
