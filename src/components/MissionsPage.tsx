// src/components/MissionsPage.tsx
"use client";

import { useEffect, useState } from "react";
import type { Page, Quest } from "@/types";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import { SOCIAL_LINKS } from "@/lib/constants";
import FaucetButton from "@/components/ui/FaucetButton";

type VerifyState = "idle" | "checking" | "success" | "failed";
type SocialProof = Record<string, boolean>;

export const QUESTS: Quest[] = [
  { id: "q1", title: "Arc Swap Initiation", description: "Complete a confirmed token swap on Arc and activate your operator route.", reward: "500 ARCQ", rewardAmt: 500, xp: 250, difficulty: "Easy", category: "DeFi", progress: 0, totalSteps: 1, tags: ["Swap", "Arc Kit"], featured: true },
  { id: "q2", title: "Bridge the Arc Gate", description: "Move assets through the bridge and confirm a cross-chain transaction on your wallet history.", reward: "800 ARCQ + NFT", rewardAmt: 800, xp: 400, difficulty: "Medium", category: "Bridge", progress: 0, totalSteps: 4, tags: ["Bridge", "CCTP", "USDC"], featured: true },
  { id: "q3", title: "Liquidity Beacon", description: "Establish liquidity presence in the Arc ecosystem and prepare for sustained network participation.", reward: "1,200 ARCQ", rewardAmt: 1200, xp: 600, difficulty: "Medium", category: "DeFi", progress: 1, totalSteps: 3, tags: ["LP", "DeFi"] },
  { id: "q4", title: "Route Pathfinder", description: "Complete both a swap and a bridge to prove multi-route operator capability.", reward: "2,500 ARCQ", rewardAmt: 2500, xp: 1000, difficulty: "Hard", category: "Advanced", progress: 0, totalSteps: 5, tags: ["Swap", "Bridge", "Advanced"] },
  { id: "q5", title: "Validator Signal", description: "Signal validator support and prepare your wallet for future Arc staking missions.", reward: "3,000 ARCQ + ELITE", rewardAmt: 3000, xp: 1500, difficulty: "Elite", category: "Staking", progress: 0, totalSteps: 2, tags: ["Staking", "Elite"] },
  { id: "q6", title: "USDC Vault Access", description: "Hold at least 10 USDC in your Arc Quest portfolio to unlock stablecoin operator status.", reward: "200 ARCQ", rewardAmt: 200, xp: 100, difficulty: "Easy", category: "Holding", progress: 0, totalSteps: 1, tags: ["USDC", "Hold"] },
  { id: "social-follow", title: "Community Signal", description: "Join the Arc community pulse by following both Rubel and Arc on X.", reward: "250 ARCQ", rewardAmt: 250, xp: 150, difficulty: "Easy", category: "Social", progress: 0, totalSteps: 2, tags: ["X", "Social"], featured: true },
  { id: "social-rubel-post", title: "Operator Relay", description: "Boost the operator channel by reacting to Rubel's selected ecosystem post.", reward: "200 ARCQ", rewardAmt: 200, xp: 125, difficulty: "Easy", category: "Social", progress: 0, totalSteps: 1, tags: ["Signal", "Comment"] },
  { id: "social-arc-post", title: "ARC Social Pulse", description: "Confirm your network presence by engaging with Arc's selected community post.", reward: "200 ARCQ", rewardAmt: 200, xp: 125, difficulty: "Easy", category: "Social", progress: 0, totalSteps: 1, tags: ["Pulse", "Comment"] },
];

const DIFF_COLORS: Record<string, string> = {
  Easy: "#22c55e",
  Medium: "#f59e0b",
  Hard: "#ef4444",
  Elite: "#ff2db2",
};

const MISSION_ICONS: Record<string, string> = {
  q1: "swap_horiz",
  q2: "hub",
  q3: "waterfall_chart",
  q4: "route",
  q5: "verified_user",
  q6: "account_balance_wallet",
  "social-follow": "diversity_3",
  "social-rubel-post": "rss_feed",
  "social-arc-post": "cell_tower",
};

const PROOF_KEY = "arcquest.social-proof.v1";

interface MissionsPageProps {
  onNavigate: (page: Page) => void;
  onSelectQuest: (questId: string) => void;
}

