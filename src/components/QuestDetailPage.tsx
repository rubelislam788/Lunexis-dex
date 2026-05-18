// src/components/QuestDetailPage.tsx
"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { MissionTask, Page, Quest } from "@/types";
import { MISSION_STEP_PROOF_KEY, MISSION_TASKS_KEY } from "@/lib/mission-storage";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";

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

const SOCIAL_PROOF_KEY = "arcquest.social-proof.v1";
const MISSION_STEP_ACTION_LAUNCH_KEY = "arcquest.mission-step-action-launch.v1";

function normalizeExternalUrl(url: string) {
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
}

function missionSocialProofKey(questId: string, linkId: string) {
  return `${questId}-${linkId}`;
}

function getStepAction(step: MissionTask, quest: Quest, index: number): { label: string; page?: Page; link?: { id: string; url: string } } | null {
  const text = step.title.toLowerCase();
  if (/\bswaps?\b|\bswapping\b/.test(text)) return { label: "Do Swap", page: "swap" };
  if (/\bbridges?\b|\bbridging\b/.test(text)) return { label: "Do Bridge", page: "bridge" };
  if (/\bstakes?\b|\bstaking\b|\bstaked\b/.test(text)) return { label: "Do Stake", page: "staking" };
  const link = quest.socialLinks?.[index] ?? quest.socialLinks?.find((item) => text.includes(item.label.toLowerCase()));
  if (link?.url) return { label: `Open ${link.label}`, link: { id: link.id, url: link.url } };
  if (/\blink\b|\bvisit\b|\btwitter\b|\bx\b|\bdiscord\b|\btelegram\b|\bgithub\b|\bfollow\b|\bpost\b/i.test(step.title)) {
    const fallback = quest.socialLinks?.find((item) => item.url);
    if (fallback) return { label: `Open ${fallback.label}`, link: { id: fallback.id, url: fallback.url } };
  }
  return null;
}

function getStepActivityKind(step: MissionTask): "swap" | "bridge" | "stake" | null {
  const text = step.title.toLowerCase();
  if (/\bswaps?\b|\bswapping\b|swap transaction|token pair/i.test(text)) return "swap";
  if (/\bbridges?\b|\bbridging\b/i.test(text)) return "bridge";
  if (/\bstakes?\b|\bstaking\b|\bstaked\b/i.test(text)) return "stake";
  return null;
}

function missionStepLaunchKey(questId: string, stepId: string) {
  return `${questId}-${stepId}`;
}

