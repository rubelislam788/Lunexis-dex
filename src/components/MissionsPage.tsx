// src/components/MissionsPage.tsx
"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { MissionSocialLink, MissionTask, Page, Quest } from "@/types";
import { useProfile } from "@/hooks/useProfile";
import { isAdminWallet } from "@/lib/admin";
import { QUESTS } from "@/lib/missions";
import FaucetButton from "@/components/ui/FaucetButton";
import CongratulationsModal from "@/components/ui/CongratulationsModal";
import {
  DEFAULT_MISSION_DAYS,
  MISSION_STEP_PROOF_KEY,
  addDaysIso,
  ensureMissionSchedule,
  type EditableQuestPatch,
} from "@/lib/mission-storage";

type VerifyState = "idle" | "checking" | "success" | "failed";
const MISSION_STEP_PROGRESS_EVENT = "arc-mission-step-progress";

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

const toDateTimeInputValue = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const fromDateTimeInputValue = (value: string) => value ? new Date(value).toISOString() : undefined;

const getMissionTimeState = (quest: Quest, now = Date.now()) => {
  const start = quest.startsAt ? new Date(quest.startsAt).getTime() : 0;
  const end = quest.endsAt ? new Date(quest.endsAt).getTime() : 0;
  if (start && now < start) return "Upcoming";
  if (end && now > end) return "Expired";
  return "Live";
};

const formatMissionDate = (value?: string) => {
  if (!value) return "No time limit";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
};

function getQuestProgressFromSteps(quest: Quest) {
  if (typeof window === "undefined") return { count: 0, total: Math.max(1, quest.totalSteps || 1), pct: 0 };
  try {
    const stored = JSON.parse(window.localStorage.getItem(MISSION_STEP_PROOF_KEY) || "{}") as Record<string, string[]>;
    const verified = stored[quest.id] ?? [];
    const linkCount = (quest.socialLinks ?? []).filter((link) => link.label.trim() && link.url.trim()).length;
    const total = Math.max(1, (quest.tasks?.length || quest.totalSteps || 1) + linkCount);
    const count = Math.min(total, verified.length);
    return { count, total, pct: Math.min(100, (count / total) * 100) };
  } catch {
    return { count: 0, total: Math.max(1, quest.totalSteps || 1), pct: 0 };
  }
}

async function publishMissions(quests: Quest[], adminAddress?: string) {
  const response = await fetch("/api/missions", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(adminAddress ? { "x-admin-wallet": adminAddress } : {}) },
    body: JSON.stringify({ quests }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "Could not publish missions.");
  }
  return data as { quests?: Quest[] };
}

interface MissionsPageProps {
  onNavigate: (page: Page) => void;
  onSelectQuest: (quest: Quest) => void;
}