export default function MissionsPage({ onNavigate, onSelectQuest }: MissionsPageProps) {
  const { profile, isConnected, markMissionComplete, claim } = useProfile();
  const { balances } = usePortfolioBalances();
  const [proof, setProof] = useState<SocialProof>({});
  const [verifyStates, setVerifyStates] = useState<Record<string, VerifyState>>({});
  const [verifyMessages, setVerifyMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      setProof(JSON.parse(window.localStorage.getItem(PROOF_KEY) || "{}"));
    } catch {
      setProof({});
    }
  }, []);

  const saveProof = (key: string) => {
    const next = { ...proof, [key]: true };
    setProof(next);
    window.localStorage.setItem(PROOF_KEY, JSON.stringify(next));
  };

  const hasActivity = (type: "swap" | "bridge") => profile?.activities.some((item) => item.type === type && item.status === "completed");
  const hasUsdcBalance = Number(balances.find((item) => item.token === "USDC")?.amount ?? 0) >= 10;

  const validateQuest = (quest: Quest) => {
    if (!profile) return { ok: false, message: "Connect your wallet before verification." };
    if (quest.id === "q1") return hasActivity("swap") ? { ok: true, message: "Swap transaction confirmed." } : { ok: false, message: "No confirmed swap transaction found." };
    if (quest.id === "q2") return hasActivity("bridge") ? { ok: true, message: "Bridge transaction confirmed." } : { ok: false, message: "No confirmed bridge transaction found." };
    if (quest.id === "q4") return hasActivity("swap") && hasActivity("bridge") ? { ok: true, message: "Swap and bridge route confirmed." } : { ok: false, message: "Complete both a swap and a bridge first." };
    if (quest.id === "q6") return hasUsdcBalance ? { ok: true, message: "USDC balance requirement met." } : { ok: false, message: "Hold at least 10 USDC before verifying." };
    if (quest.id === "social-follow") return proof.rubelFollow && proof.arcFollow ? { ok: true, message: "Community follows verified." } : { ok: false, message: "Open both X profiles before verification." };
    if (quest.id === "social-rubel-post") return proof.rubelPost ? { ok: true, message: "Rubel post engagement verified." } : { ok: false, message: "Open and complete the Rubel post action first." };
    if (quest.id === "social-arc-post") return proof.arcPost ? { ok: true, message: "Arc post engagement verified." } : { ok: false, message: "Open and complete the Arc post action first." };
    return { ok: false, message: "This verifier is not active yet. Try an onchain or social mission." };
  };

  const verifyQuest = (quest: Quest) => {
    if (!isConnected) {
      setVerifyStates((prev) => ({ ...prev, [quest.id]: "failed" }));
      setVerifyMessages((prev) => ({ ...prev, [quest.id]: "Connect wallet to verify mission activity." }));
      return;
    }

    setVerifyStates((prev) => ({ ...prev, [quest.id]: "checking" }));
    setVerifyMessages((prev) => ({ ...prev, [quest.id]: quest.category === "Social" ? "Checking Activity..." : "Scanning Wallet Activity..." }));

    window.setTimeout(() => {
      setVerifyMessages((prev) => ({ ...prev, [quest.id]: quest.category === "Social" ? "Verifying engagement action..." : "Verifying Onchain Action..." }));
    }, 850);

    window.setTimeout(() => {
      const result = validateQuest(quest);
      if (result.ok) {
        markMissionComplete(quest.id, quest.xp);
        setVerifyStates((prev) => ({ ...prev, [quest.id]: "success" }));
      } else {
        setVerifyStates((prev) => ({ ...prev, [quest.id]: "failed" }));
      }
      setVerifyMessages((prev) => ({ ...prev, [quest.id]: result.message }));
    }, 1700);
  };

  return (
    <div className="arc-with-sidebar-page arc-page-shell">
      <div className="relative z-10 max-w-6xl mx-auto px-8 py-10">
        <div className="flex justify-between items-center mb-8 arc-fade-up">
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 32, fontWeight: 900, color: "#e9feff", marginBottom: 4 }}>
              ARC Mission Grid
            </h1>
            <p style={{ color: "#849495", fontSize: 14 }}>
              Verify real activity, unlock XP, and build your operator history.
            </p>
          </div>
          <div className="flex gap-3">
            <FaucetButton label="Need Test USDC?" compact />
            <button onClick={() => onNavigate("swap")} className="btn-outline-cyan px-4 py-2 rounded-lg text-xs">Swap</button>
            <button onClick={() => onNavigate("bridge")} className="btn-outline-cyan px-4 py-2 rounded-lg text-xs">Bridge</button>
          </div>
        </div>

        <MissionSection
          title="Featured Missions"
          quests={QUESTS.filter((quest) => quest.featured)}
          profile={profile}
          onSelectQuest={onSelectQuest}
          onVerify={verifyQuest}
          onClaim={(quest) => claim(quest.id, quest.rewardAmt)}
          saveProof={saveProof}
          verifyStates={verifyStates}
          verifyMessages={verifyMessages}
        />

        <MissionSection
          title="All Missions"
          quests={QUESTS.filter((quest) => !quest.featured)}
          profile={profile}
          onSelectQuest={onSelectQuest}
          onVerify={verifyQuest}
          onClaim={(quest) => claim(quest.id, quest.rewardAmt)}
          saveProof={saveProof}
          verifyStates={verifyStates}
          verifyMessages={verifyMessages}
        />
      </div>
    </div>
  );
}

