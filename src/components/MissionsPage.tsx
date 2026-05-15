// src/components/MissionsPage.tsx
"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import type { MissionSocialLink, MissionTask, Page, Quest } from "@/types";
import { useProfile } from "@/hooks/useProfile";
import { usePortfolioBalances } from "@/hooks/usePortfolioBalances";
import { SOCIAL_LINKS } from "@/lib/constants";
import { isAdminWallet } from "@/lib/admin";
import { QUESTS } from "@/lib/missions";
import { getArcNativeBalance, getTransactionReceiptAnyChain } from "@/lib/onchain";
import FaucetButton from "@/components/ui/FaucetButton";
import CongratulationsModal from "@/components/ui/CongratulationsModal";
import { formatRewardAmount } from "@/lib/rewards";

type VerifyState = "idle" | "checking" | "success" | "failed";
type SocialProof = Record<string, boolean>;

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
const MISSION_REMOVED_KEY = "arcquest.mission-removed.v1";
const DEFAULT_MISSION_DAYS = 7;

type EditableQuestPatch = Partial<Pick<Quest, "title" | "description" | "reward" | "rewardAmt" | "xp" | "difficulty" | "category" | "tags" | "startsAt" | "endsAt" | "socialLinks">>;

const addDaysIso = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString();
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

const normalizeExternalUrl = (url: string) => /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;

function mergeStoredMissions(base: Quest[], storedTasks: Record<string, MissionTask[]>, storedCustom: Record<string, EditableQuestPatch>, storedCreated: Quest[], removedIds: string[]): Quest[] {
  const baseIds = new Set(base.map((quest) => quest.id));
  const created = storedCreated.filter((quest) => !baseIds.has(quest.id));
  const removed = new Set(removedIds);
  return ensureMissionSchedule([...base, ...created].filter((quest) => !removed.has(quest.id)).map((quest) => {
    const custom = storedCustom[quest.id] ?? {};
    const tasks = storedTasks[quest.id]?.length ? storedTasks[quest.id] : quest.tasks ?? [];
    return { ...quest, ...custom, tasks, totalSteps: Math.max(1, tasks.length || quest.totalSteps) };
  }));
}

function ensureMissionSchedule(quests: Quest[]) {
  const createdAt = new Date();
  return quests.map((quest) => {
    const startsAt = quest.startsAt ?? createdAt.toISOString();
    const endsAt = quest.endsAt ?? addDaysIso(new Date(startsAt), DEFAULT_MISSION_DAYS);
    return { ...quest, startsAt, endsAt };
  });
}

async function publishMissions(quests: Quest[]) {
  await fetch("/api/missions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quests }),
  }).catch(() => null);
}

interface MissionsPageProps {
  onNavigate: (page: Page) => void;
  onSelectQuest: (quest: Quest) => void;
}