export default function QuestDetailPage({ quest, onNavigate }: QuestDetailPageProps) {
  const { isConnected } = useAccount();
  const { profile, markMissionComplete } = useProfile();
  const { balances } = usePortfolioBalances();
  const [storedTasks, setStoredTasks] = useState<MissionTask[] | null>(null);
  const [verifiedTaskIds, setVerifiedTaskIds] = useState<string[]>([]);
  const [stepMessages, setStepMessages] = useState<Record<string, string>>({});

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
  const steps = displayQuest.tasks?.length
    ? displayQuest.tasks
    : (QUEST_STEPS[displayQuest.id] ?? ["Connect wallet.", "Complete the mission action.", "Return to claim rewards."]).map((title, index) => ({ id: `${displayQuest.id}-step-${index + 1}`, title }));
  const verifiedSet = new Set(verifiedTaskIds);
  const verifiedCount = steps.filter((step) => verifiedSet.has(step.id)).length;
  const progressPct = steps.length > 0 ? Math.min(100, (verifiedCount / steps.length) * 100) : 0;
  const allStepsVerified = steps.length > 0 && verifiedCount === steps.length;

  const saveVerifiedTask = (taskId: string) => {
    if (!quest) return;
    const nextIds = Array.from(new Set([...verifiedTaskIds, taskId]));
    setVerifiedTaskIds(nextIds);
    const nextVerified = new Set(nextIds);
    const missionComplete = steps.length > 0 && steps.every((step) => nextVerified.has(step.id));
    if (missionComplete && !profile?.completedMissionIds.includes(displayQuest.id)) {
      markMissionComplete(displayQuest.id, displayQuest.xp);
    }
    try {
      const stored = JSON.parse(window.localStorage.getItem(MISSION_STEP_PROOF_KEY) || "{}") as Record<string, string[]>;
      window.localStorage.setItem(MISSION_STEP_PROOF_KEY, JSON.stringify({ ...stored, [quest.id]: nextIds }));
    } catch {
      // Local proof is a convenience layer; profile completion is handled above.
    }
  };

  const markStepMessage = (taskId: string, message: string) => {
    setStepMessages((prev) => ({ ...prev, [taskId]: message }));
  };

  const saveLinkProof = (linkId: string) => {
    if (!quest) return;
    try {
      const stored = JSON.parse(window.localStorage.getItem(SOCIAL_PROOF_KEY) || "{}") as Record<string, boolean>;
      window.localStorage.setItem(SOCIAL_PROOF_KEY, JSON.stringify({ ...stored, [missionSocialProofKey(quest.id, linkId)]: true }));
    } catch {
      // Link proof is local progress; ignore storage errors.
    }
  };

  const saveStepLaunch = (taskId: string) => {
    if (!quest) return;
    try {
      const stored = JSON.parse(window.localStorage.getItem(MISSION_STEP_ACTION_LAUNCH_KEY) || "{}") as Record<string, number>;
      window.localStorage.setItem(MISSION_STEP_ACTION_LAUNCH_KEY, JSON.stringify({ ...stored, [missionStepLaunchKey(quest.id, taskId)]: Date.now() }));
    } catch {
      // The onchain or link proof is still checked after users return to the mission.
    }
  };

  const getStepLaunchTime = (taskId: string) => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(MISSION_STEP_ACTION_LAUNCH_KEY) || "{}") as Record<string, number>;
      const value = stored[missionStepLaunchKey(displayQuest.id, taskId)];
      return typeof value === "number" ? value : 0;
    } catch {
      return 0;
    }
  };

  const hasActivity = (kind: "swap" | "bridge" | "stake", since = 0) => {
    const activities = profile?.activities ?? [];
    return activities.some((activity) => {
      if (activity.status !== "completed") return false;
      if (since > 0 && new Date(activity.timestamp).getTime() + 1000 < since) return false;
      if (kind === "stake") return /\bstak/i.test(`${activity.title} ${activity.description}`);
      return activity.type === kind;
    });
  };

  const hasTokenBalance = (symbol: "USDC" | "EURC") => Number(balances.find((item) => item.token === symbol)?.amount ?? 0) > 0;

  const runStepAction = (step: MissionTask, index: number) => {
    const stepAction = getStepAction(step, displayQuest, index);
    if (!stepAction) return;
    if (stepAction.page) {
      saveStepLaunch(step.id);
      markStepMessage(step.id, `Opened ${stepAction.page}. Complete it, then return here to verify.`);
      onNavigate(stepAction.page);
      return;
    }
    if (stepAction.link) {
      saveStepLaunch(step.id);
      saveLinkProof(stepAction.link.id);
      window.open(normalizeExternalUrl(stepAction.link.url), "_blank", "noopener,noreferrer");
      saveVerifiedTask(step.id);
      markStepMessage(step.id, "Link opened from this mission and step proof saved.");
    }
  };

  const verifyTask = (step: MissionTask, index: number) => {
    const text = step.title.toLowerCase();
    if (/connect.*wallet|wallet/i.test(text) && !isConnected) {
      markStepMessage(step.id, "Connect wallet first.");
      return;
    }
    const stepAction = getStepAction(step, displayQuest, index);
    const needsMissionLaunch = Boolean(stepAction?.page);
    const launchTime = getStepLaunchTime(step.id);
    if (needsMissionLaunch && !launchTime) {
      markStepMessage(step.id, "Start this task from this mission step first.");
      return;
    }
    if (getStepActivityKind(step) === "swap" && !hasActivity("swap", launchTime)) {
      markStepMessage(step.id, "Complete a swap from this mission, then verify.");
      return;
    }
    if (getStepActivityKind(step) === "bridge" && !hasActivity("bridge", launchTime)) {
      markStepMessage(step.id, "Complete a bridge from this mission, then verify.");
      return;
    }
    if (getStepActivityKind(step) === "stake" && !hasActivity("stake", launchTime)) {
      markStepMessage(step.id, "Complete a stake from this mission, then verify.");
      return;
    }
    if (/\busdc\b/i.test(text) && !hasTokenBalance("USDC")) {
      markStepMessage(step.id, "Hold USDC on Arc Testnet first.");
      return;
    }
    if (/\beurc\b/i.test(text) && !hasTokenBalance("EURC")) {
      markStepMessage(step.id, "Hold EURC on Arc Testnet first.");
      return;
    }

    if (stepAction?.link) {
      try {
        const proof = JSON.parse(window.localStorage.getItem(SOCIAL_PROOF_KEY) || "{}") as Record<string, boolean>;
        if (!proof[missionSocialProofKey(displayQuest.id, stepAction.link.id)]) {
          markStepMessage(step.id, "Open the mission link from this step first.");
          return;
        }
      } catch {
        markStepMessage(step.id, "Open the mission link from this step first.");
        return;
      }
    }

    saveVerifiedTask(step.id);
    markStepMessage(step.id, "Step verified.");
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
                {steps.map((step, index) => {
                  const stepAction = getStepAction(step, displayQuest, index);
                  const activityKind = getStepActivityKind(step);
                  const launchTime = getStepLaunchTime(step.id);
                  const activityDoneFromMission = activityKind ? launchTime > 0 && hasActivity(activityKind, launchTime) : false;
                  const isVerified = verifiedSet.has(step.id);
                  const showActionButton = Boolean(stepAction && !isVerified && (!activityKind || !activityDoneFromMission));
                  const showVerifyButton = isVerified || !activityKind || activityDoneFromMission;

                  return (
                    <div
                      key={step.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl p-3"
                      role={stepAction?.page && !isVerified && !activityDoneFromMission ? "button" : undefined}
                      tabIndex={stepAction?.page && !isVerified && !activityDoneFromMission ? 0 : undefined}
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest("button")) return;
                        if (stepAction?.page && !isVerified && !activityDoneFromMission) runStepAction(step, index);
                      }}
                      onKeyDown={(event) => {
                        if ((event.key === "Enter" || event.key === " ") && stepAction?.page && !isVerified && !activityDoneFromMission) {
                          event.preventDefault();
                          runStepAction(step, index);
                        }
                      }}
                      style={{
                        background: isVerified ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.035)",
                        border: `1px solid ${isVerified ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.07)"}`,
                        cursor: stepAction?.page && !isVerified && !activityDoneFromMission ? "pointer" : "default",
                      }}
                    >
                      <div className="flex gap-3 items-center min-w-0">
                        <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isVerified ? "rgba(34,197,94,0.12)" : "rgba(0,220,229,0.1)", border: `1px solid ${isVerified ? "rgba(34,197,94,0.34)" : "rgba(0,220,229,0.3)"}`, color: isVerified ? "#22c55e" : "#00dce5", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 700 }}>
                        {String(index + 1).padStart(2, "0")}
                        </span>
                        <span style={{ color: isVerified ? "#d8ffe6" : "#c8d6d6", fontSize: 13, lineHeight: 1.8 }}>{step.title}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end">
                        {showActionButton && (
                          <button onClick={() => runStepAction(step, index)} className="btn-primary px-4 py-2 rounded-xl text-xs">
                            {stepAction?.label}
                          </button>
                        )}
                        {showVerifyButton && (
                          <button
                            onClick={() => verifyTask(step, index)}
                            disabled={isVerified}
                            className="btn-outline-cyan px-4 py-2 rounded-xl text-xs"
                          >
                            {isVerified ? "Verified" : "Check Step"}
                          </button>
                        )}
                        {!showVerifyButton && activityKind && launchTime > 0 && (
                          <div className="basis-full text-right" style={{ color: "#9fb4b8", fontSize: 11 }}>
                            Complete this {activityKind} task, then the verify button will appear.
                          </div>
                        )}
                        {stepMessages[step.id] && <div className="basis-full text-right" style={{ color: isVerified ? "#86efac" : "#ffb7eb", fontSize: 11 }}>{stepMessages[step.id]}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {allStepsVerified && (
                <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: "rgba(34,197,94,0.09)", border: "1px solid rgba(34,197,94,0.22)", color: "#86efac", fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 800 }}>
                  All mission steps are verified. Mission completion is saved to your profile.
                </div>
              )}
            </div>

            <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(0,220,229,0.06)", border: "1px solid rgba(0,220,229,0.14)", color: "#b9d9df", fontSize: 12 }}>
              Complete each task from its mission step. Tasks cannot be manually marked complete without the matching link, wallet, or onchain proof.
            </div>
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