function MissionSection({
  title,
  quests,
  profile,
  onSelectQuest,
  onVerify,
  onClaim,
  saveProof,
  verifyStates,
  verifyMessages,
}: {
  title: string;
  quests: Quest[];
  profile: ReturnType<typeof useProfile>["profile"];
  onSelectQuest: (questId: string) => void;
  onVerify: (quest: Quest) => void;
  onClaim: (quest: Quest) => void;
  saveProof: (key: string) => void;
  verifyStates: Record<string, VerifyState>;
  verifyMessages: Record<string, string>;
}) {
  return (
    <section className="mb-8">
      <div style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "#00dce5", marginBottom: 12, textTransform: "uppercase" }}>
        {title}
      </div>
      <div className={title === "Featured Missions" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "flex flex-col gap-3"}>
        {quests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            completed={profile?.completedMissionIds.includes(quest.id)}
            claimed={profile?.claimedRewardIds.includes(quest.id)}
            verifyState={verifyStates[quest.id] ?? "idle"}
            verifyMessage={verifyMessages[quest.id]}
            onSelectQuest={onSelectQuest}
            onVerify={() => onVerify(quest)}
            onClaim={() => onClaim(quest)}
            saveProof={saveProof}
            featured={quest.featured}
          />
        ))}
      </div>
    </section>
  );
}