export default function MissionsPage({ onNavigate, onSelectQuest }: MissionsPageProps) {
  const { profile, isConnected, markMissionComplete } = useProfile();
  const { address } = useAccount();
  const [quests, setQuests] = useState<Quest[]>(() => ensureMissionSchedule(QUESTS));
  const [showMissionAdmin, setShowMissionAdmin] = useState(false);
  const [missionControlQuestId, setMissionControlQuestId] = useState(QUESTS[0]?.id ?? "");
  const [verifyStates, setVerifyStates] = useState<Record<string, VerifyState>>({});
  const [verifyMessages, setVerifyMessages] = useState<Record<string, string>>({});
  const [successReward, setSuccessReward] = useState<{ title: string; amount: string; message: string; txHash?: string } | null>(null);
  const [missionClock, setMissionClock] = useState(() => Date.now());
  const [progressVersion, setProgressVersion] = useState(0);
  const [publishState, setPublishState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [publishMessage, setPublishMessage] = useState("");
  const isMissionAdmin = isAdminWallet(address);

  useEffect(() => {
    let cancelled = false;
    const syncMissions = () => {
      if (document.hidden) return;
      fetch("/api/missions", {
        cache: "no-store",
        headers: address && isAdminWallet(address) ? { "x-admin-wallet": address } : undefined,
      })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => {
          if (cancelled) return;
        if (Array.isArray(data?.quests) && data.quests.length > 0) {
          setQuests(ensureMissionSchedule(data.quests));
        }
        })
        .catch(() => null);
    };
    syncMissions();
    const timer = window.setInterval(syncMissions, 3500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [address]);

  useEffect(() => {
    const timer = window.setInterval(() => setMissionClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const refreshProgress = () => setProgressVersion((value) => value + 1);
    window.addEventListener(MISSION_STEP_PROGRESS_EVENT, refreshProgress);
    window.addEventListener("storage", refreshProgress);
    window.addEventListener("focus", refreshProgress);
    return () => {
      window.removeEventListener(MISSION_STEP_PROGRESS_EVENT, refreshProgress);
      window.removeEventListener("storage", refreshProgress);
      window.removeEventListener("focus", refreshProgress);
    };
  }, []);

  useEffect(() => {
    if (!isMissionAdmin) {
      setShowMissionAdmin(false);
    }
  }, [isMissionAdmin]);

  const persistMissions = (nextQuests: Quest[]) => {
    if (!address) return;
    setPublishState("saving");
    setPublishMessage("Publishing mission changes...");
    void publishMissions(nextQuests, address)
      .then((data) => {
        if (Array.isArray(data.quests)) setQuests(ensureMissionSchedule(data.quests));
        setPublishState("saved");
        setPublishMessage("Mission changes published for all users.");
      })
      .catch((error: any) => {
        setPublishState("error");
        setPublishMessage(error?.message || "Could not publish missions.");
      });
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

  const removeMission = (questId: string) => {
    if (!isMissionAdmin) return;
    if (quests.length <= 1) return;
    const nextQuests = quests.filter((quest) => quest.id !== questId);
    setQuests(nextQuests);
    persistMissions(nextQuests);
  };

  const saveMission = (questId: string) => {
    if (!isMissionAdmin) return;
    const nextQuests = quests.map((quest) => quest.id === questId ? { ...quest } : quest);
    setQuests(nextQuests);
    persistMissions(nextQuests);
  };

  const createMission = () => {
    if (!isMissionAdmin) return quests[0] ?? QUESTS[0];
    const nextNumber = quests.length + 1;
    const startsAt = new Date().toISOString();
    const mission: Quest = {
      id: `custom-${Date.now()}`,
      title: `Custom Mission ${nextNumber}`,
      description: "Describe the mission requirement here.",
      reward: "5 USDC",
      rewardAmt: 5,
      xp: 250,
      difficulty: "Easy",
      category: "Custom",
      progress: 0,
      totalSteps: 1,
      tags: ["Custom"],
      tasks: [{ id: `custom-task-${Date.now()}`, title: "Add the first task." }],
      socialLinks: [
        { id: `custom-link-${Date.now()}-1`, label: "X", url: "" },
        { id: `custom-link-${Date.now()}-2`, label: "Telegram", url: "" },
      ],
      startsAt,
      endsAt: addDaysIso(new Date(startsAt), DEFAULT_MISSION_DAYS),
      visibility: "active",
      createdBy: address,
      createdAt: startsAt,
      updatedAt: startsAt,
    };
    const nextQuests = [...quests, mission];
    setQuests(nextQuests);
    persistMissions(nextQuests);
    return mission;
  };

  const completeVerifiedQuest = (quest: Quest, message = "All mission tasks are verified. You can now claim the token reward.") => {
    markMissionComplete(quest.id, quest.xp);
    setSuccessReward({
      title: "Mission Complete",
      amount: `${quest.xp.toLocaleString()} XP`,
      message,
    });
    setVerifyStates((prev) => ({ ...prev, [quest.id]: "success" }));
    setVerifyMessages((prev) => ({ ...prev, [quest.id]: message }));
  };

  const openMissionEditor = (questId: string) => {
    if (!isMissionAdmin) return;
    setMissionControlQuestId(questId);
    setShowMissionAdmin(true);
    window.setTimeout(() => document.getElementById("mission-control-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  return (
    <div className="arc-with-sidebar-page arc-page-shell">
      <div className="relative z-10 max-w-6xl mx-auto px-8 py-10">
        <div className="mission-page-header flex justify-between items-center mb-8 arc-fade-up">
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 32, fontWeight: 900, color: "#e9feff", marginBottom: 4 }}>
              Lunexis Mission Grid
            </h1>
            <p style={{ color: "#849495", fontSize: 14 }}>
              Verify real activity, unlock XP, and build your operator history.
            </p>
          </div>
          <div className="mission-page-actions flex gap-3">
            <FaucetButton label="Need Test USDC?" compact />
            <button onClick={() => onNavigate("swap")} className="btn-outline-cyan px-4 py-2 rounded-lg text-xs">Swap</button>
            {isMissionAdmin && (
              <button onClick={() => setShowMissionAdmin((value) => !value)} className="btn-primary px-4 py-2 rounded-full text-xs">Mission Control</button>
            )}
          </div>
        </div>

        {isMissionAdmin && showMissionAdmin && (
          <>
          {publishState !== "idle" && (
            <div className="mb-4 rounded-2xl px-4 py-3" style={{ background: publishState === "error" ? "rgba(255,45,178,0.1)" : "rgba(34,197,94,0.09)", border: `1px solid ${publishState === "error" ? "rgba(255,45,178,0.2)" : "rgba(34,197,94,0.22)"}`, color: publishState === "error" ? "#ffb7eb" : "#86efac", fontSize: 12 }}>
              {publishMessage}
            </div>
          )}
          <MissionControlPanel
            quests={quests}
            selectedQuestId={missionControlQuestId}
            onSelectedQuestChange={setMissionControlQuestId}
            completedIds={profile?.completedMissionIds ?? []}
            isConnected={isConnected}
            onUpdateMission={updateMission}
            onUpdateTasks={updateMissionTasks}
            onCreateMission={createMission}
            onRemoveMission={removeMission}
            onSaveMission={saveMission}
            onConfirmMission={(quest) => {
              if (isMissionAdmin) completeVerifiedQuest(quest, "Mission manually confirmed.");
            }}
          />
          </>
        )}

        <MissionSection
          title="Missions"
          quests={quests.filter((quest) => isMissionAdmin || getMissionTimeState(quest, missionClock) !== "Expired")}
          profile={profile}
          onSelectQuest={onSelectQuest}
          verifyStates={verifyStates}
          verifyMessages={verifyMessages}
          progressVersion={progressVersion}
          isMissionAdmin={isMissionAdmin}
          onEditQuest={openMissionEditor}
        />
      </div>
      <CongratulationsModal
        open={Boolean(successReward)}
        title={successReward?.title}
        amount={successReward?.amount}
        message={successReward?.message ?? ""}
        txHash={successReward?.txHash}
        onClose={() => setSuccessReward(null)}
      />
    </div>
  );
}

function MissionControlPanel({
  quests,
  selectedQuestId,
  onSelectedQuestChange,
  completedIds,
  isConnected,
  onUpdateMission,
  onUpdateTasks,
  onCreateMission,
  onRemoveMission,
  onSaveMission,
  onConfirmMission,
}: {
  quests: Quest[];
  selectedQuestId: string;
  onSelectedQuestChange: (questId: string) => void;
  completedIds: string[];
  isConnected: boolean;
  onUpdateMission: (questId: string, patch: EditableQuestPatch) => void;
  onUpdateTasks: (questId: string, tasks: MissionTask[]) => void;
  onCreateMission: () => Quest;
  onRemoveMission: (questId: string) => void;
  onSaveMission: (questId: string) => void;
  onConfirmMission: (quest: Quest) => void;
}) {
  const [selectedId, setSelectedId] = useState(selectedQuestId || quests[0]?.id || "");
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const selected = quests.find((quest) => quest.id === selectedId) ?? quests[0];

  useEffect(() => {
    if (selectedQuestId && selectedQuestId !== selectedId) {
      setSelectedId(selectedQuestId);
    }
  }, [selectedQuestId, selectedId]);

  useEffect(() => {
    if (!quests.some((quest) => quest.id === selectedId)) {
      const nextId = quests[0]?.id ?? "";
      setSelectedId(nextId);
      onSelectedQuestChange(nextId);
    }
  }, [quests, selectedId, onSelectedQuestChange]);

  if (!selected) return null;

  const tasks = selected?.tasks ?? [];
  const completed = completedIds.includes(selected.id);
  const tagsValue = selected.tags.join(", ");
  const socialLinks = selected.socialLinks ?? [];
  const canRemoveMission = quests.length > 1;
  const timeState = getMissionTimeState(selected);

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

  const updateSocialLink = (linkId: string, patch: Partial<MissionSocialLink>) => {
    onUpdateMission(selected.id, {
      socialLinks: socialLinks.map((link) => link.id === linkId ? { ...link, ...patch } : link),
    });
  };

  const addSocialLink = () => {
    if (socialLinks.length >= 4) return;
    onUpdateMission(selected.id, {
      socialLinks: [...socialLinks, { id: `${selected.id}-social-${Date.now()}`, label: `Link ${socialLinks.length + 1}`, url: "" }],
    });
  };

  const removeSocialLink = (linkId: string) => {
    if (socialLinks.length <= 2) return;
    onUpdateMission(selected.id, { socialLinks: socialLinks.filter((link) => link.id !== linkId) });
  };

  const createAndSelectMission = () => {
    const mission = onCreateMission();
    setSelectedId(mission.id);
    onSelectedQuestChange(mission.id);
  };

  const removeSelectedMission = () => {
    if (!canRemoveMission) return;
    onRemoveMission(selected.id);
  };

  const saveSelectedMission = () => {
    onSaveMission(selected.id);
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 1600);
  };

  return (
    <section id="mission-control-panel" className="arc-card rounded-[28px] p-5 mb-8 arc-fade-up" style={{ background: "rgba(5,10,20,0.58)" }}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div>
          <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>Mission Control</div>
          <h2 style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: 900, marginTop: 6 }}>Mission Manager</h2>
          <p style={{ color: "#849495", fontSize: 12, marginTop: 6 }}>
            Custom missions publish to the live app session and this browser. Add a database later for permanent storage.
          </p>
        </div>
        <div className="mission-control-actions flex flex-col sm:flex-row gap-3">
          <select value={selected.id} onChange={(event) => {
            setSelectedId(event.target.value);
            onSelectedQuestChange(event.target.value);
          }} className="rounded-2xl px-4 py-3">
            {quests.map((quest) => <option key={quest.id} value={quest.id}>{quest.title}</option>)}
          </select>
          <button onClick={createAndSelectMission} className="btn-primary px-5 py-3 rounded-full">
            Create Mission
          </button>
          <button onClick={saveSelectedMission} className="btn-primary px-5 py-3 rounded-full">
            {saveState === "saved" ? "Saved" : "Save Mission"}
          </button>
          <button onClick={removeSelectedMission} disabled={!canRemoveMission} className="btn-ghost px-5 py-3 rounded-full">
            Remove Mission
          </button>
        </div>
      </div>
      {saveState === "saved" && (
        <div className="mb-5 rounded-2xl px-4 py-3" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.24)", color: "#86efac", fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 800 }}>
          Mission saved and published.
        </div>
      )}

      <div className="mb-5 rounded-2xl px-4 py-3" style={{ background: "rgba(0,220,229,0.06)", border: "1px solid rgba(0,220,229,0.14)" }}>
        <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>Mission ID</div>
        <div style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontSize: 14, fontWeight: 900, marginTop: 4 }}>{selected.id}</div>
        <p style={{ color: "#9fb1c1", fontSize: 12, marginTop: 5 }}>
          Use this ID inside Reward Control to lock a reward until every task in this mission is verified.
        </p>
      </div>

      <div className="mission-control-form grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
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
        <label className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
          <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Visibility</span>
          <select value={selected.visibility ?? "active"} onChange={(event) => onUpdateMission(selected.id, { visibility: event.target.value as Quest["visibility"] })} className="mt-2 w-full rounded-2xl px-4 py-3">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <label className="lg:col-span-2 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
          <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Tags</span>
          <input value={tagsValue} onChange={(event) => onUpdateMission(selected.id, { tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} className="mt-2 w-full rounded-2xl px-4 py-3" placeholder="Swap, USDC, Gas" />
        </label>
        <label className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
          <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>Start Time</span>
          <input type="datetime-local" value={toDateTimeInputValue(selected.startsAt)} onChange={(event) => onUpdateMission(selected.id, { startsAt: fromDateTimeInputValue(event.target.value) })} className="mt-2 w-full rounded-2xl px-4 py-3" />
        </label>
        <label className="rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
          <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>End Time</span>
          <input type="datetime-local" value={toDateTimeInputValue(selected.endsAt)} onChange={(event) => onUpdateMission(selected.id, { endsAt: fromDateTimeInputValue(event.target.value) })} className="mt-2 w-full rounded-2xl px-4 py-3" />
        </label>
        <div className="lg:col-span-2 rounded-2xl p-3" style={{ background: "rgba(0,220,229,0.06)", border: "1px solid rgba(0,220,229,0.14)" }}>
          <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Time Status: {timeState}
          </div>
          <p style={{ color: "#9fb1c1", fontSize: 13, marginTop: 6 }}>
            Starts {formatMissionDate(selected.startsAt)}. Ends {formatMissionDate(selected.endsAt)}. New missions default to {DEFAULT_MISSION_DAYS} days.
          </p>
        </div>
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
      <div className="mission-task-list grid gap-3">
        {tasks.map((task, index) => (
          <div key={task.id} className="mission-task-row flex flex-col sm:flex-row gap-3 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
            <div className="w-10 h-10 rounded-full grid place-items-center shrink-0" style={{ background: "rgba(56,189,248,0.12)", color: "#38bdf8", fontFamily: "'Space Grotesk'", fontWeight: 900 }}>{index + 1}</div>
            <input value={task.title} onChange={(event) => updateTask(task.id, event.target.value)} className="flex-1 rounded-2xl px-4 py-3" />
            <button onClick={() => removeTask(task.id)} className="btn-ghost px-4 py-3 rounded-full">Remove</button>
          </div>
        ))}
      </div>
      <button onClick={addTask} disabled={tasks.length >= 4} className="btn-primary mt-4 px-5 py-3 rounded-full">
        Add Task
      </button>

      <div className="mt-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>Social Links</div>
          <p style={{ color: "#849495", fontSize: 12, marginTop: 4 }}>Add 2-4 links for X, Discord, Telegram, GitHub, or custom actions.</p>
        </div>
        <button onClick={addSocialLink} disabled={socialLinks.length >= 4} className="btn-primary px-5 py-3 rounded-full">
          Add Link
        </button>
      </div>
      <div className="mission-social-list mt-3 grid gap-3">
        {socialLinks.length === 0 && (
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)", color: "#849495", fontSize: 13 }}>
            No social links yet. Add at least 2 links for social missions.
          </div>
        )}
        {socialLinks.map((link, index) => (
          <div key={link.id} className="mission-social-row grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-3 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
            <input value={link.label} onChange={(event) => updateSocialLink(link.id, { label: event.target.value })} className="rounded-2xl px-4 py-3" placeholder={`Link ${index + 1}`} />
            <input value={link.url} onChange={(event) => updateSocialLink(link.id, { url: event.target.value })} className="rounded-2xl px-4 py-3" placeholder="https://..." />
            <button onClick={() => removeSocialLink(link.id)} disabled={socialLinks.length <= 2} className="btn-ghost px-4 py-3 rounded-full">
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function MissionSection({
  title,
  quests,
  profile,
  onSelectQuest,
  verifyStates,
  verifyMessages,
  progressVersion,
  isMissionAdmin,
  onEditQuest,
}: {
  title: string;
  quests: Quest[];
  profile: ReturnType<typeof useProfile>["profile"];
  onSelectQuest: (quest: Quest) => void;
  verifyStates: Record<string, VerifyState>;
  verifyMessages: Record<string, string>;
  progressVersion: number;
  isMissionAdmin: boolean;
  onEditQuest: (questId: string) => void;
}) {
  return (
    <section className="mb-8">
      <div style={{ fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "#00dce5", marginBottom: 12, textTransform: "uppercase" }}>
        {title}
      </div>
      <div className="mission-grid grid grid-cols-1 md:grid-cols-2 gap-4">
        {quests.map((quest) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            completed={profile?.completedMissionIds.includes(quest.id)}
            verifyState={verifyStates[quest.id] ?? "idle"}
            verifyMessage={verifyMessages[quest.id]}
            progressVersion={progressVersion}
            onSelectQuest={onSelectQuest}
            featured={quest.featured}
            isMissionAdmin={isMissionAdmin}
            onEditQuest={onEditQuest}
          />
        ))}
      </div>
    </section>
  );
}

function QuestCard({
  quest,
  completed,
  verifyState,
  verifyMessage,
  progressVersion,
  onSelectQuest,
  featured,
  isMissionAdmin,
  onEditQuest,
}: {
  quest: Quest;
  completed?: boolean;
  verifyState: VerifyState;
  verifyMessage?: string;
  progressVersion: number;
  onSelectQuest: (quest: Quest) => void;
  featured?: boolean;
  isMissionAdmin: boolean;
  onEditQuest: (questId: string) => void;
}) {
  const stepProgress = getQuestProgressFromSteps(quest);
  const progressPct = completed ? 100 : stepProgress.count > 0 ? stepProgress.pct : quest.progress > 0 ? (quest.progress / quest.totalSteps) * 100 : verifyState === "checking" ? 58 : 0;
  const isChecking = verifyState === "checking";
  const timeState = getMissionTimeState(quest);
  void progressVersion;

  return (
    <article
      className="arc-mission-card rounded-2xl p-5 cursor-pointer transition-all arc-card"
      style={{
        border: `1px solid ${completed ? "rgba(34,197,94,0.42)" : featured ? "rgba(0,220,229,0.22)" : "rgba(255,255,255,0.06)"}`,
        boxShadow: completed ? "0 0 26px rgba(34,197,94,0.14)" : featured ? "0 0 20px rgba(0,220,229,0.08)" : "none",
      }}
      onClick={() => onSelectQuest(quest)}
    >
      <div className="mission-card-head flex justify-between gap-4">
        <div className="mission-card-main flex gap-4">
          <div className="mission-card-icon w-12 h-12 rounded-2xl grid place-items-center" style={{ background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.24)", boxShadow: "0 0 20px rgba(56,189,248,0.12)" }}>
            <span className="material-symbols-outlined" style={{ color: "#38bdf8", fontSize: 24 }}>{MISSION_ICONS[quest.id] ?? "auto_awesome"}</span>
          </div>
          <div>
            <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: 16, fontWeight: 900, color: "#f8fbff", marginBottom: 5 }}>
              {quest.title}
            </h3>
            <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
              ID: {quest.id}
            </div>
            <p style={{ fontSize: 13, color: "#9fb1c1", lineHeight: 1.55 }}>{quest.description}</p>
          </div>
        </div>
        <div className="mission-card-badges flex flex-col items-end gap-2">
          <span className="px-2 py-1 rounded-md h-fit" style={{ fontFamily: "'Space Grotesk'", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: completed ? "#22c55e" : DIFF_COLORS[quest.difficulty], background: completed ? "rgba(34,197,94,0.12)" : `${DIFF_COLORS[quest.difficulty]}18`, border: `1px solid ${completed ? "rgba(34,197,94,0.32)" : `${DIFF_COLORS[quest.difficulty]}44`}` }}>
            {completed ? "COMPLETED" : quest.difficulty.toUpperCase()}
          </span>
          <span className="px-2 py-1 rounded-md h-fit" style={{ fontFamily: "'Space Grotesk'", fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: timeState === "Live" ? "#38bdf8" : "#f59e0b", background: timeState === "Live" ? "rgba(56,189,248,0.1)" : "rgba(245,158,11,0.1)", border: `1px solid ${timeState === "Live" ? "rgba(56,189,248,0.28)" : "rgba(245,158,11,0.28)"}` }}>
            {timeState.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between mb-1">
          <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, color: "#849495", textTransform: "uppercase" }}>{completed ? "Signal Confirmed" : isChecking ? "Verification Running" : "Awaiting Verification"}</span>
          <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, color: "#38bdf8" }}>{completed ? `+${quest.xp} XP` : `${stepProgress.count}/${stepProgress.total}`}</span>
        </div>
        <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
          <div className="stat-bar" style={{ width: `${progressPct}%`, height: "100%", background: completed ? "#22c55e" : "linear-gradient(90deg,#38bdf8,#ff2db2)", borderRadius: 99 }} />
        </div>
      </div>

      {(quest.startsAt || quest.endsAt) && (
        <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)", color: "#9fb1c1", fontSize: 12 }}>
          {formatMissionDate(quest.startsAt)} - {formatMissionDate(quest.endsAt)}
        </div>
      )}

      {verifyMessage && (
        <div className="mt-3 rounded-xl p-3" style={{ background: verifyState === "failed" ? "rgba(255,80,80,0.08)" : "rgba(56,189,248,0.07)", border: `1px solid ${verifyState === "failed" ? "rgba(255,80,80,0.18)" : "rgba(56,189,248,0.16)"}`, color: verifyState === "failed" ? "#ffb4ab" : "#b9eaff", fontSize: 12 }}>
          {isChecking && <span className="spinner inline-block w-3 h-3 mr-2 align-middle" />}
          {verifyMessage}
        </div>
      )}

      {isMissionAdmin && (
        <div className="mission-card-footer flex justify-end mt-4" onClick={(event) => event.stopPropagation()}>
          <button onClick={() => onEditQuest(quest.id)} className="btn-ghost px-3 py-2 rounded-lg" style={{ fontSize: 10 }}>
            Edit
          </button>
        </div>
      )}
    </article>
  );
}