export default function MissionsPage({ onNavigate, onSelectQuest }: MissionsPageProps) {
  const { profile, isConnected, markMissionComplete, claim } = useProfile();
  const { address } = useAccount();
  const { balances } = usePortfolioBalances();
  const [proof, setProof] = useState<SocialProof>({});
  const [quests, setQuests] = useState<Quest[]>(() => ensureMissionSchedule(QUESTS));
  const [showMissionAdmin, setShowMissionAdmin] = useState(false);
  const [missionControlQuestId, setMissionControlQuestId] = useState(QUESTS[0]?.id ?? "");
  const [verifyStates, setVerifyStates] = useState<Record<string, VerifyState>>({});
  const [verifyMessages, setVerifyMessages] = useState<Record<string, string>>({});
  const [claimingQuestId, setClaimingQuestId] = useState<string | null>(null);
  const [successReward, setSuccessReward] = useState<{ title: string; amount: string; message: string; txHash?: string } | null>(null);
  const [missionClock, setMissionClock] = useState(() => Date.now());
  const isMissionAdmin = isAdminWallet(address);

  useEffect(() => {
    try {
      setProof(JSON.parse(window.localStorage.getItem(PROOF_KEY) || "{}"));
      setQuests(mergeStoredMissions(
        QUESTS,
        JSON.parse(window.localStorage.getItem(MISSION_TASKS_KEY) || "{}"),
        JSON.parse(window.localStorage.getItem(MISSION_CUSTOM_KEY) || "{}"),
        JSON.parse(window.localStorage.getItem(MISSION_CREATED_KEY) || "[]"),
        JSON.parse(window.localStorage.getItem(MISSION_REMOVED_KEY) || "[]"),
      ));
    } catch {
      setProof({});
    }

    fetch("/api/missions")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (Array.isArray(data?.quests) && data.quests.length > 0) {
          setQuests(ensureMissionSchedule(data.quests));
        }
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setMissionClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
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
        startsAt: quest.startsAt,
        endsAt: quest.endsAt,
        socialLinks: quest.socialLinks ?? [],
      };
      return acc;
    }, {});
    const storedTasks = nextQuests.reduce<Record<string, MissionTask[]>>((acc, quest) => {
      acc[quest.id] = quest.tasks ?? [];
      return acc;
    }, {});
    const baseIds = new Set(QUESTS.map((quest) => quest.id));
    const created = nextQuests.filter((quest) => !baseIds.has(quest.id));
    const removed = QUESTS.filter((quest) => !nextQuests.some((item) => item.id === quest.id)).map((quest) => quest.id);
    window.localStorage.setItem(MISSION_CUSTOM_KEY, JSON.stringify(stored));
    window.localStorage.setItem(MISSION_TASKS_KEY, JSON.stringify(storedTasks));
    window.localStorage.setItem(MISSION_CREATED_KEY, JSON.stringify(created));
    window.localStorage.setItem(MISSION_REMOVED_KEY, JSON.stringify(removed));
    void publishMissions(nextQuests);
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

  const openMissionEditor = (questId: string) => {
    if (!isMissionAdmin) return;
    setMissionControlQuestId(questId);
    setShowMissionAdmin(true);
    window.setTimeout(() => document.getElementById("mission-control-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const syncProfileBeforePayout = async () => {
    if (!profile) return;
    await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    }).catch(() => null);
  };

  const claimQuestReward = async (quest: Quest) => {
    if (!address || claimingQuestId) return;
    const token = quest.reward.includes("EURC") ? "EURC" : "USDC";
    setClaimingQuestId(quest.id);
    setVerifyMessages((prev) => ({ ...prev, [quest.id]: `Paying ${quest.reward} to your wallet...` }));
    try {
      await syncProfileBeforePayout();
      const response = await fetch("/api/reward-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardId: quest.id,
          token,
          amount: quest.rewardAmt,
          recipient: address,
          requiredMissionIds: [quest.id],
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Reward payout failed.");
      claim(quest.id, quest.rewardAmt, token, data?.hash);
      setVerifyMessages((prev) => ({ ...prev, [quest.id]: `${quest.reward} paid to your wallet.` }));
      setSuccessReward({
        title: "Congratulations",
        amount: formatRewardAmount(quest.rewardAmt, token),
        message: "Your mission reward has been paid to your connected wallet.",
        txHash: data?.hash,
      });
    } catch (error: any) {
      setVerifyMessages((prev) => ({ ...prev, [quest.id]: error?.message || "Reward payout failed." }));
    } finally {
      setClaimingQuestId(null);
    }
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
        setSuccessReward({
          title: "Mission Complete",
          amount: `${quest.xp.toLocaleString()} XP`,
          message: "All mission tasks are verified. You can now claim the token reward.",
        });
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
              Lunexis Mission Grid
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
              if (isMissionAdmin) markMissionComplete(quest.id, quest.xp);
            }}
          />
        )}

        <MissionSection
          title="Missions"
          quests={quests.filter((quest) => isMissionAdmin || getMissionTimeState(quest, missionClock) !== "Expired")}
          profile={profile}
          onSelectQuest={onSelectQuest}
          onVerify={verifyQuest}
          onClaim={claimQuestReward}
          saveProof={saveProof}
          verifyStates={verifyStates}
          verifyMessages={verifyMessages}
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
        <div className="flex flex-col sm:flex-row gap-3">
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

      <div className="mt-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>Social Links</div>
          <p style={{ color: "#849495", fontSize: 12, marginTop: 4 }}>Add 2-4 links for X, Discord, Telegram, GitHub, or custom actions.</p>
        </div>
        <button onClick={addSocialLink} disabled={socialLinks.length >= 4} className="btn-primary px-5 py-3 rounded-full">
          Add Link
        </button>
      </div>
      <div className="mt-3 grid gap-3">
        {socialLinks.length === 0 && (
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)", color: "#849495", fontSize: 13 }}>
            No social links yet. Add at least 2 links for social missions.
          </div>
        )}
        {socialLinks.map((link, index) => (
          <div key={link.id} className="grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-3 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,217,255,0.12)" }}>
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
  onVerify,
  onClaim,
  saveProof,
  verifyStates,
  verifyMessages,
  isMissionAdmin,
  onEditQuest,
}: {
  title: string;
  quests: Quest[];
  profile: ReturnType<typeof useProfile>["profile"];
  onSelectQuest: (quest: Quest) => void;
  onVerify: (quest: Quest) => void;
  onClaim: (quest: Quest) => void;
  saveProof: (key: string) => void;
  verifyStates: Record<string, VerifyState>;
  verifyMessages: Record<string, string>;
  isMissionAdmin: boolean;
  onEditQuest: (questId: string) => void;
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
  claimed,
  verifyState,
  verifyMessage,
  onSelectQuest,
  onVerify,
  onClaim,
  saveProof,
  featured,
  isMissionAdmin,
  onEditQuest,
}: {
  quest: Quest;
  completed?: boolean;
  claimed?: boolean;
  verifyState: VerifyState;
  verifyMessage?: string;
  onSelectQuest: (quest: Quest) => void;
  onVerify: () => void;
  onClaim: () => void;
  saveProof: (key: string) => void;
  featured?: boolean;
  isMissionAdmin: boolean;
  onEditQuest: (questId: string) => void;
}) {
  const progressPct = completed ? 100 : quest.progress > 0 ? (quest.progress / quest.totalSteps) * 100 : verifyState === "checking" ? 58 : 0;
  const isChecking = verifyState === "checking";
  const socialHref = quest.id === "social-rubel-post" ? SOCIAL_LINKS.rubelPost : quest.id === "social-arc-post" ? SOCIAL_LINKS.arcPost : SOCIAL_LINKS.rubel;
  const missionSocialLinks = (quest.socialLinks ?? []).filter((link) => link.label.trim() && link.url.trim());
  const timeState = getMissionTimeState(quest);
  const isTimeLocked = timeState !== "Live";

  return (
    <article
      className="arc-mission-card rounded-2xl p-5 cursor-pointer transition-all arc-card"
      style={{
        border: `1px solid ${completed ? "rgba(34,197,94,0.42)" : featured ? "rgba(0,220,229,0.22)" : "rgba(255,255,255,0.06)"}`,
        boxShadow: completed ? "0 0 26px rgba(34,197,94,0.14)" : featured ? "0 0 20px rgba(0,220,229,0.08)" : "none",
      }}
      onClick={() => onSelectQuest(quest)}
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
            <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
              ID: {quest.id}
            </div>
            <p style={{ fontSize: 13, color: "#9fb1c1", lineHeight: 1.55 }}>{quest.description}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
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
          <span style={{ fontFamily: "'Space Grotesk'", fontSize: 10, color: "#38bdf8" }}>+{quest.xp} XP</span>
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
          {isMissionAdmin && (
            <button onClick={() => onEditQuest(quest.id)} className="btn-ghost px-3 py-2 rounded-lg" style={{ fontSize: 10 }}>
              Edit
            </button>
          )}
          {quest.category === "Social" && quest.id === "social-follow" && (
            <a href={SOCIAL_LINKS.arc} target="_blank" rel="noreferrer" onClick={() => saveProof("arcFollow")} className="btn-ghost px-3 py-2 rounded-lg" style={{ fontSize: 10 }}>Open Arc</a>
          )}
          {quest.category === "Social" && (
            <a href={socialHref} target="_blank" rel="noreferrer" onClick={() => saveProof(quest.id === "social-follow" ? "rubelFollow" : quest.id === "social-rubel-post" ? "rubelPost" : "arcPost")} className="btn-ghost px-3 py-2 rounded-lg" style={{ fontSize: 10 }}>
              {quest.id === "social-follow" ? "Open Rubel" : "Open Signal"}
            </a>
          )}
          {missionSocialLinks.map((link) => (
            <a
              key={link.id}
              href={normalizeExternalUrl(link.url)}
              target="_blank"
              rel="noreferrer"
              onClick={() => saveProof(`${quest.id}-${link.id}`)}
              className="btn-ghost px-3 py-2 rounded-lg"
              style={{ fontSize: 10 }}
            >
              {link.label}
            </a>
          ))}
          <button disabled={completed || isChecking || isTimeLocked} onClick={onVerify} className="btn-outline-cyan px-3 py-2 rounded-lg" style={{ fontSize: 10 }}>
            {isChecking ? "Checking..." : completed ? "Verified" : isTimeLocked ? timeState : "Verify"}
          </button>
          <button disabled={!completed || claimed || isTimeLocked} onClick={onClaim} className="btn-primary px-3 py-2 rounded-lg" style={{ fontSize: 10 }}>
            {claimed ? "Claimed" : isTimeLocked ? timeState : "Claim"}
          </button>
        </div>
      </div>
    </article>
  );
}
