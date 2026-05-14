// src/components/MissionsPage.tsx
"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { MissionTask, Page, Quest } from "@/types";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import { SOCIAL_LINKS } from "@/lib/constants";
import { getArcNativeBalance, getTransactionReceiptAnyChain } from "@/lib/onchain";
import FaucetButton from "@/components/ui/FaucetButton";

type VerifyState = "idle" | "checking" | "success" | "failed";
type SocialProof = Record<string, boolean>;

export const QUESTS: Quest[] = [
  { id: "q1", title: "Arc Swap Initiation", description: "Complete a confirmed token swap on Arc and activate your operator route.", reward: "500 ARCQ", rewardAmt: 500, xp: 250, difficulty: "Easy", category: "DeFi", progress: 0, totalSteps: 3, tags: ["Swap", "Arc"], featured: true, tasks: [
    { id: "q1-t1", title: "Connect wallet on Arc Testnet." },
    { id: "q1-t2", title: "Select a token pair in Swap." },
    { id: "q1-t3", title: "Confirm one onchain swap transaction." },
  ] },
  { id: "q2", title: "Arc Liquidity Signal", description: "Hold Arc ecosystem assets and refresh your live wallet balances.", reward: "800 ARCQ + NFT", rewardAmt: 800, xp: 400, difficulty: "Medium", category: "Portfolio", progress: 0, totalSteps: 4, tags: ["Balance", "USDC"], featured: true, tasks: [
    { id: "q2-t1", title: "Connect wallet." },
    { id: "q2-t2", title: "Open Swap." },
    { id: "q2-t3", title: "Hold a positive USDC balance." },
    { id: "q2-t4", title: "Refresh live balances." },
  ] },
  { id: "q3", title: "Stablecoin Pair Operator", description: "Hold both USDC and EURC on Arc Testnet to prove you can operate the live swap route.", reward: "1,200 ARCQ", rewardAmt: 1200, xp: 600, difficulty: "Medium", category: "DeFi", progress: 0, totalSteps: 3, tags: ["USDC", "EURC"], tasks: [
    { id: "q3-t1", title: "Hold a positive USDC balance." },
    { id: "q3-t2", title: "Hold a positive EURC balance." },
    { id: "q3-t3", title: "Refresh portfolio balances." },
  ] },
  { id: "q4", title: "Route Pathfinder", description: "Complete a swap and keep gas available to prove operator capability.", reward: "2,500 ARCQ", rewardAmt: 2500, xp: 1000, difficulty: "Hard", category: "Advanced", progress: 0, totalSteps: 4, tags: ["Swap", "Gas"], tasks: [
    { id: "q4-t1", title: "Complete one swap." },
    { id: "q4-t2", title: "Keep USDC available." },
    { id: "q4-t3", title: "Keep gas available on Arc." },
    { id: "q4-t4", title: "Verify both actions." },
  ] },
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
const MISSION_TASKS_KEY = "arcquest.mission-tasks.v1";
const MISSION_CUSTOM_KEY = "arcquest.mission-custom.v1";
const MISSION_CREATED_KEY = "arcquest.mission-created.v1";
const MISSION_ADMIN_ADDRESS = "0x01176d7052A51471a43E01A467fC572a8e23260c".toLowerCase();

type EditableQuestPatch = Partial<Pick<Quest, "title" | "description" | "reward" | "rewardAmt" | "xp" | "difficulty" | "category" | "tags">>;

function mergeStoredMissions(base: Quest[], storedTasks: Record<string, MissionTask[]>, storedCustom: Record<string, EditableQuestPatch>, storedCreated: Quest[]): Quest[] {
  const baseIds = new Set(base.map((quest) => quest.id));
  const created = storedCreated.filter((quest) => !baseIds.has(quest.id));
  return [...base, ...created].map((quest) => {
    const custom = storedCustom[quest.id] ?? {};
    const tasks = storedTasks[quest.id]?.length ? storedTasks[quest.id] : quest.tasks ?? [];
    return { ...quest, ...custom, tasks, totalSteps: Math.max(1, tasks.length || quest.totalSteps) };
  });
}

interface MissionsPageProps {
  onNavigate: (page: Page) => void;
  onSelectQuest: (questId: string) => void;
}

export default function MissionsPage({ onNavigate, onSelectQuest }: MissionsPageProps) {
  const { profile, isConnected, markMissionComplete, claim } = useProfile();
  const { address } = useAccount();
  const { balances } = usePortfolioBalances();
  const [proof, setProof] = useState<SocialProof>({});
  const [quests, setQuests] = useState<Quest[]>(QUESTS);
  const [showMissionAdmin, setShowMissionAdmin] = useState(false);
  const [verifyStates, setVerifyStates] = useState<Record<string, VerifyState>>({});
  const [verifyMessages, setVerifyMessages] = useState<Record<string, string>>({});
  const isMissionAdmin = Boolean(address && address.toLowerCase() === MISSION_ADMIN_ADDRESS);

  useEffect(() => {
    try {
      setProof(JSON.parse(window.localStorage.getItem(PROOF_KEY) || "{}"));
      setQuests(mergeStoredMissions(
        QUESTS,
        JSON.parse(window.localStorage.getItem(MISSION_TASKS_KEY) || "{}"),
        JSON.parse(window.localStorage.getItem(MISSION_CUSTOM_KEY) || "{}"),
        JSON.parse(window.localStorage.getItem(MISSION_CREATED_KEY) || "[]"),
      ));
    } catch {
      setProof({});
    }
  }, []);

  useEffect(() => {
    if (!isMissionAdmin) {
      setShowMissionAdmin(false);
    }
  }, [isMissionAdmin]);

  const persistMissions = (nextQuests: Quest[]) => {
    const stored = nextQuests.reduce<Record<string, EditableQuestPatch>>((acc, quest) => {
      acc[quest.id] = {
        title: quest.title,
        description: quest.description,
        reward: quest.reward,
        rewardAmt: quest.rewardAmt,
        xp: quest.xp,
        difficulty: quest.difficulty,
        category: quest.category,
        tags: quest.tags,
      };
      return acc;
    }, {});
    const storedTasks = nextQuests.reduce<Record<string, MissionTask[]>>((acc, quest) => {
      acc[quest.id] = quest.tasks ?? [];
      return acc;
    }, {});
    const baseIds = new Set(QUESTS.map((quest) => quest.id));
    const created = nextQuests.filter((quest) => !baseIds.has(quest.id));
    window.localStorage.setItem(MISSION_CUSTOM_KEY, JSON.stringify(stored));
    window.localStorage.setItem(MISSION_TASKS_KEY, JSON.stringify(storedTasks));
    window.localStorage.setItem(MISSION_CREATED_KEY, JSON.stringify(created));
  };

  const updateMission = (questId: string, patch: EditableQuestPatch) => {
    if (!isMissionAdmin) return;
    const nextQuests = quests.map((quest) => quest.id === questId ? { ...quest, ...patch } : quest);
    setQuests(nextQuests);
    persistMissions(nextQuests);
  };

  const updateMissionTasks = (questId: string, tasks: MissionTask[]) => {
    if (!isMissionAdmin) return;
    const nextQuests = quests.map((quest) => quest.id === questId ? { ...quest, tasks, totalSteps: Math.max(1, tasks.length) } : quest);
    setQuests(nextQuests);
    persistMissions(nextQuests);
  };

  const createMission = () => {
    if (!isMissionAdmin) return quests[0] ?? QUESTS[0];
    const nextNumber = quests.length + 1;
    const mission: Quest = {
      id: `custom-${Date.now()}`,
      title: `Custom Mission ${nextNumber}`,
      description: "Describe the mission requirement here.",
      reward: "500 ARCQ",
      rewardAmt: 500,
      xp: 250,
      difficulty: "Easy",
      category: "Custom",
      progress: 0,
      totalSteps: 1,
      tags: ["Custom"],
      tasks: [{ id: `custom-task-${Date.now()}`, title: "Add the first task." }],
    };
    const nextQuests = [...quests, mission];
    setQuests(nextQuests);
    persistMissions(nextQuests);
    return mission;
  };

  const saveProof = (key: string) => {
    const next = { ...proof, [key]: true };
    setProof(next);
    window.localStorage.setItem(PROOF_KEY, JSON.stringify(next));
  };

  const hasConfirmedActivity = async (type: "swap" | "bridge") => {
    const activities = profile?.activities.filter((item) => item.type === type && item.status === "completed") ?? [];
    if (activities.length === 0) return false;

    const withHashes = activities.filter((item) => item.txHash);
    if (withHashes.length === 0) return true;

    const receipts = await Promise.all(withHashes.map((item) => getTransactionReceiptAnyChain(item.txHash)));
    return receipts.some((receipt) => receipt?.status === "success");
  };
  const hasUsdcBalance = Number(balances.find((item) => item.token === "USDC")?.amount ?? 0) >= 10;
  const hasStablecoinPair = Number(balances.find((item) => item.token === "USDC")?.amount ?? 0) > 0 && Number(balances.find((item) => item.token === "EURC")?.amount ?? 0) > 0;

  const validateQuest = async (quest: Quest) => {
    if (!profile) return { ok: false, message: "Connect your wallet before verification." };
    if (quest.id === "q1") return await hasConfirmedActivity("swap") ? { ok: true, message: "Swap transaction confirmed onchain." } : { ok: false, message: "No confirmed swap transaction found." };
    if (quest.id === "q2") return hasUsdcBalance ? { ok: true, message: "USDC balance detected on Arc." } : { ok: false, message: "Hold at least 10 USDC before verifying." };
    if (quest.id === "q3") return hasStablecoinPair ? { ok: true, message: "USDC and EURC balances detected on Arc." } : { ok: false, message: "Hold both USDC and EURC on Arc Testnet first." };
    if (quest.id === "q4") return await hasConfirmedActivity("swap") && hasUsdcBalance ? { ok: true, message: "Swap activity and USDC balance confirmed." } : { ok: false, message: "Complete a swap and hold at least 10 USDC first." };
    if (quest.id === "q5") {
      const gasBalance = await getArcNativeBalance(profile.walletAddress as `0x${string}`).catch(() => BigInt(0));
      return gasBalance > BigInt(0) ? { ok: true, message: "Native Arc USDC gas balance detected." } : { ok: false, message: "Claim or receive native USDC gas on Arc Testnet first." };
    }
    if (quest.id === "q6") return hasUsdcBalance ? { ok: true, message: "USDC balance requirement met." } : { ok: false, message: "Hold at least 10 USDC before verifying." };
    if (quest.id === "social-follow") return proof.rubelFollow && proof.arcFollow ? { ok: true, message: "Community follows verified." } : { ok: false, message: "Open both X profiles before verification." };
    if (quest.id === "social-rubel-post") return proof.rubelPost ? { ok: true, message: "Rubel post engagement verified." } : { ok: false, message: "Open and complete the Rubel post action first." };
    if (quest.id === "social-arc-post") return proof.arcPost ? { ok: true, message: "Arc post engagement verified." } : { ok: false, message: "Open and complete the Arc post action first." };
    return { ok: false, message: "No verifier is configured for this mission." };
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

    window.setTimeout(async () => {
      const result = await validateQuest(quest);
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
            {isMissionAdmin && (
              <button onClick={() => setShowMissionAdmin((value) => !value)} className="btn-primary px-4 py-2 rounded-full text-xs">Mission Control</button>
            )}
          </div>
        </div>

        {isMissionAdmin && showMissionAdmin && (
          <MissionControlPanel
            quests={quests}
            completedIds={profile?.completedMissionIds ?? []}
            isConnected={isConnected}
            onUpdateMission={updateMission}
            onUpdateTasks={updateMissionTasks}
            onCreateMission={createMission}
            onConfirmMission={(quest) => {
              if (isMissionAdmin) markMissionComplete(quest.id, quest.xp);
            }}
          />
        )}

        <MissionSection
          title="Missions"
          quests={quests}
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

function MissionControlPanel({
  quests,
  completedIds,
  isConnected,
  onUpdateMission,
  onUpdateTasks,
  onCreateMission,
  onConfirmMission,
}: {
  quests: Quest[];
  completedIds: string[];
  isConnected: boolean;
  onUpdateMission: (questId: string, patch: EditableQuestPatch) => void;
  onUpdateTasks: (questId: string, tasks: MissionTask[]) => void;
  onCreateMission: () => Quest;
  onConfirmMission: (quest: Quest) => void;
}) {
  const [selectedId, setSelectedId] = useState(quests[0]?.id ?? "");
  const selected = quests.find((quest) => quest.id === selectedId) ?? quests[0];
  if (!selected) return null;

  const tasks = selected?.tasks ?? [];
  const completed = completedIds.includes(selected.id);
  const tagsValue = selected.tags.join(", ");

  const updateTask = (taskId: string, title: string) => {
    onUpdateTasks(selected.id, tasks.map((task) => task.id === taskId ? { ...task, title } : task));
  };

  const addTask = () => {
    if (tasks.length >= 4) return;
    onUpdateTasks(selected.id, [...tasks, { id: `${selected.id}-task-${Date.now()}`, title: `Task ${tasks.length + 1}` }]);
  };

  const removeTask = (taskId: string) => {
    onUpdateTasks(selected.id, tasks.filter((task) => task.id !== taskId));
  };

  const createAndSelectMission = () => {
    const mission = onCreateMission();
    setSelectedId(mission.id);
  };

  return (
    <section className="arc-card rounded-[28px] p-5 mb-8 arc-fade-up" style={{ background: "rgba(5,10,20,0.58)" }}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div>
          <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>Mission Control</div>
          <h2 style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: 900, marginTop: 6 }}>Mission Manager</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <select value={selected.id} onChange={(event) => setSelectedId(event.target.value)} className="rounded-2xl px-4 py-3">
            {quests.map((quest) => <option key={quest.id} value={quest.id}>{quest.title}</option>)}
          </select>
          <button onClick={createAndSelectMission} className="btn-primary px-5 py-3 rounded-full">
            Create Mission
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
        <label className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
          <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Mission Name</span>
          <input value={selected.title} onChange={(event) => onUpdateMission(selected.id, { title: event.target.value })} className="mt-2 w-full rounded-2xl px-4 py-3" />
        </label>
        <label className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
          <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Reward Label</span>
          <input value={selected.reward} onChange={(event) => onUpdateMission(selected.id, { reward: event.target.value })} className="mt-2 w-full rounded-2xl px-4 py-3" />
        </label>
        <label className="lg:col-span-2 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
          <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Description</span>
          <textarea value={selected.description} onChange={(event) => onUpdateMission(selected.id, { description: event.target.value })} className="mt-2 w-full rounded-2xl px-4 py-3 min-h-[92px]" />
        </label>
        <label className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
          <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>XP</span>
          <input type="number" min={0} value={selected.xp} onChange={(event) => onUpdateMission(selected.id, { xp: Number(event.target.value) || 0 })} className="mt-2 w-full rounded-2xl px-4 py-3" />
        </label>
        <label className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
          <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Reward Amount</span>
          <input type="number" min={0} value={selected.rewardAmt} onChange={(event) => onUpdateMission(selected.id, { rewardAmt: Number(event.target.value) || 0 })} className="mt-2 w-full rounded-2xl px-4 py-3" />
        </label>
        <label className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
          <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Difficulty</span>
          <select value={selected.difficulty} onChange={(event) => onUpdateMission(selected.id, { difficulty: event.target.value as Quest["difficulty"] })} className="mt-2 w-full rounded-2xl px-4 py-3">
            {["Easy", "Medium", "Hard", "Elite"].map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
          </select>
        </label>
        <label className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
          <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Category</span>
          <input value={selected.category} onChange={(event) => onUpdateMission(selected.id, { category: event.target.value })} className="mt-2 w-full rounded-2xl px-4 py-3" />
        </label>
        <label className="lg:col-span-2 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
          <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Tags</span>
          <input value={tagsValue} onChange={(event) => onUpdateMission(selected.id, { tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} className="mt-2 w-full rounded-2xl px-4 py-3" placeholder="Swap, USDC, Gas" />
        </label>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5 rounded-2xl p-4" style={{ background: completed ? "rgba(34,197,94,0.09)" : "rgba(0,220,229,0.06)", border: `1px solid ${completed ? "rgba(34,197,94,0.22)" : "rgba(0,220,229,0.14)"}` }}>
        <div>
          <div style={{ color: completed ? "#22c55e" : "#00dce5", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            {completed ? "Mission Confirmed" : "Manual Confirmation"}
          </div>
          <p style={{ color: "#9fb1c1", fontSize: 13, marginTop: 4 }}>
            {completed ? "This mission is already completed for the connected wallet." : "Use this after reviewing the wallet/action proof."}
          </p>
        </div>
        <button disabled={!isConnected || completed} onClick={() => onConfirmMission(selected)} className="btn-primary px-5 py-3 rounded-full">
          {completed ? "Confirmed" : isConnected ? "Confirm Mission" : "Connect Wallet"}
        </button>
      </div>

      <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>Tasks</div>
      <div className="grid gap-3">
        {tasks.map((task, index) => (
          <div key={task.id} className="flex flex-col sm:flex-row gap-3 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
            <div className="w-10 h-10 rounded-full grid place-items-center shrink-0" style={{ background: "rgba(56,189,248,0.12)", color: "#38bdf8", fontFamily: "'Space Grotesk'", fontWeight: 900 }}>{index + 1}</div>
            <input value={task.title} onChange={(event) => updateTask(task.id, event.target.value)} className="flex-1 rounded-2xl px-4 py-3" />
            <button onClick={() => removeTask(task.id)} className="btn-ghost px-4 py-3 rounded-full">Remove</button>
          </div>
        ))}
      </div>
      <button onClick={addTask} disabled={tasks.length >= 4} className="btn-primary mt-4 px-5 py-3 rounded-full">
        Add Task
      </button>
    </section>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