function QuestCard({
  quest,
  completed,
  claimed,
  verifyState,
  verifyMessage,
  onSelectQuest,
  onVerify,
  onClaim,
  saveProof,
  featured,
}: {
  quest: Quest;
  completed?: boolean;
  claimed?: boolean;
  verifyState: VerifyState;
  verifyMessage?: string;
  onSelectQuest: (questId: string) => void;
  onVerify: () => void;
  onClaim: () => void;
  saveProof: (key: string) => void;
  featured?: boolean;
}) {
  const progressPct = completed ? 100 : quest.progress > 0 ? (quest.progress / quest.totalSteps) * 100 : verifyState === "checking" ? 58 : 0;
  const isChecking = verifyState === "checking";
  const socialHref = quest.id === "social-rubel-post" ? SOCIAL_LINKS.rubelPost : quest.id === "social-arc-post" ? SOCIAL_LINKS.arcPost : SOCIAL_LINKS.rubel;

  return (
    <article
      className="arc-mission-card rounded-2xl p-5 cursor-pointer transition-all arc-card"
      style={{
        border: `1px solid ${completed ? "rgba(34,197,94,0.42)" : featured ? "rgba(0,220,229,0.22)" : "rgba(255,255,255,0.06)"}`,
        boxShadow: completed ? "0 0 26px rgba(34,197,94,0.14)" : featured ? "0 0 20px rgba(0,220,229,0.08)" : "none",
      }}
      onClick={() => onSelectQuest(quest.id)}
    >
      <div className="flex justify-between gap-4">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl grid place-items-center" style={{ background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.24)", boxShadow: "0 0 20px rgba(56,189,248,0.12)" }}>
            <span className="material-symbols-outlined" style={{ color: "#38bdf8", fontSize: 24 }}>{MISSION_ICONS[quest.id] ?? "auto_awesome"}</span>
          </div>
          <div>
            <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 900, color: "#f8fbff", marginBottom: 5 }}>
              {quest.title}
            </h3>
            <p style={{ fontSize: 13, color: "#9fb1c1", lineHeight: 1.55 }}>{quest.description}</p>
          </div>
        </div>
        <span className="px-2 py-1 rounded-md h-fit" style={{ fontFamily: "'Space Grotesk'", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: completed ? "#22c55e" : DIFF_COLORS[quest.difficulty], background: completed ? "rgba(34,197,94,0.12)" : `${DIFF_COLORS[quest.difficulty]}18`, border: `1px solid ${completed ? "rgba(34,197,94,0.32)" : `${DIFF_COLORS[quest.difficulty]}44`}` }}>
          {completed ? "COMPLETED" : quest.difficulty.toUpperCase()}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex justify-between mb-1">
          <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, color: "#849495", textTransform: "uppercase" }}>{completed ? "Signal Confirmed" : isChecking ? "Verification Running" : "Awaiting Verification"}</span>
          <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, color: "#38bdf8" }}>+{quest.xp} XP</span>
        </div>
        <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
          <div className="stat-bar" style={{ width: `${progressPct}%`, height: "100%", background: completed ? "#22c55e" : "linear-gradient(90deg,#38bdf8,#ff2db2)", borderRadius: 99 }} />
        </div>
      </div>

      {verifyMessage && (
        <div className="mt-3 rounded-xl p-3" style={{ background: verifyState === "failed" ? "rgba(255,80,80,0.08)" : "rgba(56,189,248,0.07)", border: `1px solid ${verifyState === "failed" ? "rgba(255,80,80,0.18)" : "rgba(56,189,248,0.16)"}`, color: verifyState === "failed" ? "#ffb4ab" : "#b9eaff", fontSize: 12 }}>
          {isChecking && <span className="spinner inline-block w-3 h-3 mr-2 align-middle" />}
          {verifyMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4" onClick={(event) => event.stopPropagation()}>
        <div className="flex gap-2 flex-wrap">
          {quest.tags.map((tag) => (
            <span key={tag} className="px-2 py-1 rounded-md" style={{ fontFamily: "'Space Grotesk'", fontSize: 9, fontWeight: 800, color: "#849495", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {tag}
            </span>
          ))}
          <span className="px-2 py-1 rounded-md" style={{ fontFamily: "'Space Grotesk'", fontSize: 9, fontWeight: 800, color: "#00dce5", background: "rgba(0,220,229,0.07)", border: "1px solid rgba(0,220,229,0.16)" }}>
            {quest.reward}
          </span>
        </div>

        <div className="flex gap-2">
          {quest.category === "Social" && quest.id === "social-follow" && (
            <a href={SOCIAL_LINKS.arc} target="_blank" rel="noreferrer" onClick={() => saveProof("arcFollow")} className="btn-ghost px-3 py-2 rounded-lg" style={{ fontSize: 10 }}>Open Arc</a>
          )}
          {quest.category === "Social" && (
            <a href={socialHref} target="_blank" rel="noreferrer" onClick={() => saveProof(quest.id === "social-follow" ? "rubelFollow" : quest.id === "social-rubel-post" ? "rubelPost" : "arcPost")} className="btn-ghost px-3 py-2 rounded-lg" style={{ fontSize: 10 }}>
              {quest.id === "social-follow" ? "Open Rubel" : "Open Signal"}
            </a>
          )}
          <button disabled={completed || isChecking} onClick={onVerify} className="btn-outline-cyan px-3 py-2 rounded-lg" style={{ fontSize: 10 }}>
            {isChecking ? "Checking..." : completed ? "Verified" : "Verify"}
          </button>
          <button disabled={!completed || claimed} onClick={onClaim} className="btn-primary px-3 py-2 rounded-lg" style={{ fontSize: 10 }}>
            {claimed ? "Claimed" : "Claim"}
          </button>
        </div>
      </div>
    </article>
  );
}
