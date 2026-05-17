"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useProfile } from "@/hooks/useProfile";
import ActivityTimeline from "@/components/ActivityTimeline";
import FaucetButton from "@/components/ui/FaucetButton";
import CongratulationsModal from "@/components/ui/CongratulationsModal";
import { isAdminWallet } from "@/lib/admin";
import { DEFAULT_REWARDS, XP_TO_USDC_AMOUNT, XP_TO_USDC_COST, formatRewardAmount, formatRewardTotals, normalizeRewards, type RewardConfig } from "@/lib/rewards";
import { QUESTS } from "@/lib/missions";
import { MISSION_STEP_PROOF_KEY } from "@/lib/mission-storage";
import type { Quest } from "@/types";

function missionIdsToText(missionIds: string[]) {
  return missionIds.join(", ");
}

function textToMissionIds(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function createRewardId() {
  return `reward-custom-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function normalizeMissionKey(value: string) {
  return value.trim().toLowerCase();
}

function missionKeyAliases(value: string) {
  const key = normalizeMissionKey(value);
  if (!key) return [];
  const aliases = new Set([key]);
  if (key.startsWith("custom-")) aliases.add(key.slice("custom-".length));
  else if (/^\d+$/.test(key)) aliases.add(`custom-${key}`);
  return Array.from(aliases);
}

function isMissionRequirementMet(requiredMissionId: string, completedMissionIds: string[]) {
  const completedKeys = new Set(completedMissionIds.flatMap(missionKeyAliases));
  return missionKeyAliases(requiredMissionId).some((key) => completedKeys.has(key));
}

function readVerifiedMissionStepIds(missionId: string) {
  if (typeof window === "undefined") return [];
  try {
    const verified = JSON.parse(window.localStorage.getItem(MISSION_STEP_PROOF_KEY) || "{}") as Record<string, string[]>;
    return verified[missionId] ?? [];
  } catch {
    return [];
  }
}

function getMissionSteps(quest: Quest) {
  return quest.tasks?.length
    ? quest.tasks
    : Array.from({ length: Math.max(1, quest.totalSteps || 1) }, (_, index) => ({
      id: `${quest.id}-step-${index + 1}`,
      title: `Step ${index + 1}`,
    }));
}

function findQuestByMissionId(missionId: string, quests: Quest[]) {
  const aliases = new Set(missionKeyAliases(missionId));
  return quests.find((quest) => missionKeyAliases(quest.id).some((alias) => aliases.has(alias)));
}

function isMissionStepRequirementMet(missionId: string, quests: Quest[]) {
  const quest = findQuestByMissionId(missionId, quests);
  if (!quest) return true;
  const verified = new Set(readVerifiedMissionStepIds(quest.id));
  return getMissionSteps(quest).every((step) => verified.has(step.id));
}

function rewardHasPublishedMissionLocks(reward: RewardConfig, quests: Quest[]) {
  return reward.missionIds.every((missionId) => Boolean(findQuestByMissionId(missionId, quests)));
}

export default function RewardsPage() {
  const { profile, isConnected, claim, convertXp } = useProfile();
  const { address } = useAccount();
  const [rewards, setRewards] = useState<RewardConfig[]>(DEFAULT_REWARDS);
  const [quests, setQuests] = useState<Quest[]>(QUESTS);
  const [showRewardAdmin, setShowRewardAdmin] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [claimingRewardId, setClaimingRewardId] = useState<string | null>(null);
  const [claimMessage, setClaimMessage] = useState("");
  const [claimErrors, setClaimErrors] = useState<Record<string, string>>({});
  const [successReward, setSuccessReward] = useState<{ amount: string; txHash?: string } | null>(null);
  const [payoutStatus, setPayoutStatus] = useState<{ configured: boolean; address?: string; balances?: Array<{ token: string; displayAmount: string }>; error?: string } | null>(null);
  const [saveError, setSaveError] = useState("");
  const isRewardAdmin = isAdminWallet(address);
  const availableXp = Math.max(0, (profile?.xp ?? 0) - (profile?.xpConverted ?? 0));
  const visibleRewards = isRewardAdmin ? rewards : rewards.filter((reward) => rewardHasPublishedMissionLocks(reward, quests));

  useEffect(() => {
    let cancelled = false;

    const syncRewardsAndMissions = () => {
      const headers = address && isAdminWallet(address) ? { "x-admin-wallet": address } : undefined;
      void Promise.all([
        fetch("/api/rewards", { cache: "no-store", headers }).then((response) => response.ok ? response.json() : null).catch(() => null),
        fetch("/api/missions", { cache: "no-store", headers }).then((response) => response.ok ? response.json() : null).catch(() => null),
      ]).then(([rewardData, missionData]) => {
        if (cancelled) return;
        if (Array.isArray(rewardData?.rewards)) setRewards(normalizeRewards(rewardData.rewards));
        if (Array.isArray(missionData?.quests) && missionData.quests.length > 0) setQuests(missionData.quests);
      });
    };

    syncRewardsAndMissions();
    const timer = window.setInterval(syncRewardsAndMissions, 3500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [address]);

  useEffect(() => {
    fetch("/api/reward-payout", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setPayoutStatus(data))
      .catch(() => setPayoutStatus(null));
  }, [claimingRewardId]);

  useEffect(() => {
    if (!isRewardAdmin) setShowRewardAdmin(false);
  }, [isRewardAdmin]);

  const persistRewards = async (next: RewardConfig[]) => {
    if (!isRewardAdmin || !address) return false;
    const nextRewards = normalizeRewards(next);
    setSaveState("saving");
    setSaveError("");
    const response = await fetch("/api/rewards", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-wallet": address,
      },
      body: JSON.stringify({ rewards: nextRewards }),
    }).catch(() => null);
    const data = await response?.json().catch(() => null);
    if (response?.ok) {
      if (Array.isArray(data?.rewards)) setRewards(normalizeRewards(data.rewards));
      setSaveState("saved");
      return true;
    }
    setSaveState("error");
    setSaveError(data?.error || "Could not publish rewards.");
    return false;
  };

  const updateReward = (rewardId: string, patch: Partial<RewardConfig>) => {
    if (!isRewardAdmin) return;
    setRewards((current) => {
      const next = current.map((reward) => reward.id === rewardId ? { ...reward, ...patch } : reward);
      void persistRewards(next);
      return next;
    });
  };

  const addReward = () => {
    if (!isRewardAdmin) return;
    const reward: RewardConfig = {
      id: createRewardId(),
      title: `Custom Reward ${rewards.length + 1}`,
      amount: 5,
      token: "USDC",
      requirement: "Admin configured reward",
      missionIds: [],
      visibility: "active",
      createdBy: address,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRewards((current) => {
      const next = [...current, reward];
      void persistRewards(next);
      return next;
    });
  };

  const removeReward = (rewardId: string) => {
    if (!isRewardAdmin || rewards.length <= 1) return;
    setRewards((current) => {
      const next = current.filter((reward) => reward.id !== rewardId);
      void persistRewards(next);
      return next;
    });
  };

  const syncProfileBeforePayout = async () => {
    if (!profile) return;
    await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile }),
    }).catch(() => null);
  };

  const saveRewards = async () => {
    if (!isRewardAdmin || !address) return false;
    const nextRewards = normalizeRewards(rewards);
    setRewards(nextRewards);
    return await persistRewards(nextRewards);
  };

  const postRewardPayout = async (reward: RewardConfig) => {
    const completedMissionIds = profile?.completedMissionIds ?? [];
    return fetch("/api/reward-payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rewardId: reward.id,
        token: reward.token,
        amount: reward.amount,
        recipient: address,
        requiredMissionIds: reward.missionIds,
        completedMissionIds,
      }),
    });
  };

  const claimTokenReward = async (reward: RewardConfig) => {
    if (!address || claimingRewardId) return;
    const missingStepMissionIds = reward.missionIds.filter((id) => !isMissionStepRequirementMet(id, quests));
    if (missingStepMissionIds.length > 0) {
      setClaimErrors((current) => ({
        ...current,
        [reward.id]: `Verify mission steps first: ${missingStepMissionIds.join(", ")}`,
      }));
      return;
    }
    setClaimingRewardId(reward.id);
    setClaimMessage("");
    setClaimErrors((current) => {
      const next = { ...current };
      delete next[reward.id];
      return next;
    });
    try {
      await syncProfileBeforePayout();
      let response = await postRewardPayout(reward);
      let data = await response.json().catch(() => null);
      if (!response.ok && data?.code === "REWARD_NOT_PUBLISHED" && isRewardAdmin) {
        setClaimErrors((current) => ({ ...current, [reward.id]: "Publishing this reward, then retrying claim..." }));
        const saved = await saveRewards();
        if (saved) {
          response = await postRewardPayout(reward);
          data = await response.json().catch(() => null);
        }
      }
      if (!response.ok) {
        const fallback = response.status === 503
          ? "Reward wallet is syncing. Please try again soon."
          : "Reward payout failed.";
        throw new Error(data?.error || fallback);
      }
      claim(reward.id, reward.amount, reward.token, data?.hash);
      setClaimMessage(`${formatRewardAmount(reward.amount, reward.token)} paid to your wallet.`);
      setSuccessReward({ amount: formatRewardAmount(reward.amount, reward.token), txHash: data?.hash });
    } catch (error: any) {
      setClaimErrors((current) => ({
        ...current,
        [reward.id]: error?.message || "Reward payout failed.",
      }));
    } finally {
      setClaimingRewardId(null);
    }
  };

  const claimXpConversion = async () => {
    if (!address || claimingRewardId) return;
    const rewardId = `xp-usdc-${Date.now()}`;
    setClaimingRewardId("xp-convert");
    setClaimMessage("");
    setClaimErrors((current) => {
      const next = { ...current };
      delete next["xp-convert"];
      return next;
    });
    try {
      if (availableXp < XP_TO_USDC_COST) {
        throw new Error(`You need ${XP_TO_USDC_COST.toLocaleString()} available XP to claim ${XP_TO_USDC_AMOUNT} USDC.`);
      }
      await syncProfileBeforePayout();
      const response = await fetch("/api/reward-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rewardId,
          token: "USDC",
          amount: XP_TO_USDC_AMOUNT,
          recipient: address,
          xpCost: XP_TO_USDC_COST,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "XP conversion payout failed.");
      }
      convertXp(rewardId, XP_TO_USDC_COST, XP_TO_USDC_AMOUNT, "USDC", data?.hash);
      setClaimMessage(`${XP_TO_USDC_COST.toLocaleString()} XP converted into ${XP_TO_USDC_AMOUNT} USDC.`);
      setSuccessReward({ amount: `${XP_TO_USDC_AMOUNT} USDC`, txHash: data?.hash });
    } catch (error: any) {
      setClaimErrors((current) => ({
        ...current,
        "xp-convert": error?.message || "XP conversion failed.",
      }));
    } finally {
      setClaimingRewardId(null);
    }
  };

  return (
    <div className="arc-with-sidebar-page arc-page-shell">
      <div className="relative z-10 max-w-7xl mx-auto px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 style={{ fontFamily: "'Space Grotesk'", fontSize: 34, fontWeight: 900, color: "#f8fbff" }}>Rewards Command</h1>
            <p style={{ color: "#849495" }}>Claim USDC and EURC rewards, monitor XP, and track achievements.</p>
          </div>
          <div className="flex items-center gap-3">
            {isRewardAdmin && (
              <button onClick={() => setShowRewardAdmin((value) => !value)} className="btn-primary px-4 py-2 rounded-full text-xs">
                Reward Control
              </button>
            )}
            <FaucetButton label="Get Test Tokens" />
          </div>
        </div>

        {isRewardAdmin && showRewardAdmin && (
          <section className="arc-card rounded-3xl p-6 mb-6" id="reward-control-panel">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <div>
                <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>Admin Only</div>
                <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 24, fontWeight: 900, color: "#f8fbff" }}>Reward Control</h2>
                <p style={{ color: "#849495", fontSize: 13 }}>Create, edit, remove, and publish rewards for all users.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={addReward} className="btn-ghost px-4 py-2 rounded-full text-xs">Add Reward</button>
                <button onClick={saveRewards} disabled={saveState === "saving"} className="btn-primary px-4 py-2 rounded-full text-xs">
                  {saveState === "saving" ? "Saving..." : "Save Rewards"}
                </button>
              </div>
            </div>
            {saveState !== "idle" && (
              <p style={{ color: saveState === "error" ? "#ffb7eb" : "#22c55e", fontSize: 12, marginBottom: 16 }}>
                {saveState === "saved" ? "Rewards saved and published for all users." : saveState === "error" ? saveError || "Could not publish rewards." : "Saving rewards..."}
              </p>
            )}
            <div className="rounded-2xl p-4 mb-5" style={{ background: payoutStatus?.configured ? "rgba(34,197,94,0.08)" : "rgba(255,45,178,0.08)", border: `1px solid ${payoutStatus?.configured ? "rgba(34,197,94,0.18)" : "rgba(255,45,178,0.18)"}` }}>
              <div style={{ color: payoutStatus?.configured ? "#86efac" : "#ffb7eb", fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Payout Wallet
              </div>
              <p style={{ color: "#dbeafe", fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
                {payoutStatus?.configured
                  ? `Rewards are paid from ${payoutStatus.address}. Balance: ${payoutStatus.balances?.map((item) => item.displayAmount).join(" / ") || "syncing"}.`
                  : payoutStatus?.error || "Set REWARD_PAYOUT_PRIVATE_KEY in Vercel to your admin wallet private key and fund that wallet with Arc Testnet USDC/EURC."}
              </p>
            </div>
            <div className="grid gap-4">
              {rewards.map((reward, index) => (
                <div key={reward.id} className="rounded-3xl p-4" style={{ background: "rgba(0,0,0,0.28)", border: "1px solid rgba(56,189,248,0.16)" }}>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 12, fontWeight: 900 }}>Reward {index + 1}</div>
                    <button onClick={() => removeReward(reward.id)} disabled={rewards.length <= 1} className="btn-ghost px-3 py-2 rounded-full text-xs">Remove</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="grid gap-2">
                      <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Reward Title</span>
                      <input value={reward.title} onChange={(event) => updateReward(reward.id, { title: event.target.value })} className="rounded-2xl px-4 py-3" />
                    </label>
                    <label className="grid gap-2">
                      <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Amount</span>
                      <input type="number" min="0" value={reward.amount} onChange={(event) => updateReward(reward.id, { amount: Number(event.target.value) })} className="rounded-2xl px-4 py-3" />
                    </label>
                    <label className="grid gap-2">
                      <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Reward Token</span>
                      <select value={reward.token} onChange={(event) => updateReward(reward.id, { token: event.target.value as RewardConfig["token"] })} className="rounded-2xl px-4 py-3">
                        <option value="USDC">USDC</option>
                        <option value="EURC">EURC</option>
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Visibility</span>
                      <select value={reward.visibility ?? "active"} onChange={(event) => updateReward(reward.id, { visibility: event.target.value as RewardConfig["visibility"] })} className="rounded-2xl px-4 py-3">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="hidden">Hidden</option>
                      </select>
                    </label>
                    <label className="grid gap-2 md:col-span-2">
                      <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Requirement Text</span>
                      <input value={reward.requirement} onChange={(event) => updateReward(reward.id, { requirement: event.target.value })} className="rounded-2xl px-4 py-3" />
                    </label>
                    <label className="grid gap-2 md:col-span-2">
                      <span style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>Mission Lock IDs</span>
                      <input
                        value={missionIdsToText(reward.missionIds)}
                        onChange={(event) => updateReward(reward.id, { missionIds: textToMissionIds(event.target.value) })}
                        placeholder="Paste mission ID: custom-1778916822890"
                        className="rounded-2xl px-4 py-3"
                      />
                      <span style={{ color: "#64748b", fontSize: 11 }}>A user must complete every Mission ID listed here before this reward can be claimed.</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            ["Total XP", profile?.xp ?? 0],
            ["Rewards Earned", formatRewardTotals(profile?.rewardTokenTotals, profile?.rewardsEarned ?? 0)],
            ["Completed", profile?.completedMissionIds.length ?? 0],
          ].map(([label, value]) => (
            <div key={label} className="arc-card rounded-2xl p-5">
              <div style={{ color: "#849495", fontFamily: "'Space Grotesk'", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
              <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 28, fontWeight: 900, marginTop: 8 }}>{value}</div>
            </div>
          ))}
        </div>

        <section className="arc-card rounded-3xl p-6 mb-6" style={{ border: "1px solid rgba(56,189,248,0.18)" }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div style={{ color: "#38bdf8", fontFamily: "'Space Grotesk'", fontSize: 11, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>XP Converter</div>
              <h2 style={{ color: "#f8fbff", fontFamily: "'Space Grotesk'", fontSize: 22, fontWeight: 900, marginTop: 6 }}>Convert XP to USDC</h2>
              <p style={{ color: "#9fb1c1", fontSize: 13, marginTop: 6 }}>
                {XP_TO_USDC_COST.toLocaleString()} available XP can be converted into {XP_TO_USDC_AMOUNT} USDC. Available XP: {availableXp.toLocaleString()}.
              </p>
              {claimErrors["xp-convert"] && (
                <p className="rounded-2xl px-4 py-3 mt-3" style={{ color: "#ffb7eb", background: "rgba(255,45,178,0.08)", border: "1px solid rgba(255,45,178,0.18)", fontSize: 12 }}>
                  {claimErrors["xp-convert"]}
                </p>
              )}
            </div>
            <button
              disabled={!isConnected || availableXp < XP_TO_USDC_COST || Boolean(claimingRewardId)}
              onClick={claimXpConversion}
              className="btn-primary px-6 py-3 rounded-full"
            >
              {claimingRewardId === "xp-convert" ? "Converting..." : `Claim ${XP_TO_USDC_AMOUNT} USDC`}
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {visibleRewards.map((reward) => {
            const claimed = Boolean(profile?.claimedRewardIds.includes(reward.id));
            const completedMissionIds = profile?.completedMissionIds ?? [];
            const missingMissionIds = reward.missionIds.filter((id) => !isMissionRequirementMet(id, completedMissionIds));
            const missingStepMissionIds = reward.missionIds.filter((id) => !isMissionStepRequirementMet(id, quests));
            const eligible = Boolean(isConnected && profile && missingMissionIds.length === 0 && missingStepMissionIds.length === 0);
            const isClaiming = claimingRewardId === reward.id;
            const claimError = claimErrors[reward.id];
            const rewardStatus = claimed
              ? "Reward already claimed by this wallet"
              : eligible
                ? "Ready to claim from verified missions"
                : !isConnected
                  ? "Connect wallet to claim"
                  : missingMissionIds.length
                    ? `Complete mission first: ${missingMissionIds.join(", ")}`
                    : missingStepMissionIds.length
                      ? `Verify mission steps first: ${missingStepMissionIds.join(", ")}`
                    : "Connect wallet to claim";
            const rewardButtonLabel = isClaiming
              ? "Paying..."
              : claimed
                ? "Claimed"
                : !isConnected
                  ? "Connect Wallet"
                  : missingMissionIds.length
                    ? "Complete Mission First"
                    : missingStepMissionIds.length
                      ? "Verify Steps First"
                    : "Claim Reward";
            return (
              <div key={reward.id} className="arc-card rounded-3xl p-6">
                <div style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff" }}>{reward.title}</div>
                <p style={{ color: "#849495", fontSize: 13, marginTop: 8 }}>{reward.requirement}</p>
                <p style={{ color: "#38bdf8", fontSize: 11, marginTop: 8, fontFamily: "'Space Grotesk'", fontWeight: 800 }}>
                  {reward.missionIds.length ? `Mission ID lock: ${reward.missionIds.join(", ")}` : "No mission lock configured"}
                </p>
                <p style={{ color: claimed ? "#94a3b8" : eligible ? "#22c55e" : "#ffb7eb", fontSize: 12, marginTop: 10 }}>
                  {rewardStatus}
                </p>
                {claimError && (
                  <p className="rounded-2xl px-4 py-3" style={{ color: "#ffb7eb", background: "rgba(255,45,178,0.08)", border: "1px solid rgba(255,45,178,0.18)", fontSize: 12, marginTop: 12 }}>
                    {claimError}
                  </p>
                )}
                <div style={{ color: "#ff2db2", fontFamily: "'Space Grotesk'", fontSize: 26, fontWeight: 900, marginTop: 18 }}>{formatRewardAmount(reward.amount, reward.token)}</div>
                <button
                  disabled={!eligible || claimed || Boolean(claimingRewardId)}
                  onClick={() => claimTokenReward(reward)}
                  className="btn-primary w-full mt-5 py-3 rounded-xl"
                >
                  {rewardButtonLabel}
                </button>
              </div>
            );
          })}
        </div>
        {claimMessage && (
          <div className="arc-card rounded-2xl p-4 mt-5" style={{ color: claimMessage.includes("paid") ? "#22c55e" : "#ffb7eb", fontSize: 13 }}>
            {claimMessage}
          </div>
        )}

        <div className="arc-card rounded-3xl p-6 mt-6">
          <h2 style={{ fontFamily: "'Space Grotesk'", fontSize: 18, fontWeight: 900, color: "#f8fbff", marginBottom: 16 }}>Reward Activity</h2>
          <ActivityTimeline activities={profile?.activities ?? []} />
        </div>
      </div>
      <CongratulationsModal
        open={Boolean(successReward)}
        title="Congratulations"
        amount={successReward?.amount}
        message="Your reward has been paid to your connected wallet after mission verification."
        txHash={successReward?.txHash}
        onClose={() => setSuccessReward(null)}
      />
    </div>
  );
}
