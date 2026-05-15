// src/components/QuestDetailPage.tsx
"use client";

import { useEffect, useState } from "react";
import type { MissionTask, Page, Quest } from "@/types";

const MISSION_TASKS_KEY = "arcquest.mission-tasks.v1";
const MISSION_STEP_PROOF_KEY = "arcquest.mission-step-proof.v1";

const QUEST_ACTIONS: Record<string, { label: string; page: Page; accent: string }> = {
  q1: { label: "Open Swap", page: "swap", accent: "#00dce5" },
  q2: { label: "Open Swap", page: "swap", accent: "#ebb2ff" },
  q3: { label: "Open Swap", page: "swap", accent: "#00dce5" },
  q4: { label: "Start With Swap", page: "swap", accent: "#00dce5" },
};

const QUEST_STEPS: Record<string, string[]> = {
  q1: [
    "Connect a wallet on ARC Chain.",
    "Select a token pair in Swap.",
    "Confirm one onchain swap transaction.",
  ],
  q2: [
    "Connect your wallet.",
    "Open Swap.",
    "Hold a positive USDC balance.",
    "Refresh live balances.",
  ],
  q3: [
    "Connect a wallet on Arc Testnet.",
    "Hold a positive USDC balance.",
    "Hold a positive EURC balance after a swap.",
  ],
  q4: [
    "Complete a swap on ARC Chain.",
    "Keep USDC available.",
    "Keep gas available on Arc.",
    "Verify both actions.",
  ],
};

interface QuestDetailPageProps {
  quest?: Quest;
  onNavigate: (page: Page) => void;
}

export default function QuestDetailPage({ quest, onNavigate }: QuestDetailPageProps) {
  const [storedTasks, setStoredTasks] = useState<MissionTask[] | null>(null);
  const [verifiedTaskIds, setVerifiedTaskIds] = useState<string[]>([]);

  useEffect(() => {
    if (!quest) return;
    try {
      const stored = JSON.parse(window.localStorage.getItem(MISSION_TASKS_KEY) || "{}") as Record<string, MissionTask[]>;
      setStoredTasks(stored[quest.id] ?? null);
      const verified = JSON.parse(window.localStorage.getItem(MISSION_STEP_PROOF_KEY) || "{}") as Record<string, string[]>;
      setVerifiedTaskIds(verified[quest.id] ?? []);
    } catch {
      setStoredTasks(null);
      setVerifiedTaskIds([]);
    }
  }, [quest]);

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

  const displayQuest = storedTasks?.length ? { ...quest, tasks: storedTasks, totalSteps: storedTasks.length } : quest;
  const action = QUEST_ACTIONS[displayQuest.id] ?? { label: "Back to Missions", page: "missions" as Page, accent: "#00dce5" };
  const steps = displayQuest.tasks?.length
    ? displayQuest.tasks
    : (QUEST_STEPS[displayQuest.id] ?? ["Connect wallet.", "Complete the mission action.", "Return to claim rewards."]).map((title, index) => ({ id: `${displayQuest.id}-step-${index + 1}`, title }));
  const verifiedSet = new Set(verifiedTaskIds);
  const verifiedCount = steps.filter((step) => verifiedSet.has(step.id)).length;
  const progressPct = steps.length > 0 ? Math.min(100, (verifiedCount / steps.length) * 100) : 0;
  const allStepsVerified = steps.length > 0 && verifiedCount === steps.length;

  const verifyTask = (taskId: string) => {
    if (!quest) return;
    const nextIds = Array.from(new Set([...verifiedTaskIds, taskId]));
    setVerifiedTaskIds(nextIds);
    try {
      const stored = JSON.parse(window.localStorage.getItem(MISSION_STEP_PROOF_KEY) || "{}") as Record<string, string[]>;
      window.localStorage.setItem(MISSION_STEP_PROOF_KEY, JSON.stringify({ ...stored, [quest.id]: nextIds }));
    } catch {
      // Local proof is a convenience layer; mission verification still happens on the main Missions page.
    }
  };

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
              {displayQuest.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 rounded-md" style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700, color: "#849495", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {tag}
                </span>
              ))}
            </div>

            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 36, fontWeight: 900, color: "#e9feff", marginBottom: 12 }}>
              {displayQuest.title}
            </h1>
            <p style={{ color: "#b9caca", fontSize: 16, lineHeight: 1.7, marginBottom: 28 }}>
              {displayQuest.description}
            </p>

            <div className="rounded-xl p-4 mb-6" style={{ background: "rgba(0,220,229,0.04)", border: "1px solid rgba(0,220,229,0.16)" }}>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#00dce5", textTransform: "uppercase", marginBottom: 10 }}>
                Mission Steps
              </div>
              <div className="flex flex-col gap-3">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-3" style={{ background: verifiedSet.has(step.id) ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.035)", border: `1px solid ${verifiedSet.has(step.id) ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)"}` }}>
                    <div className="flex gap-3 items-center min-w-0">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: verifiedSet.has(step.id) ? "rgba(34,197,94,0.12)" : "rgba(0,220,229,0.1)", border: `1px solid ${verifiedSet.has(step.id) ? "rgba(34,197,94,0.34)" : "rgba(0,220,229,0.3)"}`, color: verifiedSet.has(step.id) ? "#22c55e" : "#00dce5", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700 }}>
                      {String(index + 1).padStart(2, "0")}
                      </span>
                      <span style={{ color: verifiedSet.has(step.id) ? "#d8ffe6" : "#c8d6d6", fontSize: 13, lineHeight: 1.8 }}>{step.title}</span>
                    </div>
                    <button
                      onClick={() => verifyTask(step.id)}
                      disabled={verifiedSet.has(step.id)}
                      className="btn-outline-cyan px-4 py-2 rounded-xl text-xs"
                    >
                      {verifiedSet.has(step.id) ? "Verified" : "Verify Step"}
                    </button>
                  </div>
                ))}
              </div>
              {allStepsVerified && (
                <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: "rgba(34,197,94,0.09)", border: "1px solid rgba(34,197,94,0.22)", color: "#86efac", fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 800 }}>
                  All mission steps are verified. Return to Missions to confirm the full mission.
                </div>
              )}
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
                {displayQuest.reward}
              </div>
              <div style={{ color: "#849495", fontSize: 13 }}>
                +{displayQuest.xp} XP / {displayQuest.difficulty} / {displayQuest.category}
              </div>
            </div>

            <div className="rounded-2xl p-5 arc-card" style={{ background: "#0e0e0f", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex justify-between mb-2">
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: "#849495" }}>Progress</span>
                <span style={{ fontFamily: "'Space Grotesk'", fontSize: 11, color: "#00dce5" }}>{verifiedCount}/{steps.length}</span>
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
